import { billingRepository } from "./repository";
import { razorpayProvider } from "./providers/razorpay";
import { PLANS } from "./plan-catalog";
import { validateTransition } from "./lifecycle";
import type { CheckoutResult } from "./types";

export class BillingService {
  async createCheckout(workspaceId: string, planCode: string, email?: string): Promise<CheckoutResult> {
    const plan = PLANS.find((p) => p.code === planCode);
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

    await billingRepository.createInvoice({
      workspaceId,
      accountId: workspaceId,
      planCode,
      amount: PLANS.find((p) => p.code === planCode)?.price ?? 0,
      status: "PAID",
    });
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
