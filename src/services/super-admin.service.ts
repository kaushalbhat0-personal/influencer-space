import { prisma } from "@/lib/prisma";

export interface PlatformStats {
  totalTenants: number;
  totalProducts: number;
  activeProSubscriptions: number;
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
  const [totalTenants, totalProducts, proPlans, activeProSubscriptionsLegacy] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.product.count(),
      prisma.billingPlan.findMany({ where: { family: "creator", price: { gt: 0 } }, select: { id: true } }),
      prisma.subscription.count({ where: { plan: "PRO" } }),
    ]);

  const proPlanIds = proPlans.map((p) => p.id);
  const activeV2Subscriptions = proPlanIds.length > 0
    ? await prisma.billingSubscription.count({ where: { planId: { in: proPlanIds }, status: "ACTIVE" } })
    : 0;

  return { totalTenants, totalProducts, activeProSubscriptions: activeV2Subscriptions + activeProSubscriptionsLegacy };
}

export async function getAllTenants(): Promise<TenantWithDetails[]> {
  return prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { select: { id: true, email: true, name: true } },
      subscription: { select: { plan: true, status: true } },
      _count: { select: { users: true, products: true } },
    },
  });
}
