import { prisma } from "@/lib/prisma";
import { billingService as billingSvc } from "@/lib/billing/service";
import type { BillingInvoice as LibBillingInvoice } from "@/lib/billing/types";
import type { BillingData } from "./types";

export const billingFeatureService = {
  async getData(tenantId: string): Promise<BillingData> {
    const workspace = await prisma.workspace.findUnique({ where: { tenantId } });
    if (!workspace) throw new Error("Workspace not found");

    const billingInfo = await billingSvc.getBillingInfo(workspace.id, tenantId);
    const plans = billingSvc.getPlans();
    const currentPlan = plans.find((p) => p.code === billingInfo.plan.code);

    return {
      plan: currentPlan ?? {
        code: "creator_launch",
        name: "Creator Launch",
        description: "Get your storefront online and start selling — free, no credit card needed.",
        price: 0,
        currency: "INR",
        features: {},
        recommended: false,
      },
      subscription: {
        id: billingInfo.subscription?.id ?? "",
        status: billingInfo.subscription?.status ?? "ACTIVE",
        planCode: billingInfo.plan.code,
        trialEndsAt: billingInfo.subscription?.trialEndsAt ? new Date(billingInfo.subscription.trialEndsAt) : null,
        renewsAt: billingInfo.subscription?.renewsAt ? new Date(billingInfo.subscription.renewsAt) : null,
        cancelledAt: billingInfo.subscription?.cancelledAt ? new Date(billingInfo.subscription.cancelledAt) : null,
      },
      invoices: Array.isArray(billingInfo.invoices) ? billingInfo.invoices.map((inv: LibBillingInvoice) => ({
        id: inv.id,
        amount: inv.amount,
        status: inv.status,
        issuedAt: new Date(inv.issuedAt),
        paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
        invoiceUrl: inv.invoiceUrl,
      })) : [],
      usage: [
        { metric: "Products", used: billingInfo.activeProducts ?? 0, limit: 999 },
        { metric: "Storage", used: Math.round((billingInfo.storageUsed ?? 0) / 1024 / 1024), limit: 500 },
      ],
    };
  },
};
