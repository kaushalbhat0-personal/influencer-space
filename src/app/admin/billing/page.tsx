import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth/require-tenant";
import { ContentContainer } from "@/components/layout";
import { BillingPageClient } from "@/components/billing/BillingPageClient";
import { billingService } from "@/modules/billing/application/service";
import type { BillingDashboard, BillingPlan } from "@/lib/billing/types";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { tenantId } = await requireTenant();

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);
  if (!tenant) {
    return <ContentContainer><p className="text-red-400">No tenant configured.</p></ContentContainer>;
  }

  const workspace = await workspaceRepository.findByTenantId(tenant.id).catch(() => null);

  if (workspace) {
    const [billingData, plans] = await Promise.all([
      billingService.getBillingInfo(workspace.id, tenant.id).catch(() => null) as Promise<BillingDashboard | null>,
      Promise.resolve(billingService.getPlans()).catch(() => []) as Promise<BillingPlan[]>,
    ]);
    if (!billingData) {
      return <ContentContainer><p className="text-red-400">Failed to load billing data.</p></ContentContainer>;
    }
    const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_URL;

    return (
      <BillingPageClient billingData={billingData} availablePlans={plans} upgradeUrl={upgradeUrl} workspaceId={workspace.id} tenantId={tenant.id} />
    );
  }

  const productCount = await prisma.product.count({ where: { tenantId: tenant.id } }).catch(() => 0);
  const plans = billingService.getPlans() as BillingPlan[];

  const billingData: BillingDashboard = {
    plan: { code: "creator_free", family: "creator", name: "Free Forever", description: "", price: 0, currency: "INR", features: {}, recommended: false, badge: "", cycle: "monthly" as const },
    subscription: { id: "", accountId: tenant.id, workspaceId: tenant.id, planCode: "creator_free", status: "ACTIVE", trialEndsAt: null, renewsAt: null, cancelledAt: null, createdAt: new Date().toISOString() },
    invoices: [], paymentMethods: [], usage: [],
    activeProducts: productCount, activeGallery: 0, storageUsed: 0, ordersProcessed: 0, messagesSent: 0,
  };

  return <BillingPageClient billingData={billingData} availablePlans={plans} workspaceId={tenant.id} tenantId={tenant.id} />;
}
