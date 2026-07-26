import { billingRepository } from "../infrastructure/repository";
import { razorpayProvider } from "../infrastructure/providers/razorpay";
import { getPlan } from "@/lib/capabilities";
import { validateTransition } from "../domain/lifecycle";
import { capabilityService } from "@/lib/capabilities";
import { commissionService } from "@/lib/commission";
import { partnerService } from "@/lib/partners";
import { logAction } from "@/lib/audit";
import { platformEventBus } from "@/lib/events";
import { prisma } from "@/lib/prisma";
import type { CheckoutResult } from "../domain/types";

export class BillingService {
  async createCheckout(workspaceId: string, planCode: string, email?: string): Promise<CheckoutResult> {
    const plan = getPlan(planCode);
    if (!plan) return { success: false, error: `Unknown plan: ${planCode}` };

    const order = await razorpayProvider.createCheckout({
      planCode,
      accountId: workspaceId,
      email,
      currency: plan.currency,
    });

    if (!order.success) return order;

    await billingRepository.createEvent({
      workspaceId,
      accountId: workspaceId,
      type: "CHECKOUT_STARTED",
      idempotencyKey: `checkout_${order.orderId}`,
      payload: { planCode, orderId: order.orderId, amount: plan.price },
    });

    return order;
  }

  async handlePaymentCaptured(workspaceId: string, planCode: string, providerReference: string, idempotencyKey: string): Promise<void> {
    if (await billingRepository.isDuplicateEvent(idempotencyKey)) return;

    const plan = await billingRepository.findPlanByCode(planCode);
    if (!plan) throw new Error(`Unknown plan: ${planCode}`);

    const sub = await billingRepository.upsertSubscription(workspaceId, {
      planId: plan.id,
      status: "ACTIVE",
    });

    validateTransition(sub.status as never, "ACTIVE");

    await billingRepository.createEvent({
      workspaceId,
      accountId: workspaceId,
      type: "PAYMENT_SUCCEEDED",
      idempotencyKey,
      payload: { planCode, providerReference, previousStatus: sub.status, newStatus: "ACTIVE" },
    });

    const invoice = await billingRepository.createInvoice({
      workspaceId,
      accountId: workspaceId,
      planCode,
      amount: getPlan(planCode)?.price ?? 0,
      status: "PAID",
    });

    // ── Capability Activation ───────────────────────────────────────────
    capabilityService.can(planCode, "custom_domain");

    // ── Partner Commission ──────────────────────────────────────────────
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { agencyId: true, tenantId: true },
    });

    if (workspace?.agencyId) {
      const partnerRecord = await partnerService.get(workspace.agencyId);
      if (partnerRecord) {
        try {
          commissionService.processCommission({
            invoiceId: invoice.id,
            partnerId: workspace.agencyId,
            subscriptionId: sub.id,
            planCode,
            gross: getPlan(planCode)?.price ?? 0,
            currency: "INR",
          });
        } catch (err) {
          console.error("Commission processing failed:", err);
        }
      }
    }

    // ── Event ─────────────────────────────────────────────────────────────
    platformEventBus.publish("PaymentCaptured", {
      workspaceId,
      planCode,
      amount: getPlan(planCode)?.price ?? 0,
      currency: "INR",
      invoiceId: invoice.id,
      subscriptionId: sub.id,
    });

    platformEventBus.publish("SubscriptionActivated", {
      workspaceId,
      planCode,
      previousStatus: sub.status,
    });

    // ── Audit ───────────────────────────────────────────────────────────
    const tenantId = workspace?.tenantId;
    if (tenantId) {
      await logAction(tenantId, "payment:captured", {
        workspaceId,
        planCode,
        invoiceId: invoice.id,
        subscriptionId: sub.id,
        providerReference,
      }).catch((err) => { console.error(`[Billing] Failed to persist audit log for payment:captured:`, err); });
    }
  }

  async cancelSubscription(workspaceId: string, reason?: string): Promise<void> {
    const sub = await billingRepository.findSubscriptionByWorkspaceId(workspaceId);
    if (!sub) throw new Error("No active subscription");

    validateTransition(sub.status as never, "CANCELLED");

    await billingRepository.upsertSubscription(workspaceId, {
      planId: sub.planId,
      status: "CANCELLED",
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
  }

  async getSubscriptionStatus(workspaceId: string): Promise<{ planCode: string; status: string; active: boolean } | null> {
    const sub = await billingRepository.findSubscriptionByWorkspaceId(workspaceId);
    if (!sub) return null;
    const plan = await billingRepository.findPlanByCode("creator_free");
    return {
      planCode: plan?.code ?? "creator_free",
      status: sub.status,
      active: sub.status === "ACTIVE" || sub.status === "TRIALING",
    };
  }
}

export const billingService = new BillingService();
