"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type OrderRow = {
  id: string;
  productName: string;
  amount: number;
  status: string;
  fanEmail: string | null;
  razorpayOrderId: string;
  createdAt: Date;
};

async function requireTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}

export async function fetchOrders(tenantId: string): Promise<OrderRow[]> {
  await requireTenant();

  const orders = await prisma.productOrder.findMany({
    where: { tenantId },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return orders.map((o) => ({
    id: o.id,
    productName: o.product?.name ?? "Unknown",
    amount: o.amount,
    status: o.status,
    fanEmail: o.fanEmail,
    razorpayOrderId: o.razorpayOrderId,
    createdAt: o.createdAt,
  }));
}

export async function fetchCustomers(tenantId: string) {
  await requireTenant();

  const orders = await prisma.productOrder.findMany({
    where: { tenantId, fanEmail: { not: null } },
    select: { fanEmail: true, amount: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const customerMap = new Map<string, { totalSpent: number; orderCount: number; lastOrder: Date }>();
  for (const o of orders) {
    const email = o.fanEmail!;
    const existing = customerMap.get(email);
    if (existing) {
      existing.totalSpent += o.amount;
      existing.orderCount += 1;
      if (o.createdAt > existing.lastOrder) existing.lastOrder = o.createdAt;
    } else {
      customerMap.set(email, { totalSpent: o.amount, orderCount: 1, lastOrder: o.createdAt });
    }
  }

  return Array.from(customerMap.entries()).map(([email, data]) => ({
    email,
    totalSpent: data.totalSpent,
    orderCount: data.orderCount,
    lastOrder: data.lastOrder.toISOString(),
  }));
}

export async function fetchAnalytics(tenantId: string) {
  await requireTenant();

  const [orders, products, totalRevenue] = await Promise.all([
    prisma.productOrder.findMany({
      where: { tenantId },
      select: { amount: true, status: true, createdAt: true },
    }),
    prisma.product.findMany({
      where: { tenantId },
      select: { name: true, isActive: true },
    }),
    prisma.productOrder.aggregate({
      where: { tenantId },
      _sum: { amount: true },
    }),
  ]);

  const completedOrders = orders.filter((o) => o.status === "PAID" || o.status === "COMPLETED");
  const revenue = totalRevenue._sum.amount ?? 0;

  return {
    totalOrders: orders.length,
    completedOrders: completedOrders.length,
    totalRevenue: revenue,
    activeProducts: products.filter((p) => p.isActive).length,
    topProducts: products.slice(0, 5).map((p) => p.name),
  };
}
