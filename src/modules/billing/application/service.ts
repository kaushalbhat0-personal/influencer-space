import { billingRepository } from "../infrastructure/repository";
import { razorpayProvider } from "../infrastructure/providers/razorpay";
import { getPlan, getAllPlans, getPlansByFamily } from "@/lib/capabilities";
import { isOneTimePlan, getCommercePlan } from "@/config/commerce/plans";
import { assertEligiblePlan } from "./plan-restriction";
import { countStorageUsage, resolveStorageCapability, BYTES_PER_MB } from "./storage.enforcement";
import { validateTransition } from "../domain/lifecycle";
import { mappingForRazorpayEvent, statusForWebhookEvent } from "../domain/webhook";
import { getRuntimePlan, type PlanRuntimeConfig } from "@/modules/pricing/application/runtime";
import { capabilityService } from "@/lib/capabilities";
import { logAction } from "@/lib/audit";
import { platformEventBus } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";
import { metricsService } from "@/lib/observability/metrics-service";
import type { CheckoutResult } from "../domain/types";
import type { BillingLineItem } from "@/lib/billing/types";

// RCCF-BILLING-UX-02B: capability UNLIMITED (-1) → billing presentation Infinity.
const toQuotaLimit = (value: number): number => (value === -1 ? Infinity : value);

// RCCF-BILLING-06B — P0 hardening: safely normalize paid amount from string|number paise/rupees via BigInt.
// Accepts number (rupees, e.g. 1999 or 1999.00) or string paise (e.g. "199900") or string rupees ("1999.00").
// Returns rupees as number with 2-decimal precision, or null on malformed/missing/zero/negative.
export function normalizePaidAmount(raw: unknown): number | null {
  try {
    if (raw == null || raw === "") return null;
    if (typeof raw === "number") {
      if (!Number.isFinite(raw) || raw <= 0) return null;
      // rupees number → paise via BigInt to avoid floating drift
      const paise = BigInt(Math.round(raw * 100));
      if (paise <= BigInt(0)) return null;
      return Number(paise) / 100;
    }
    if (typeof raw === "string") {
      if (/[\u0000-\u001f\u007f]/.test(raw)) return null;
      const s = raw.trim();
      if (!s) return null;
      // reject non-numeric (allow single dot)
      if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
      if (s.startsWith("-")) return null;
      if (s.includes(".")) {
        const [whole, fracRaw] = s.split(".");
        const frac = (fracRaw + "00").slice(0, 2);
        const paise = BigInt(whole || "0") * BigInt(100) + BigInt(frac);
        if (paise <= BigInt(0)) return null;
        return Number(paise) / 100;
      }
      // integer string → paise
      const paise = BigInt(s);
      if (paise <= BigInt(0)) return null;
      // Heuristic: paise values for our plans are >= 99900 (₹999). A bare "1999" as paise would be ₹19.99 (no plan), so keep as paise.
      return Number(paise) / 100;
    }
    return null;
  } catch {
    return null;
  }
}

export function paiseFromRupees(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

export class BillingService {
  async createCheckout(workspaceId: string, planCode: string, email?: string, cycle: "monthly" | "yearly" = "monthly"): Promise<CheckoutResult> {
    const start = Date.now();
    logger.info("createCheckout started", "billing", { operation: "create_checkout", metadata: { workspaceId, planCode } as Record<string, unknown> });
    // RCCF-IMPLEMENTATION-71: read the RUNTIME plan (BillingPlan) so Super Admin
    // price/currency changes apply at checkout without a redeploy. The static
    // registry remains the fallback if no DB row exists yet.
    const dbPlan = await billingRepository.findPlanByCode(planCode).catch(() => null);
    const plan = dbPlan ?? getPlan(planCode);
    if (!plan) {
      logger.info("createCheckout completed", "billing", { operation: "create_checkout", duration: Date.now() - start, metadata: { result: "error", error: `Unknown plan: ${planCode}` } as Record<string, unknown> });
      metricsService.recordDuration("billing_execution", Date.now() - start);
      return { success: false, error: `Unknown plan: ${planCode}` };
    }

    // RCCF-36: the DB plan is the commercial authority. Its price drives
    // one-time order amounts and its provisioned razorpayPlanId drives the
    // recurring subscription plan (falling back to the registry mapping).
    // RCCF-FINANCE-03: cycle-aware pricing — yearly checkout charges annualPrice / yearly canonical.
    const rc = (dbPlan?.runtimeConfig as PlanRuntimeConfig | null) ?? null;
    let checkoutPrice = plan.price;
    let checkoutPlanId = rc?.pricing?.razorpayPlanId ?? null;
    if (cycle === "yearly") {
      // Prefer canonical yearly from agency-commercial, fallback to commerce annualPrice
      try {
        const { partnerPriceForCycle } = await import("@/config/commerce/agency-commercial");
        const yearly = partnerPriceForCycle(planCode, "yearly");
        if (yearly !== null) checkoutPrice = yearly;
        else if (getCommercePlan(planCode)?.annualPrice) checkoutPrice = getCommercePlan(planCode)!.annualPrice as number;
      } catch {}
      // Yearly plan id if provisioned per cycle
      try {
        const { partnerRazorpayPlanIdForCycle } = await import("@/config/commerce/agency-commercial");
        const yPlanId = partnerRazorpayPlanIdForCycle(planCode, "yearly");
        if (yPlanId) checkoutPlanId = yPlanId;
        else if ((rc?.pricing as unknown as { razorpayYearlyPlanId?: string })?.razorpayYearlyPlanId) checkoutPlanId = (rc!.pricing as unknown as { razorpayYearlyPlanId: string }).razorpayYearlyPlanId;
      } catch {}
    }
    const order = await razorpayProvider.createCheckout({
      planCode,
      accountId: workspaceId,
      email,
      currency: plan.currency,
      price: checkoutPrice,
      razorpayPlanId: checkoutPlanId,
      cycle,
    });

    if (!order.success) {
      logger.info("createCheckout completed", "billing", { operation: "create_checkout", duration: Date.now() - start, metadata: { result: "error", error: "Checkout creation failed" } as Record<string, unknown> });
      metricsService.recordDuration("billing_execution", Date.now() - start);
      return order;
    }

    await billingRepository.createEvent({
      workspaceId,
      accountId: workspaceId,
      type: "CHECKOUT_STARTED",
      idempotencyKey: `checkout_${order.orderId}`,
      payload: { planCode, orderId: order.orderId, amount: checkoutPrice, cycle },
    });

    logger.info("createCheckout completed", "billing", { operation: "create_checkout", duration: Date.now() - start, metadata: { result: "success" } as Record<string, unknown> });
    metricsService.recordDuration("billing_execution", Date.now() - start);
    return order;
  }

  /**
   * IMPLEMENTATION-34 — handles the full Razorpay subscription lifecycle.
   * Every webhook becomes a BillingEvent → subscription status update →
   * capability (entitlement) refresh. Payments never unlock features directly;
   * only these events update the subscription, and CapabilityService derives
   * access from the updated plan.
   */
  async handleSubscriptionWebhook(input: {
    eventName: string;
    workspaceId: string;
    planCode?: string;
    providerReference: string;
    idempotencyKey: string;
    renewsAt?: Date | null;
    amount?: number | string;
    cycle?: "monthly" | "yearly";
  }): Promise<{ handled: boolean; status?: string | null; error?: string }> {
    const { eventName, workspaceId, planCode, providerReference, idempotencyKey } = input;
    const start = Date.now();

    if (await billingRepository.isDuplicateEvent(idempotencyKey)) {
      return { handled: false };
    }

    const mapping = mappingForRazorpayEvent(eventName);
    if (!mapping) {
      await this.recordWebhookEvent(input, "CHECKOUT_STARTED", "ignored");
      return { handled: false, error: `Unmapped event: ${eventName}` };
    }

    const existing = await billingRepository.findSubscriptionByWorkspaceId(workspaceId);
    const status = statusForWebhookEvent(eventName, (existing?.status as never) ?? null);
    if (!status) {
      // Illegal transition — record the event but do not mutate the subscription.
      await billingRepository.createEvent({
        workspaceId,
        accountId: workspaceId,
        type: mapping.eventType,
        idempotencyKey,
        payload: { eventName, planCode, providerReference, note: "status_unchanged" },
      });
      return { handled: false, error: `Illegal transition for ${eventName}` };
    }

    // Resolve the plan (canonical commerce code or legacy code fallback).
    // Ensure the BillingPlan row exists from the canonical catalog if missing.
    let plan = planCode ? await billingRepository.findPlanByCode(planCode) : null;
    if (!plan && planCode) {
      const { seedBillingCatalog } = await import("../infrastructure/catalog-seed");
      await seedBillingCatalog().catch(() => {});
      plan = await billingRepository.findPlanByCode(planCode);
    }
    if (!plan && existing?.planId) {
      plan = await prisma.billingPlan.findUnique({ where: { id: existing.planId } });
    }
    if (!plan) throw new Error(`Unknown plan for ${eventName}`);

    // RCCF-71.4.5 (F1) — a paid transition (activate/renew) must be backed by a
    // valid positive captured payment BEFORE the subscription becomes ACTIVE.
    // A zero/absent/invalid amount NEVER transitions to ACTIVE (no paid plan
    // resolution → no paid entitlement). The BillingEvent is still recorded so
    // a duplicate delivery stays idempotent; the subscription state is left
    // unchanged. Non-paid transitions (cancel/pause/past_due/resume) keep their
    // existing semantics and are unaffected by the payment guard.
    // RCCF-BILLING-06B — harden paid amount: accept string|number paise via BigInt, reject malformed,
    // and emit durable RECONCILIATION_REQUIRED so a later repair can reconcile the captured payment.
    const isPaidTransition = mapping.action === "activate" || mapping.action === "renew";
    const validPaidAmount: number | null = isPaidTransition ? normalizePaidAmount(input.amount) : null;

    if (isPaidTransition && validPaidAmount === null) {
      await billingRepository.createEvent({
        workspaceId,
        accountId: workspaceId,
        type: mapping.eventType,
        idempotencyKey,
        payload: { eventName, planCode: plan.code, providerReference, previousStatus: existing?.status, newStatus: existing?.status, note: "payment_guard:no_activation" },
      });
      // Durable reconciliation marker — provider captured funds but amount cannot be safely reconciled.
      await billingRepository
        .createEvent({
          workspaceId,
          accountId: workspaceId,
          type: "RECONCILIATION_REQUIRED",
          idempotencyKey: `reconcile_required_${providerReference}`,
          payload: { paymentId: providerReference, planCode: plan.code, eventName, reason: "payment_guard:no_activation", rawAmount: String(input.amount ?? "") },
        })
        .catch(() => {});
      await logAction(
        (await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } }))?.tenantId ?? "system",
        "billing:payment-ignored",
        { eventName, planCode: plan.code, providerReference, reason: "zero-or-missing-amount" },
      ).catch(() => {});
      return { handled: true, status: existing?.status ?? null };
    }

    // RCCF-FINANCE-03 — price integrity cycle-aware.
    // Monthly checkout must charge monthly, yearly must charge yearly.
    // Wrong-cycle provider amount is rejected/reconciled, not silently accepted.
    if (isPaidTransition) {
      const isOneTime = isOneTimePlan(plan.code);
      // RCCF-FINANCE-04 manual renewal: one_time now time-limited, cycle determines price.
      const cycleForValidation = (input.cycle as "monthly" | "yearly" | undefined) ?? null;
      const expectedAmounts: number[] = [];
      if (isOneTime) {
        if (cycleForValidation === "yearly") {
          let yearly: number | null = null;
          try {
            const { getCommercePlan: gcp } = require("@/config/commerce/plans") as { getCommercePlan: (c: string) => { annualPrice?: number | null } };
            yearly = gcp(plan.code)?.annualPrice ?? null;
            if (!yearly) {
              const { PARTNER_RECURRING_PRICES: pr } = require("@/config/commerce/agency-commercial") as { PARTNER_RECURRING_PRICES: Record<string, { yearly: number }> };
              yearly = pr[plan.code]?.yearly ?? null;
            }
          } catch {}
          if (yearly && yearly > 0) expectedAmounts.push(Math.round(yearly * 100) / 100);
          else {
            const amt = Math.round((plan.price ?? 0) * 100) / 100;
            if (amt > 0) expectedAmounts.push(amt);
          }
        } else if (cycleForValidation === "monthly") {
          const amt = Math.round((plan.price ?? 0) * 100) / 100;
          if (amt > 0) expectedAmounts.push(amt);
        } else {
          // Legacy without cycle — allow both monthly and yearly for backward compat
          const amt = Math.round((plan.price ?? 0) * 100) / 100;
          if (amt > 0) expectedAmounts.push(amt);
          try {
            const { getCommercePlan: gcp2 } = require("@/config/commerce/plans") as { getCommercePlan: (c: string) => { annualPrice?: number | null } };
            const yearly2 = gcp2(plan.code)?.annualPrice;
            if (yearly2 && yearly2 > 0) {
              const y = Math.round(yearly2 * 100) / 100;
              if (!expectedAmounts.includes(y)) expectedAmounts.push(y);
            }
          } catch {}
          try {
            const { PARTNER_RECURRING_PRICES: pr2 } = require("@/config/commerce/agency-commercial") as { PARTNER_RECURRING_PRICES: Record<string, { yearly: number }> };
            const y3 = pr2[plan.code]?.yearly;
            if (y3) {
              const y = Math.round(y3 * 100) / 100;
              if (!expectedAmounts.includes(y)) expectedAmounts.push(y);
            }
          } catch {}
        }
      } else {
        const cycle = (input.cycle as "monthly" | "yearly" | undefined) ?? null;
        const monthlyAmt = Math.round((plan.price ?? 0) * 100) / 100;
        const yearlyAmtFromCommerce = (() => {
          try {
            const { getCommercePlan } = require("@/config/commerce/plans") as { getCommercePlan: (c: string) => { annualPrice?: number | null } };
            const commerce = getCommercePlan(plan.code);
            if (commerce?.annualPrice && commerce.annualPrice > 0) return Math.round(commerce.annualPrice * 100) / 100;
          } catch {}
          return null;
        })();
        const yearlyAmtFromAgency = (() => {
          try {
            const { PARTNER_RECURRING_PRICES } = require("@/config/commerce/agency-commercial") as { PARTNER_RECURRING_PRICES: Record<string, { monthly: number; yearly: number }> };
            const partnerEntry = PARTNER_RECURRING_PRICES[plan.code];
            if (partnerEntry?.yearly) return Math.round(partnerEntry.yearly * 100) / 100;
          } catch {}
          return null;
        })();
        const yearlyAmt = yearlyAmtFromCommerce ?? yearlyAmtFromAgency;
        if (cycle === "monthly") {
          if (monthlyAmt > 0) expectedAmounts.push(monthlyAmt);
        } else if (cycle === "yearly") {
          if (yearlyAmt && yearlyAmt > 0) expectedAmounts.push(yearlyAmt);
          else if (monthlyAmt > 0) expectedAmounts.push(monthlyAmt);
        } else {
          // No cycle specified (legacy webhook without cycle) — allow both for backward compat, but prefer monthly
          if (monthlyAmt > 0) expectedAmounts.push(monthlyAmt);
          if (yearlyAmt && yearlyAmt > 0 && !expectedAmounts.includes(yearlyAmt)) expectedAmounts.push(yearlyAmt);
          try {
            const { PARTNER_RECURRING_PRICES: pr } = require("@/config/commerce/agency-commercial") as { PARTNER_RECURRING_PRICES: Record<string, { monthly: number; yearly: number }> };
            const pe = pr[plan.code];
            if (pe) {
              const pm = Math.round(pe.monthly * 100) / 100;
              const py = Math.round(pe.yearly * 100) / 100;
              if (pm > 0 && !expectedAmounts.includes(pm)) expectedAmounts.push(pm);
              if (py > 0 && !expectedAmounts.includes(py)) expectedAmounts.push(py);
            }
          } catch {}
        }
      }
      const capturedPaise = validPaidAmount !== null ? paiseFromRupees(validPaidAmount) : null;
      const expectedPaiseList = expectedAmounts.map((a) => paiseFromRupees(a));
      const matches = capturedPaise !== null && expectedPaiseList.some((ep) => {
        const diff = capturedPaise > ep ? capturedPaise - ep : ep - capturedPaise;
        return diff <= BigInt(1);
      });
      // Also enforce positive captured amount already via validPaidAmount null guard above, but double-check
      if (!matches) {
        const reason = isOneTime ? "one_time_amount_mismatch" : "recurring_price_drift";
        await billingRepository.createEvent({
          workspaceId,
          accountId: workspaceId,
          type: mapping.eventType,
          idempotencyKey,
          payload: { eventName, planCode: plan.code, providerReference, previousStatus: existing?.status, newStatus: existing?.status, note: `${reason}:no_activation`, capturedAmount: validPaidAmount, expectedAmounts },
        });
        await billingRepository
          .createEvent({
            workspaceId,
            accountId: workspaceId,
            type: "RECONCILIATION_REQUIRED",
            idempotencyKey: `reconcile_required_${providerReference}`,
            payload: { paymentId: providerReference, planCode: plan.code, eventName, reason, capturedAmount: validPaidAmount, expectedAmounts },
          })
          .catch(() => {});
        await logAction(
          (await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } }))?.tenantId ?? "system",
          "billing:payment-ignored",
          { eventName, planCode: plan.code, providerReference, reason, capturedAmount: validPaidAmount, expectedAmounts },
        ).catch(() => {});
        return { handled: true, status: existing?.status ?? null };
      }
    }

    // RCCF-FINANCE-04: manual one-time renewal — compute renewsAt from cycle when provider does not supply it (payment.captured)
    let effectiveRenewsAt: Date | null = input.renewsAt ?? null;
    const isPaidForRenew = mapping.action === "activate" || mapping.action === "renew";
    if (!effectiveRenewsAt && isPaidForRenew) {
      const c = (input.cycle as "monthly" | "yearly" | undefined) ?? null;
      if (c) {
        const now = new Date();
        if (c === "yearly") {
          const d = new Date(now);
          d.setFullYear(d.getFullYear() + 1);
          effectiveRenewsAt = d;
        } else {
          const d = new Date(now);
          d.setMonth(d.getMonth() + 1);
          effectiveRenewsAt = d;
        }
      } else if (isOneTimePlan(plan.code) && plan.code.startsWith("partner_")) {
        // Fallback: infer cycle from captured amount (yearly vs monthly) when cycle not explicitly passed (legacy webhook)
        const amt = validPaidAmount ?? 0;
        let inferredYearly: number | null = null;
        try {
          const { PARTNER_RECURRING_PRICES: pr } = require("@/config/commerce/agency-commercial") as { PARTNER_RECURRING_PRICES: Record<string, { yearly: number }> };
          inferredYearly = pr[plan.code]?.yearly ?? null;
        } catch {}
        if (inferredYearly && Math.abs(amt - inferredYearly) < 0.5) {
          const d = new Date();
          d.setFullYear(d.getFullYear() + 1);
          effectiveRenewsAt = d;
        } else if (amt > 0) {
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          effectiveRenewsAt = d;
        }
      }
    }
    const sub = await billingRepository.upsertSubscription(workspaceId, {
      planId: plan.id,
      status,
      renewsAt: effectiveRenewsAt,
    });

    await billingRepository.createEvent({
      workspaceId,
      accountId: workspaceId,
      type: mapping.eventType,
      idempotencyKey,
      payload: { eventName, planCode: plan.code, providerReference, previousStatus: existing?.status, newStatus: status },
    });

    // Renewal / activation → paid invoice.
    // RCCF-41: the zero-value guard above guarantees a paid transition reaching
    // this point carries a valid positive captured amount.
    if (isPaidTransition && validPaidAmount !== null) {
      const amount = validPaidAmount;

      // RCCF-37 (P1): a single charge can raise multiple events (subscription.charged
      // + payment.captured) that collapse to the same payment reference at the route
      // idempotency layer. Belt-and-suspenders: never mint a second paid invoice for
      // the same provider payment reference.
      const existingPaid = await prisma.billingInvoice.findFirst({
        where: { workspaceId, providerReference },
        select: { id: true },
      });
      if (!existingPaid) {
        // RCCF-41: invoice + commission + ledger commit in ONE transaction —
        // a mid-transaction failure rolls all three back (never an invoice
        // without a commission, never a commission without an invoice).
        let invoiceId: string | null = null;
        try {
          await prisma.$transaction(async (tx) => {
            const invoice = await billingRepository.createInvoice({
              workspaceId,
              accountId: workspaceId,
              planCode: plan.code,
              amount,
              status: "PAID",
              providerReference,
            }, tx);
            invoiceId = invoice.id;

            // ── Partner Commission (RCCF-IMPLEMENTATION-72) ─────────────────
            // Recurring subscription revenue share for the agency managing the
            // creator. Attribution runs through AgencyTenant (workspace → tenant
            // → agency); the commission runtime is idempotent per invoice.
            const { recordSubscriptionCommission } = await import("@/lib/commission/runtime");
            await recordSubscriptionCommission({
              workspaceId,
              planCode: plan.code,
              subscriptionId: sub.id,
              invoiceId: invoice.id,
              amount,
              event: mapping.action === "renew" ? "renewed" : "created",
            }, tx);
          });
        } catch (err) {
          // RCCF-50 — the financial transaction rolled back (no invoice, no
          // commission; never partially committed). The provider has captured
          // the payment, so we record a DURABLE reconciliation-required event
          // (unique key) that a reconciliation pass can repair idempotently —
          // without fabricating financial data.
          captureError(err, { service: "billing", operation: "subscriptionWebhook-invoice-commission" });
          await billingRepository.createEvent({
            workspaceId,
            accountId: workspaceId,
            type: "RECONCILIATION_REQUIRED",
            idempotencyKey: `reconcile_required_${providerReference}`,
            payload: { paymentId: providerReference, planCode: plan.code, amount, eventName },
          }).catch((reconErr) => captureError(reconErr, { service: "billing", operation: "reconciliation-required-record" }));
          return { handled: true, status };
        }

        if (invoiceId) {
          platformEventBus.publish("PaymentCaptured", {
            workspaceId,
            planCode: plan.code,
            amount,
            currency: "INR",
            invoiceId,
            subscriptionId: sub.id,
          });
        }
      }
    }

    // RCCF-IMPLEMENTATION-72: emit canonical subscription lifecycle events.
    if (mapping.action === "cancel") {
      const { runtimeEventBus } = await import("@/modules/event-runtime");
      const wsTenant = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } });
      await runtimeEventBus.publish({
        type: "subscription.cancelled",
        tenantId: wsTenant?.tenantId ?? "system",
        entityId: sub.id,
        payload: { workspaceId, planCode: plan.code, providerReference },
        occurredAt: new Date().toISOString(),
      }).catch(() => {});
    }

    const tenant = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } });
    if (tenant?.tenantId) {
      await logAction(tenant.tenantId, "billing:subscription-webhook", {
        eventName,
        workspaceId,
        planCode: plan.code,
        status,
        providerReference,
      }).catch((err) => captureError(err, { service: "billing", operation: "subscriptionWebhook-audit" }));
    }

    logger.info("handleSubscriptionWebhook completed", "billing", { operation: "handle_subscription_webhook", duration: Date.now() - start, metadata: { eventName, status } as Record<string, unknown> });
    metricsService.recordDuration("billing_execution", Date.now() - start);
    return { handled: true, status };
  }

  private async recordWebhookEvent(input: {
    eventName: string;
    workspaceId: string;
    providerReference: string;
    idempotencyKey: string;
  }, type: string, note: string): Promise<void> {
    await billingRepository.createEvent({
      workspaceId: input.workspaceId,
      accountId: input.workspaceId,
      type,
      idempotencyKey: input.idempotencyKey,
      payload: { eventName: input.eventName, providerReference: input.providerReference, note },
    });
  }

  /**
   * RCCF-41 — reverse the partner commission for a refunded payment.
   *
   * Append-only financial model: the original CommissionEntry is never deleted
   * or amount-mutated. A new `refund_reversal` CommissionEntry (negative
   * partner share, `parentEntryId` → original) + a `COMMISSION_REVERSED`
   * PartnerLedger entry are written in ONE transaction with the idempotency
   * BillingEvent (`razorpay_refund_<refundId>`, unique) so a duplicate refund
   * delivery collides on the unique key and rolls back — exactly one reversal.
   *
   * Attribution is derived server-side from the invoice (payment → invoice →
   * original commission → its partnerId) — never from the webhook payload.
   *
   * Full refund → net commission 0. Partial refund → proportional reversal is
   * recorded; the original entry is marked settlement-ineligible (no overpay);
   * paying the UNREFUNDED remainder at settlement is a deferred product
   * decision (reported).
   */
  async handleRefund(input: { refundId: string; paymentId: string; refundAmountPaise: number }): Promise<{ handled: boolean; error?: string }> {
    const idempotencyKey = `razorpay_refund_${input.refundId}`;
    if (await billingRepository.isDuplicateEvent(idempotencyKey)) return { handled: false };

    const refundAmount = Math.round((input.refundAmountPaise / 100) * 100) / 100;
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return { handled: false, error: "Invalid refund amount" };
    }

    // Resolve original payment → invoice (server-side; never from the payload).
    const invoice = await prisma.billingInvoice.findFirst({ where: { providerReference: input.paymentId } });
    if (!invoice) {
      // No invoice for this payment — nothing to reverse. Safe no-op.
      return { handled: true };
    }

    // RCCF-FINANCE-02 P1-13: enforce refundWindowDays=30 (RevenueConfiguration).
    // Refunds beyond the window are still reconciled but flagged for manual review.
    try {
      const revCfg = await prisma.revenueConfiguration.findFirst({ where: { status: "ACTIVE" }, select: { refundWindowDays: true } });
      const windowDays = revCfg?.refundWindowDays ?? 30;
      const paidAt = invoice.paidAt ?? invoice.issuedAt;
      if (paidAt) {
        const daysSince = (Date.now() - new Date(paidAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > windowDays) {
          await prisma.billingEvent
            .create({
              data: {
                workspaceId: invoice.workspaceId,
                accountId: invoice.accountId,
                type: "REFUND_WINDOW_EXCEEDED",
                idempotencyKey: `refund_window_${input.refundId}`,
                payload: { refundId: input.refundId, paymentId: input.paymentId, invoiceId: invoice.id, daysSince: Math.floor(daysSince), windowDays } as never,
              },
            })
            .catch(() => {});
          captureError(new Error(`Refund beyond window: ${Math.floor(daysSince)}d > ${windowDays}d`), { service: "billing", operation: "refundWindow" });
        }
      }
    } catch {}

    // The original positive subscription commission for this invoice.
    const commission = await prisma.commissionEntry.findFirst({
      where: { invoiceId: invoice.id, entryType: { startsWith: "subscription_" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, partnerId: true, partnerShare: true, subscriptionId: true, planCode: true, amount: true, status: true, clearedAt: true },
    });
    if (!commission) {
      // No partner commission for this invoice — safe no-op (never fabricate a
      // negative commission). The refund is recorded as handled.
      return { handled: true };
    }

    const grossAmount = typeof invoice.amount === "number" && invoice.amount > 0 ? invoice.amount : commission.amount;
    const fraction = grossAmount > 0 ? Math.min(1, Math.max(0, refundAmount / grossAmount)) : 1;
    let reversalAmount = Math.round(commission.partnerShare * fraction * 100) / 100;

    // RCCF-43 overflow protection: cumulative reversals for this commission can
    // never exceed the original partner share, even if the provider emits
    // overlapping/duplicate refund events.
    const existingReversals = await prisma.commissionEntry.aggregate({
      where: { parentEntryId: commission.id },
      _sum: { partnerShare: true },
    });
    const alreadyReversed = Math.abs(existingReversals._sum.partnerShare ?? 0);
    const maxReversal = Math.max(0, Math.round((commission.partnerShare - alreadyReversed) * 100) / 100);
    if (reversalAmount > maxReversal) reversalAmount = maxReversal;
    if (reversalAmount <= 0) {
      // Already fully reversed — safe no-op (never create a negative reversal).
      return { handled: true };
    }
    const isFullRefund = fraction >= 1;
    // RCCF-50 — was this commission already SETTLED (paid) at refund time?
    // Evaluated before any mutation so the fact is read from the persisted row.
    const wasSettled = commission.status === "cleared" && !!commission.clearedAt;

    try {
      await prisma.$transaction(async (tx) => {
        const reversal = await tx.commissionEntry.create({
          data: {
            invoiceId: invoice.id,
            partnerId: commission.partnerId,
            subscriptionId: commission.subscriptionId,
            planCode: commission.planCode,
            amount: -Math.round(refundAmount * 100) / 100,
            platformShare: -Math.round((refundAmount - reversalAmount) * 100) / 100,
            partnerShare: -reversalAmount,
            platformPercent: 0,
            partnerPercent: 0,
            entryType: "refund_reversal",
            status: "reversed",
            parentEntryId: commission.id,
            reversedAt: new Date(),
            description: `Commission reversal for refund ${input.refundId} (payment ${input.paymentId})`,
            audit: { refundId: input.refundId, paymentId: input.paymentId, refundAmount, fraction },
          },
        });

        // Settlement safety: a FULL refund makes the original ineligible; a
        // PARTIAL refund keeps it pending so the unrefunded remainder stays
        // settleable (settlement nets against reversal children).
        if (isFullRefund) {
          await tx.commissionEntry.update({
            where: { id: commission.id },
            data: { status: "reversed", reversedAt: new Date() },
          });
        }

        // Append-only ledger reversal.
        const last = await tx.partnerLedger.findFirst({
          where: { partnerId: commission.partnerId },
          orderBy: { createdAt: "desc" },
          select: { balanceAfter: true },
        });
        const balanceBefore = last?.balanceAfter ?? 0;
        await tx.partnerLedger.create({
          data: {
            partnerId: commission.partnerId,
            type: "COMMISSION_REVERSED",
            amount: -reversalAmount,
            reference: reversal.id,
            referenceType: "commission_entry",
            description: `Commission reversal for refund ${input.refundId} (payment ${input.paymentId})`,
            commissionId: reversal.id,
            balanceBefore,
            balanceAfter: Math.round((balanceBefore - reversalAmount) * 100) / 100,
          },
        });

        // RCCF-50 — clawback: if the reversed commission was ALREADY SETTLED
        // (paid), the reversal creates a recoverable obligation. Recorded as an
        // explicit append-only CLAWBACK_DUE ledger entry so it offsets future
        // settlement eligibility and is surfaced in the analytics summary.
        // Historical SettlementItem/paid records are never mutated.
        if (wasSettled && reversalAmount > 0) {
          await tx.partnerLedger.create({
            data: {
              partnerId: commission.partnerId,
              type: "CLAWBACK_DUE",
              amount: -reversalAmount,
              reference: reversal.id,
              referenceType: "commission_entry",
              description: `Clawback due — refund ${input.refundId} of already-settled commission (payment ${input.paymentId})`,
              commissionId: reversal.id,
              balanceBefore,
              balanceAfter: Math.round((balanceBefore - reversalAmount) * 100) / 100,
            },
          });
        }

        // Idempotency record in the same transaction (unique key → a duplicate
        // refund delivery P2002-collides here and the whole reversal rolls back).
        await billingRepository.createEvent({
          workspaceId: invoice.workspaceId ?? "",
          accountId: invoice.accountId,
          type: "REFUND_PROCESSED",
          idempotencyKey,
          payload: { refundId: input.refundId, paymentId: input.paymentId, amount: refundAmount, commissionId: commission.id, reversalAmount },
        }, tx);
      });
    } catch (err) {
      captureError(err, { service: "billing", operation: "refund-processed" });
      throw err;
    }

    await logAction(
      (await prisma.workspace.findUnique({ where: { id: invoice.workspaceId ?? "" }, select: { tenantId: true } }))?.tenantId ?? "system",
      "billing:refund-processed",
      { refundId: input.refundId, paymentId: input.paymentId, amount: refundAmount, commissionId: commission.id, reversalAmount },
    ).catch(() => {});
    return { handled: true };
  }

  /**
   * RCCF-50 — idempotent failed-webhook reconciliation. When a provider payment
   * was captured but the internal invoice+commission transaction failed, a
   * durable RECONCILIATION_REQUIRED BillingEvent exists for the payment. This
   * repairs ONLY the missing internal state (invoice + commission in one
   * transaction, amount-verified against the recorded event) and never
   * fabricates financial data. Repeated reconciliation is idempotent.
   */
  async reconcileFailedPayment(paymentId: string): Promise<{ handled: boolean; repaired?: boolean; error?: string }> {
    const required = await prisma.billingEvent.findUnique({
      where: { idempotencyKey: `reconcile_required_${paymentId}` },
    });
    if (!required) return { handled: false, error: "No reconciliation required for this payment" };

    // Already repaired (invoice exists for the payment) → idempotent no-op.
    const existingInvoice = await prisma.billingInvoice.findFirst({ where: { providerReference: paymentId }, select: { id: true } });
    if (existingInvoice) {
      await billingRepository.createEvent({
        workspaceId: required.workspaceId ?? "",
        accountId: required.accountId,
        type: "RECONCILIATION_RESOLVED",
        idempotencyKey: `reconcile_resolved_${paymentId}`,
        payload: { paymentId, alreadyPresent: true },
      }).catch(() => {});
      return { handled: true, repaired: false };
    }

    const payload = (required.payload as Record<string, unknown> | null) ?? {};
    const planCode = String(payload.planCode ?? "");
    const amount = Number(payload.amount ?? 0);
    const workspaceId = required.workspaceId;
    if (!workspaceId || !planCode || !Number.isFinite(amount) || amount <= 0) {
      return { handled: false, error: "Reconciliation exception: cannot safely reconstruct this payment" };
    }

    const sub = await billingRepository.findSubscriptionByWorkspaceId(workspaceId);
    if (!sub) return { handled: false, error: "Reconciliation exception: subscription not found" };

    try {
      await prisma.$transaction(async (tx) => {
        const invoice = await billingRepository.createInvoice({
          workspaceId,
          accountId: workspaceId,
          planCode,
          amount,
          status: "PAID",
          providerReference: paymentId,
        }, tx);

        const { recordSubscriptionCommission } = await import("@/lib/commission/runtime");
        await recordSubscriptionCommission({
          workspaceId,
          planCode,
          subscriptionId: sub.id,
          invoiceId: invoice.id,
          amount,
          event: String(payload.eventName ?? "").includes("charged") ? "renewed" : "created",
        }, tx);

        await billingRepository.createEvent({
          workspaceId,
          accountId: workspaceId,
          type: "RECONCILIATION_RESOLVED",
          idempotencyKey: `reconcile_resolved_${paymentId}`,
          payload: { paymentId, planCode, amount },
        }, tx);
      });
    } catch (err) {
      captureError(err, { service: "billing", operation: "reconcile-failed-payment" });
      throw err;
    }

    await logAction(
      (await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } }))?.tenantId ?? "system",
      "billing:reconciled-payment",
      { paymentId, planCode, amount },
    ).catch(() => {});
    return { handled: true, repaired: true };
  }

  async cancelSubscription(workspaceId: string, reason?: string): Promise<void> {
    const start = Date.now();
    logger.info("cancelSubscription started", "billing", { operation: "cancel_subscription", metadata: { workspaceId } as Record<string, unknown> });
    const sub = await billingRepository.findSubscriptionByWorkspaceId(workspaceId);
    if (!sub) {
      captureError(new Error("No active subscription"), { service: "billing", operation: "cancel_subscription" });
      throw new Error("No active subscription");
    }

    validateTransition(sub.status as never, "CANCELLED");

    await billingRepository.upsertSubscription(workspaceId, {
      planId: sub.planId,
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason ?? null,
    });

    await billingRepository.createEvent({
      workspaceId,
      accountId: workspaceId,
      type: "SUBSCRIPTION_CANCELLED",
      payload: { previousStatus: sub.status, newStatus: "CANCELLED", reason },
    });

    platformEventBus.publish("SubscriptionCancelled", {
      workspaceId,
      planCode: sub.planId,
      reason,
    });

    logger.info("cancelSubscription completed", "billing", { operation: "cancel_subscription", duration: Date.now() - start, metadata: { result: "success" } as Record<string, unknown> });
    metricsService.recordDuration("billing_execution", Date.now() - start);
  }

  /**
   * IMPLEMENTATION-35 — resume a CANCELLED/PAST_DUE subscription. Produces a
   * BillingEvent and updates state via the lifecycle (events stay authoritative).
   */
  async resumeSubscription(workspaceId: string): Promise<void> {
    const sub = await billingRepository.findSubscriptionByWorkspaceId(workspaceId);
    if (!sub) throw new Error("No subscription");
    validateTransition(sub.status as never, "ACTIVE");

    await billingRepository.upsertSubscription(workspaceId, {
      planId: sub.planId,
      status: "ACTIVE",
      cancelledAt: null,
      cancellationReason: null,
    });

    await billingRepository.createEvent({
      workspaceId,
      accountId: workspaceId,
      type: "SUBSCRIPTION_RESUMED",
      idempotencyKey: `resume_${workspaceId}_${Date.now()}`,
      payload: { previousStatus: sub.status, newStatus: "ACTIVE" },
    });

    platformEventBus.publish("SubscriptionActivated", { workspaceId, planCode: sub.planId, previousStatus: sub.status });
  }

  /**
   * IMPLEMENTATION-35 — change plan (upgrade/downgrade). Validates the transition
   * then creates a NEW Razorpay subscription checkout. Activation is webhook-
   * driven (BillingEvent → BillingSubscription → capability refresh), so the old
   * plan's capabilities remain until the new subscription activates.
   */
  async changePlan(workspaceId: string, planCode: string, email?: string, cycle: "monthly" | "yearly" = "monthly"): Promise<CheckoutResult> {    const target = getPlan(planCode);
    if (!target) return { success: false, error: `Unknown plan: ${planCode}` };

    // IMPLEMENTATION-42 Phase 5: agency-managed creators cannot be on Launch.
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } });
    const eligible = await assertEligiblePlan({ tenantId: workspace?.tenantId, workspaceId, planCode });
    if (!eligible.ok) return { success: false, error: eligible.error };

    const current = await billingRepository.findSubscriptionWithPlan(workspaceId);
    if (current?.plan?.code && current.plan.code !== planCode) {
      const currentPlan = getPlan(current.plan.code);
      const canChange =
        current.status === "ACTIVE" || current.status === "TRIALING" || current.status === "PAST_DUE";
      if (!canChange && current.status !== "CANCELLED") {
        return { success: false, error: `Cannot change plan from status ${current.status}` };
      }
    }

    // RCCF-FINANCE-04: manual one-time renewal — same partner plan re-purchase extends entitlement (monthly/yearly cycle).
    // Keep one-time guard for non-partner one-time plans, but allow partner manual renewal.
    if (current?.plan?.code === planCode && current.status === "ACTIVE" && isOneTimePlan(planCode) && !planCode.startsWith("partner_")) {
      return { success: false, error: "This plan is already active — a one-time purchase does not renew." };
    }
    if (current?.plan?.code === planCode && !planCode.startsWith("partner_")) {
      return { success: false, error: `Already on ${target.name} — no change needed.` };
    }

    // RCCF-BILLING-06E — Creator Launch is a 15-day trial, NOT a downgrade target.
    // Paid creators (Grow/Scale) must never downgrade to Launch via self-serve.
    // The 06C free-downgrade path (ACTIVE trialEndsAt:null) is removed — Launch
    // trial is only created at registration (TRIALING +15d). Return actionable error.
    if (planCode === "creator_launch" && current?.plan?.code && current.plan.code !== "creator_launch") {
      return {
        success: false,
        error: "Creator Launch is a 15-day trial and cannot be selected as a downgrade. Please choose Grow or Scale, or contact support if you need to cancel.",
      };
    }
    // No other ₹0 Razorpay order — Launch downgrade is rejected above, other
    // free/enterprise manual plans remain admin-only via adminSetPlan.

    return this.createCheckout(workspaceId, planCode, email, cycle);
  }

  /**
   * IMPLEMENTATION-39 — Super Admin manual plan override. Sets the Billing v2
   * subscription directly (the legacy Subscription table is no longer written).
   * Always produces a BillingEvent + audit so the timeline stays authoritative.
   */
  async adminSetPlan(workspaceId: string, planCode: string, status: "ACTIVE" | "CANCELLED" | "PAST_DUE" | "TRIALING", reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // IMPLEMENTATION-42 Phase 5: agency-managed creators cannot be on Launch.
      const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } });
      const eligible = await assertEligiblePlan({ tenantId: ws?.tenantId, workspaceId, planCode });
      if (!eligible.ok) return { success: false, error: eligible.error };

      const plan = await billingRepository.findPlanByCode(planCode);
      if (!plan) {
        const { seedBillingCatalog } = await import("../infrastructure/catalog-seed");
        await seedBillingCatalog().catch(() => {});
        const reseeded = await billingRepository.findPlanByCode(planCode);
        if (!reseeded) return { success: false, error: `Unknown plan: ${planCode}` };
      }
      const existing = await billingRepository.findSubscriptionByWorkspaceId(workspaceId);
      const sub = await billingRepository.upsertSubscription(workspaceId, {
        planId: (await billingRepository.findPlanByCode(planCode))!.id,
        status,
        cancelledAt: status === "CANCELLED" ? new Date() : null,
        cancellationReason: status === "CANCELLED" ? reason ?? null : null,
      });
      await billingRepository.createEvent({
        workspaceId,
        accountId: workspaceId,
        type: status === "CANCELLED" ? "SUBSCRIPTION_CANCELLED" : "SUBSCRIPTION_ACTIVATED",
        idempotencyKey: `admin_${workspaceId}_${planCode}_${Date.now()}`,
        payload: { planCode, previousStatus: existing?.status, newStatus: status, reason: reason ?? "super-admin" },
      });
      const tenant = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } });
      if (tenant?.tenantId) {
        await logAction(tenant.tenantId, "billing:admin-set-plan", { workspaceId, planCode, status, reason }).catch(() => {});
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to set plan" };
    }
  }

  async getSubscriptionStatus(workspaceId: string): Promise<{ planCode: string; status: string; active: boolean } | null> {
    const sub = await billingRepository.findSubscriptionWithPlan(workspaceId);
    if (!sub) return null;
    // RCCF-33: a TRIALING subscription is only "active" while the trial is
    // active — a stale TRIALING (trialEndsAt passed) must not be reported active.
    const trialActive = sub.status === "TRIALING" && (!sub.trialEndsAt || sub.trialEndsAt.getTime() > Date.now());
    return {
      planCode: sub.plan?.code ?? "creator_launch",
      status: sub.status,
      active: sub.status === "ACTIVE" || trialActive,
    };
  }

  async getBillingInfo(workspaceId: string, tenantId: string) {
    const subscription = await billingRepository.findSubscriptionWithPlan(workspaceId);
    const invoices = await prisma.billingInvoice.findMany({
      where: { workspaceId },
      orderBy: { issuedAt: "desc" },
      take: 50,
    });

    // IMPLEMENTATION-34: read-only billing history (events + payment history).
    const events = await prisma.billingEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    const planCode = subscription?.plan?.code ?? "creator_launch";
    const plan = getPlan(planCode);
    // RCCF-36: the billing page must show the current configured price, not a
    // stale static registry value. The runtime plan is the DB-authoritative
    // surface (registry fallback when absent).
    const runtimePlan = await getRuntimePlan(planCode).catch(() => null);
    const effectivePlan = plan
      ? { ...plan, price: runtimePlan?.price !== undefined ? runtimePlan.price : plan.price }
      : plan;

    const products = await prisma.product.count({ where: { tenantId } });
    const gallery = await prisma.galleryImage.count({ where: { tenantId } });
    const orders = await prisma.productOrder.count({ where: { tenantId } });
    // RCCF-11/RCCF-59: surface real storage usage. Creators display MB (the
    // canonical storage_mb capability); the limit resolves via the same path.
    const storageUsedBytes = await countStorageUsage(tenantId);
    const storageCapability = resolveStorageCapability(planCode);
    const storageUsedMb = Math.round((storageUsedBytes / BYTES_PER_MB) * 10) / 10;
    const storageLimitMb = typeof storageCapability.limitBytes === "number" && Number.isFinite(storageCapability.limitBytes) ? Math.round(storageCapability.limitBytes / BYTES_PER_MB) : null;
    // RCCF-38: order usage reads from PlanUsage (completed orders this month),
    // never from a client-side count.
    const { getCurrentOrderUsage } = await import("./order-completion");
    const orderUsage = await getCurrentOrderUsage(tenantId).catch(() => ({ used: 0, limit: capabilityService.limit(planCode, "max_orders") }));

    // RCCF-33: server-derived trial-active flag so the UI never shows a stale
    // "Trialing" state (a TRIALING subscription whose trialEndsAt has passed).
    const isTrialActive =
      subscription?.status === "TRIALING" &&
      !!subscription.trialEndsAt &&
      subscription.trialEndsAt.getTime() > Date.now();

    return {
      planCode,
      plan: effectivePlan ?? { code: "creator_launch", family: "creator" as const, name: "Creator Launch", description: "", price: 0, currency: "INR", features: {}, recommended: false, badge: "" },
      subscription: { ...(subscription ?? { id: "", accountId: workspaceId, workspaceId, planCode: "creator_launch", status: "ACTIVE" as const, trialEndsAt: null, renewsAt: null, cancelledAt: null, createdAt: new Date().toISOString() }), isTrialActive },
      invoices: invoices.map((inv) => ({
        id: inv.id,
        planCode: inv.planCode,
        planName: getPlan(inv.planCode)?.name ?? inv.planCode,
        amount: inv.amount,
        taxAmount: inv.taxAmount ?? 0,
        total: (inv.amount ?? 0) + (inv.taxAmount ?? 0),
        currency: inv.currency ?? "INR",
        status: inv.status as never,
        issuedAt: inv.issuedAt.toISOString(),
        paidAt: inv.paidAt?.toISOString() ?? null,
        dueAt: inv.dueAt?.toISOString() ?? null,
        invoiceUrl: inv.invoiceUrl ?? null,
        provider: inv.provider ?? null,
        providerReference: inv.providerReference ?? null,
        lineItems: (inv.lineItems as unknown as BillingLineItem[]) ?? [],
      })),
      paymentMethods: [],
      usage: [
        // VALIDATION-04: limits must derive from the canonical capability
        // registry — they were hardcoded (5 / 10) and lied on paid plans.
        // RCCF-BILLING-UX-02B: normalize capability sentinel -1 (UNLIMITED) to Infinity for billing presentation.
        // storage already does this; products/gallery/orders must as well.
        { metric: "max_products", label: "Products", used: products, limit: toQuotaLimit(capabilityService.limit(planCode, "max_products")), unit: "" },
        { metric: "max_gallery", label: "Gallery", used: gallery, limit: toQuotaLimit(capabilityService.limit(planCode, "max_gallery")), unit: "" },
        // RCCF-38: completed-orders allowance for the current calendar month.
        { metric: "max_orders", label: "Orders (this month)", used: orderUsage.used, limit: toQuotaLimit(orderUsage.limit), unit: "completed" },
        // RCCF-59: canonical storage usage + limit in MB.
        { metric: "storage", label: "Storage", used: storageUsedMb, limit: storageLimitMb ?? Infinity, unit: "MB" },
      ],
      activeProducts: products,
      activeGallery: gallery,
      storageUsed: storageUsedMb,
      ordersProcessed: orders,
      messagesSent: 0,
      history: {
        renewalDate: subscription?.renewsAt?.toISOString() ?? null,
        status: subscription?.status ?? null,
        cancelledAt: subscription?.cancelledAt?.toISOString() ?? null,
        cancellationReason: subscription?.cancellationReason ?? null,
        events: events.map((e) => ({
          type: e.type,
          createdAt: e.createdAt.toISOString(),
          payload: (e.payload as Record<string, unknown>) ?? {},
        })),
        paymentHistory: invoices.map((inv) => ({
          id: inv.id,
          amount: inv.amount,
          status: inv.status,
          issuedAt: inv.issuedAt.toISOString(),
          paidAt: inv.paidAt?.toISOString() ?? null,
        })),
      },
    };
  }

  getPlans() {
    return getPlansByFamily("creator");
  }
}

export const billingService = new BillingService();
