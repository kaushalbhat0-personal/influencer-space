import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth/require-tenant";
import { ContentContainer } from "@/components/layout";
import { BillingPageClient } from "@/components/billing/BillingPageClient";
import { billingService } from "@/modules/billing/application/service";
import { countStorageUsage, storageBytesToMb, resolveStorageCapability } from "@/modules/billing/application/storage.enforcement";
import type { BillingDashboard, BillingPlan } from "@/lib/billing/types";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { resolveCommerceStrategy } from "@/modules/commerce-strategy";
import { computePaymentReadiness, getActivePaymentAccount } from "@/modules/payment-account";
import { getPaymentProviderLabel } from "@/modules/payment-account/providers/registry";

export const dynamic = "force-dynamic";

async function getPaymentStrategyProps(tenantId: string) {
  const [strategy, readiness, active] = await Promise.all([
    resolveCommerceStrategy(tenantId).catch(() => null),
    computePaymentReadiness(tenantId).catch(() => null),
    getActivePaymentAccount(tenantId).catch(() => null),
  ]);
  return {
    strategy,
    readiness,
    activeProviderLabel: active ? getPaymentProviderLabel(active.provider) : null,
    lastVerifiedAt: active?.lastVerifiedAt ?? null,
  };
}

export default async function BillingPage() {
  const { tenantId } = await requireTenant();

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } }).catch(() => null);
  if (!tenant) {
    return <ContentContainer><p className="text-red-400">No tenant configured.</p></ContentContainer>;
  }

  const workspace = await workspaceRepository.findByTenantId(tenant.id).catch(() => null);

  if (workspace) {
    const [billingData, plans, paymentStrategy] = await Promise.all([
      billingService.getBillingInfo(workspace.id, tenant.id).catch(() => null) as Promise<BillingDashboard | null>,
      Promise.resolve(billingService.getPlans()).catch(() => []) as Promise<BillingPlan[]>,
      getPaymentStrategyProps(tenant.id),
    ]);
    if (!billingData) {
      return <ContentContainer><p className="text-red-400">Failed to load billing data.</p></ContentContainer>;
    }
    return (
      <BillingPageClient billingData={billingData} availablePlans={plans} workspaceId={workspace.id} tenantId={tenant.id} paymentStrategy={paymentStrategy} />
    );
  }

  const productCount = await prisma.product.count({ where: { tenantId: tenant.id } }).catch(() => 0);
  // RCCF-59: Creator storage displayed in MB from the canonical capability.
  const storageUsedMb = storageBytesToMb(await countStorageUsage(tenant.id).catch(() => 0));
  const storageCapability = resolveStorageCapability("creator_launch");
  const storageLimitMb = typeof storageCapability.limitBytes === "number" && Number.isFinite(storageCapability.limitBytes) ? Math.round(storageCapability.limitBytes / 1024 / 1024) : null;
  const plans = billingService.getPlans() as BillingPlan[];

  const billingData: BillingDashboard = {
    plan: { code: "creator_launch", family: "creator", name: "Creator Launch", description: "Get your storefront online and start selling — free.", price: 0, currency: "INR", features: {}, recommended: false, badge: "", cycle: "monthly" as const },
    subscription: { id: "", accountId: tenant.id, workspaceId: tenant.id, planCode: "creator_launch", status: "ACTIVE", trialEndsAt: null, renewsAt: null, cancelledAt: null, createdAt: new Date().toISOString() },
    invoices: [], paymentMethods: [], usage: [
      { metric: "storage", label: "Storage", used: storageUsedMb, limit: storageLimitMb ?? Infinity, unit: "MB" },
    ],
    activeProducts: productCount, activeGallery: 0, storageUsed: storageUsedMb, ordersProcessed: 0, messagesSent: 0,
  };

  const paymentStrategy = await getPaymentStrategyProps(tenant.id);
  return <BillingPageClient billingData={billingData} availablePlans={plans} workspaceId={tenant.id} tenantId={tenant.id} paymentStrategy={paymentStrategy} />;
}
