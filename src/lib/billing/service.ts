import { billingProviderRegistry } from "./provider-registry";
import { getSubscriptionByWorkspace, getInvoices, getUsageCounts } from "./queries";
import { getPlan, getCreatorPlans, computeUsage } from "./mapper";
import type { BillingPlan, BillingDashboard, CheckoutResult } from "./types";
import type { SubscriptionStatus } from "./constants";

export interface BillingService {
  getBillingInfo(workspaceId: string, tenantId: string): Promise<BillingDashboard>;
  getPlans(): BillingPlan[];
  createCheckout(workspaceId: string, planCode: string, email?: string): Promise<CheckoutResult>;
  cancelSubscription(subscriptionId: string): Promise<{ success: boolean }>;
}

export const billingService: BillingService = {
  async getBillingInfo(workspaceId: string, tenantId: string): Promise<BillingDashboard> {
    const [subscription, invoices, counts] = await Promise.all([
      getSubscriptionByWorkspace(workspaceId),
      getInvoices(workspaceId),
      getUsageCounts(tenantId),
    ]);

    const planCode = subscription?.planCode ?? "creator_launch";
    const plan = getPlan(planCode);
    const usage = computeUsage(counts, planCode);

    return {
      plan,
      subscription: subscription ?? {
        id: "",
        accountId: workspaceId,
        workspaceId,
        planCode: "creator_launch",
        status: "ACTIVE" as SubscriptionStatus,
        trialEndsAt: null,
        renewsAt: null,
        cancelledAt: null,
        createdAt: new Date().toISOString(),
      },
      invoices,
      paymentMethods: [],
      usage,
      activeProducts: counts.products,
      activeGallery: counts.gallery,
      storageUsed: 0,
      ordersProcessed: counts.orders,
      messagesSent: 0,
    };
  },

  getPlans(): BillingPlan[] {
    return getCreatorPlans();
  },

  async createCheckout(workspaceId: string, planCode: string, email?: string): Promise<CheckoutResult> {
    const provider = billingProviderRegistry.getActiveProvider();
    if (!provider) return { success: false, error: "No payment provider available" };
    return provider.createCheckout({
      planCode,
      accountId: workspaceId,
      email,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?success=1`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?canceled=1`,
    });
  },

  async cancelSubscription(subscriptionId: string): Promise<{ success: boolean }> {
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.billingSubscription.update({
        where: { id: subscriptionId },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  },
};
