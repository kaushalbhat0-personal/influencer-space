import { prisma } from "@/lib/prisma";
import { billingRepository } from "@/modules/billing/infrastructure/repository";
import { resolvePlansForTenantIds } from "@/modules/billing/application/plan-source";
import { billingMigrationRegistry } from "@/modules/billing/application/migration-registry";

export interface PlatformStats {
  totalTenants: number;
  totalProducts: number;
  totalGallery: number;
  totalOrders: number;
  totalRevenue: number;
  totalAgencies: number;
  totalUsers: number;
  activeProSubscriptions: number;
  auditEntries24h: number;
  publishCount: number;
}

export interface TenantWithDetails {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  createdAt: Date;
  users: { id: string; email: string; name: string | null }[];
  subscription: { plan: string; status: string } | null;
  _count: { users: number; products: number };
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const [
    totalTenants, totalProducts, totalGallery, totalOrders,
    revenueAgg, totalAgencies, totalUsers,
    activeV2Subscriptions, auditCount, publishCount,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.product.count(),
    prisma.galleryImage.count(),
    prisma.productOrder.count(),
    prisma.productOrder.aggregate({ _sum: { amount: true } }),
    prisma.websiteAgency.count(),
    prisma.user.count(),
    billingRepository.countActiveProSubscriptions(),
    prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.publishSnapshot.count(),
  ]);

  // IMPLEMENTATION-39: legacy pro-count no longer added — Billing v2 only.
  billingMigrationRegistry.markMigrated("subscription-metrics");
  billingMigrationRegistry.markMigrated("legacy-pro-count");

  return {
    totalTenants, totalProducts, totalGallery, totalOrders,
    totalRevenue: revenueAgg._sum.amount ?? 0,
    totalAgencies, totalUsers,
    activeProSubscriptions: activeV2Subscriptions,
    auditEntries24h: auditCount,
    publishCount,
  };
}

export async function getAllTenants(): Promise<TenantWithDetails[]> {
  // RCCF-LAUNCH-01: lean select — previously the full Tenant row (incl.
  // razorpay/IG/Twitch/YT secrets) and every user were pulled per tenant.
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      subdomain: true,
      customDomain: true,
      createdAt: true,
      users: { select: { id: true, email: true, name: true }, take: 1 },
      _count: { select: { users: true, products: true } },
    },
  });

  // IMPLEMENTATION-39: Billing v2 is the only runtime source of truth.
  const plans = await resolvePlansForTenantIds(tenants.map((t) => t.id));
  const planByTenant = new Map(plans.map((p) => [p.tenantId, p]));
  billingMigrationRegistry.markMigrated("tenants-list");

  return tenants.map((tenant) => {
    const plan = planByTenant.get(tenant.id);
    return {
      ...tenant,
      subscription: plan?.planCode ? { plan: plan.planDisplay, status: plan.status ?? "ACTIVE" } : null,
    };
  });
}
