import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer } from "@/components/layout";
import { BillingPageClient } from "@/components/billing/BillingPageClient";
import { billingService } from "@/lib/billing/service";
import { getPlan, getCreatorPlans } from "@/lib/billing/mapper";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getServerSession(authOptions).catch(() => null);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);
  if (!tenant) {
    return <ContentContainer><p className="text-red-400">No tenant configured.</p></ContentContainer>;
  }

  const workspace = await workspaceRepository.findByTenantId(tenant.id).catch(() => null);

  if (workspace) {
    const [billingData, plans] = await Promise.all([
      billingService.getBillingInfo(workspace.id, tenant.id).catch(() => null),
      Promise.resolve(billingService.getPlans()).catch(() => []),
    ]);
    if (!billingData) {
      return <ContentContainer><p className="text-red-400">Failed to load billing data.</p></ContentContainer>;
    }
    const upgradeUrl = process.env.NEXT_PUBLIC_UPGRADE_URL;

    return (
      <BillingPageClient billingData={billingData} availablePlans={plans} upgradeUrl={upgradeUrl} />
    );
  }

  const productCount = await prisma.product.count({ where: { tenantId: tenant.id } }).catch(() => 0);
  const plan = getPlan("creator_free") ?? { code: "creator_free", family: "creator" as const, name: "Free Forever", description: "", price: 0, currency: "INR", features: {}, recommended: false, badge: "" };
  const plans = getCreatorPlans();

  const billingData = {
    plan: { ...plan, name: "Free Forever", price: 0 },
    subscription: { id: "", accountId: tenant.id, workspaceId: tenant.id, planCode: "creator_free", status: "ACTIVE" as const, trialEndsAt: null, renewsAt: null, cancelledAt: null, createdAt: new Date().toISOString() },
    invoices: [], paymentMethods: [], usage: [],
    activeProducts: productCount, activeGallery: 0, storageUsed: 0, ordersProcessed: 0, messagesSent: 0,
  };

  return <BillingPageClient billingData={billingData} availablePlans={plans} />;
}
