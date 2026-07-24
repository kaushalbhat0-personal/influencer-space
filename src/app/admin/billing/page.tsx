import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { entitlement } from "@/modules/billing/application/entitlements";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { BillingClient } from "./_components/billing-client";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No tenant configured.</p>
      </div>
    );
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">No tenant configured.</p>
      </div>
    );
  }

  let legacyPlan = "STARTER";
  let planStatus = "ACTIVE";
  let periodEnd: string | null = null;
  let subscriptionId = "";
  let v2PlanCode = "creator_free";

  const workspace = await workspaceRepository.findByTenantId(tenant.id);
  if (workspace) {
    const billingSub = await prisma.billingSubscription.findUnique({ where: { workspaceId: workspace.id } });
    if (billingSub) {
      const plan = await prisma.billingPlan.findUnique({ where: { id: billingSub.planId } });
      v2PlanCode = plan?.code ?? "creator_free";
      planStatus = billingSub.status;
      periodEnd = billingSub.renewsAt?.toISOString() ?? null;
      subscriptionId = billingSub.id;
    }
  }

  if (!workspace || subscriptionId === "") {
    const legacySub = await prisma.subscription.findUnique({ where: { tenantId: tenant.id } });
    if (legacySub) {
      v2PlanCode = legacySub.plan === "STARTER" ? "creator_free" : "creator_pro";
      legacyPlan = legacySub.plan;
      planStatus = legacySub.status;
      periodEnd = legacySub.currentPeriodEnd?.toISOString() ?? null;
    }
  }

  const planDisplayName = legacyPlan === "PRO" ? "PRO" : (v2PlanCode === "creator_pro" ? "PRO" : "STARTER");

  const productCount = await prisma.product.count({ where: { tenantId: tenant.id } });

  return (
    <BillingClient
      subscription={{
        id: subscriptionId,
        tenantId: tenant.id,
        razorpaySubscriptionId: null,
        status: planStatus,
        plan: planDisplayName,
        currentPeriodEnd: periodEnd,
      }}
      productCount={productCount}
      planInfo={{
        plan: planDisplayName,
        status: planStatus,
        limits: {
          maxProducts: entitlement.limit(v2PlanCode, "max_products"),
          customDomain: entitlement.has(v2PlanCode, "custom_domain"),
          customBranding: entitlement.has(v2PlanCode, "custom_branding"),
        },
      }}
    />
  );
}
