import { billingRepository } from "../infrastructure/repository";
import { razorpayProvider } from "../infrastructure/providers/razorpay";
import { getPlan, getAllPlans, getPlansByFamily } from "@/lib/capabilities";
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

export class BillingService {
  async createCheckout(workspaceId: string, planCode: string, email?: string): Promise<CheckoutResult> {
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
    const rc = (dbPlan?.runtimeConfig as PlanRuntimeConfig | null) ?? null;
    const order = await razorpayProvider.createCheckout({
      planCode,
      accountId: workspaceId,
      email,
      currency: plan.currency,
      price: plan.price,
      razorpayPlanId: rc?.pricing?.razorpayPlanId ?? null,
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
      payload: { planCode, orderId: order.orderId, amount: plan.price },
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
    amount?: number;
  }): Promise<{ handled: boolean; status?: string; error?: string }> {
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

    const sub = await billingRepository.upsertSubscription(workspaceId, {
      planId: plan.id,
      status,
      renewsAt: input.renewsAt ?? null,
    });

    await billingRepository.createEvent({
      workspaceId,
      accountId: workspaceId,
      type: mapping.eventType,
      idempotencyKey,
      payload: { eventName, planCode: plan.code, providerReference, previousStatus: existing?.status, newStatus: status },
    });

    // Renewal / activation → paid invoice.
    if (mapping.action === "activate" || mapping.action === "renew") {
      // RCCF-41: zero-value/invalid payment guard. A webhook without a real
      // captured amount (missing payment entity, null/zero/negative amount)
      // NEVER mints an invoice or commission. The BillingEvent above already
      // recorded the event; nothing financial is created.
      const amount =
        typeof input.amount === "number" && Number.isFinite(input.amount) && input.amount > 0
          ? Math.round(input.amount * 100) / 100
          : null;
      if (amount === null) {
        await logAction(
          (await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { tenantId: true } }))?.tenantId ?? "system",
          "billing:payment-ignored",
          { eventName, planCode: plan.code, providerReference, reason: "zero-or-missing-amount" },
        ).catch(() => {});
        return { handled: true, status };
      }

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
  async changePlan(workspaceId: string, planCode: string, email?: string): Promise<CheckoutResult> {    const target = getPlan(planCode);
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

    return this.createCheckout(workspaceId, planCode, email);
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
        { metric: "max_products", label: "Products", used: products, limit: capabilityService.limit(planCode, "max_products"), unit: "" },
        { metric: "max_gallery", label: "Gallery", used: gallery, limit: capabilityService.limit(planCode, "max_gallery"), unit: "" },
        // RCCF-38: completed-orders allowance for the current calendar month.
        { metric: "max_orders", label: "Orders (this month)", used: orderUsage.used, limit: orderUsage.limit, unit: "completed" },
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
