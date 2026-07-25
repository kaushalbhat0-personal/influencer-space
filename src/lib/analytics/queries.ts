import { prisma } from "@/lib/prisma";
import type { DateRange } from "./date";
import { previousPeriod } from "./date";
import type { AnalyticsSummary, RevenueStats, OrderStats, ProductStats, ConversionStats } from "./types";
import { COMPLETED_STATUSES_MUTABLE as COMPLETED_STATUSES } from "./constants";
import type { OrderRow, ProductRow } from "./mapper";
import {
  mapRevenueStats,
  mapOrderStats,
  mapProductStats,
  mapConversionStats,
  groupRevenueByDay,
  groupRevenueByProduct,
  groupOrdersByDay,
  groupTopProducts,
  buildSalesMap,
} from "./mapper";
import { computeInsights, type InsightInput } from "./insights";

const orderWithProduct = {
  select: { amount: true, createdAt: true, status: true, productId: true, product: { select: { name: true } } },
} as const;

const productLight = {
  select: { id: true, name: true, isActive: true, isFeatured: true, price: true },
} as const;

export async function computeAnalytics(tenantId: string, range: DateRange): Promise<AnalyticsSummary> {
  const prev = previousPeriod(range);

  const [
    allOrders,
    previousOrderCount,
    products,
    galleryCount,
    revenueAgg,
    prevRevenueAgg,
  ] = await Promise.all([
    prisma.productOrder.findMany({
      where: { tenantId, createdAt: { gte: range.from, lte: range.to } },
      ...orderWithProduct,
    }),
    prisma.productOrder.count({
      where: { tenantId, createdAt: { gte: prev.from, lte: prev.to } },
    }),
    prisma.product.findMany({ where: { tenantId }, ...productLight }),
    prisma.galleryImage.count({ where: { tenantId } }),
    prisma.productOrder.aggregate({
      where: { tenantId, status: { in: COMPLETED_STATUSES }, createdAt: { gte: range.from, lte: range.to } },
      _sum: { amount: true },
    }),
    prisma.productOrder.aggregate({
      where: { tenantId, status: { in: COMPLETED_STATUSES }, createdAt: { gte: prev.from, lte: prev.to } },
      _sum: { amount: true },
    }),
  ]);

  const completedOrders = allOrders.filter((o) => COMPLETED_STATUSES.includes(o.status as string)) as unknown as OrderRow[];

  const revenue: RevenueStats = mapRevenueStats(
    revenueAgg._sum?.amount ?? 0,
    prevRevenueAgg._sum?.amount ?? 0,
    groupRevenueByDay(completedOrders),
    groupRevenueByProduct(completedOrders),
  );

  const orders: OrderStats = mapOrderStats(
    allOrders as unknown as OrderRow[],
    previousOrderCount,
    groupOrdersByDay(allOrders),
    groupTopProducts(completedOrders),
  );

  const productSalesMap = buildSalesMap(completedOrders as unknown as { productId: string; amount: number }[]);
  const productsStats: ProductStats = mapProductStats(products as unknown as ProductRow[], productSalesMap);

  const conversion: ConversionStats = mapConversionStats(allOrders as unknown as OrderRow[], products.length);

  const insightInput: InsightInput = {
    orderCount: allOrders.length,
    prevOrderCount: previousOrderCount,
    productCount: products.length,
    revenue: revenueAgg._sum?.amount ?? 0,
    prevRevenue: prevRevenueAgg._sum?.amount ?? 0,
    galleryCount,
  };
  const insights = computeInsights(insightInput);

  return {
    revenue, orders, products: productsStats, conversion, insights,
    period: { from: range.from.toISOString(), to: range.to.toISOString() },
  };
}
