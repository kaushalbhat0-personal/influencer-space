import { prisma } from "@/lib/prisma";
import { billingRepository } from "@/modules/billing/infrastructure/repository";

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
    activeV2Subscriptions, activeProSubscriptionsLegacy, auditCount, publishCount,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.product.count(),
    prisma.galleryImage.count(),
    prisma.productOrder.count(),
    prisma.productOrder.aggregate({ _sum: { amount: true } }),
    prisma.websiteAgency.count(),
    prisma.user.count(),
    billingRepository.countActiveProSubscriptions(),
    billingRepository.countProSubscriptionsLegacy(),
    prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.publishSnapshot.count(),
  ]);

  return {
    totalTenants, totalProducts, totalGallery, totalOrders,
    totalRevenue: revenueAgg._sum.amount ?? 0,
    totalAgencies, totalUsers,
    activeProSubscriptions: activeV2Subscriptions + activeProSubscriptionsLegacy,
    auditEntries24h: auditCount,
    publishCount,
  };
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
