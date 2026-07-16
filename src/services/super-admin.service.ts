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
  const [totalTenants, totalProducts, activeProSubscriptions] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.product.count(),
      prisma.subscription.count({ where: { plan: "PRO" } }),
    ]);

  return { totalTenants, totalProducts, activeProSubscriptions };
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
