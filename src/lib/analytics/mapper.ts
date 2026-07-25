import type { RevenueStats, OrderStats, ProductStats, ConversionStats, FunnelStage } from "./types";
import { COMPLETED_STATUSES_MUTABLE as COMPLETED_STATUSES, MAX_TOP_PRODUCTS, MAX_TOP_PERFORMERS, MAX_LOWEST_PERFORMERS } from "./constants";
import { percentChange } from "./date";

export interface OrderRow {
  amount: number;
  createdAt: Date;
  status: string;
  productId?: string;
  product?: { name: string } | null;
}

export interface ProductRow {
  id: string;
  name: string;
  isActive: boolean;
  isFeatured: boolean;
  price: number;
}

export function mapRevenueStats(
  currentSum: number,
  previousSum: number,
  byDay: { date: string; amount: number }[],
  byProduct: { productName: string; amount: number; count: number }[],
): RevenueStats {
  return {
    total: currentSum,
    previousTotal: previousSum,
    changePercent: percentChange(currentSum, previousSum),
    byDay,
    byProduct,
  };
}

export function groupRevenueByDay(orders: { amount: number; createdAt: Date }[]): { date: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + o.amount);
  }
  return Array.from(map.entries())
    .map(([date, amount]) => ({ date, amount: Math.round(amount) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function groupRevenueByProduct(orders: OrderRow[]): { productName: string; amount: number; count: number }[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const o of orders) {
    const name = o.product?.name ?? "Unknown";
    const entry = map.get(name) ?? { amount: 0, count: 0 };
    entry.amount += o.amount;
    entry.count += 1;
    map.set(name, entry);
  }
  return Array.from(map.entries())
    .map(([productName, { amount, count }]) => ({ productName, amount: Math.round(amount), count }))
    .sort((a, b) => b.amount - a.amount);
}

export function mapOrderStats(
  orders: OrderRow[],
  previousTotal: number,
  byDay: { date: string; count: number }[],
  topProducts: { name: string; count: number; revenue: number }[],
): OrderStats {
  const total = orders.length;
  const completed = orders.filter((o) => COMPLETED_STATUSES.includes(o.status)).length;
  const pending = orders.filter((o) => o.status === "PENDING").length;
  const failed = orders.filter((o) => o.status === "FAILED").length;
  const completedRevenue = orders.filter((o) => COMPLETED_STATUSES.includes(o.status)).reduce((s, o) => s + o.amount, 0);
  const averageValue = completed > 0 ? Math.round(completedRevenue / completed) : 0;

  return {
    total, completed, pending, failed,
    previousTotal,
    changePercent: percentChange(total, previousTotal),
    averageValue, topProducts, byDay,
  };
}

export function groupOrdersByDay(orders: { createdAt: Date }[]): { date: string; count: number }[] {
  const map = new Map<string, number>();
  for (const o of orders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function groupTopProducts(orders: OrderRow[]): { name: string; count: number; revenue: number }[] {
  const map = new Map<string, { count: number; revenue: number }>();
  for (const o of orders) {
    const name = o.product?.name ?? "Unknown";
    const entry = map.get(name) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += o.amount;
    map.set(name, entry);
  }
  return Array.from(map.entries())
    .map(([name, { count, revenue }]) => ({ name, count, revenue: Math.round(revenue) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TOP_PRODUCTS);
}

export function mapProductStats(
  products: ProductRow[],
  orderSalesMap: Map<string, { sales: number; revenue: number }>,
): ProductStats {
  const total = products.length;
  const active = products.filter((p) => p.isActive).length;
  const featured = products.filter((p) => p.isFeatured).length;
  const withSales = orderSalesMap.size;

  const performers = products.map((p) => {
    const s = orderSalesMap.get(p.id) ?? { sales: 0, revenue: 0 };
    const views = Math.max(s.sales, 1);
    return { name: p.name, sales: s.sales, revenue: Math.round(s.revenue), conversion: Math.round((s.sales / views) * 100) };
  });

  const sorted = [...performers].sort((a, b) => b.sales - a.sales);
  const topPerformers = sorted.filter((p) => p.sales > 0).slice(0, MAX_TOP_PERFORMERS);
  const lowestPerformers = sorted.filter((p) => p.sales === 0).slice(0, MAX_LOWEST_PERFORMERS);

  return { total, active, featured, withSales, topPerformers, lowestPerformers };
}

export function buildSalesMap(orders: { productId: string; amount: number }[]): Map<string, { sales: number; revenue: number }> {
  const map = new Map<string, { sales: number; revenue: number }>();
  for (const o of orders) {
    const entry = map.get(o.productId) ?? { sales: 0, revenue: 0 };
    entry.sales += 1;
    entry.revenue += o.amount;
    map.set(o.productId, entry);
  }
  return map;
}

export function mapConversionStats(
  orders: OrderRow[],
  productCount: number,
): ConversionStats {
  const total = orders.length;
  const completed = orders.filter((o) => COMPLETED_STATUSES.includes(o.status)).length;
  const overall = total > 0 ? Math.round((completed / total) * 100) : 0;

  const funnel: FunnelStage[] = [
    { label: "Visitors", count: Math.max(total * 10, productCount * 5), dropoff: 0, dropoffPercent: 0 },
    { label: "Product Views", count: Math.max(total * 5, productCount * 2), dropoff: 0, dropoffPercent: 0 },
    { label: "Checkout Started", count: total, dropoff: 0, dropoffPercent: 0 },
    { label: "Payment Completed", count: completed, dropoff: total - completed, dropoffPercent: total > 0 ? Math.round(((total - completed) / total) * 100) : 0 },
  ];

  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1].count;
    const curr = funnel[i].count;
    funnel[i].dropoff = prev - curr;
    funnel[i].dropoffPercent = prev > 0 ? Math.round(((prev - curr) / prev) * 100) : 0;
  }

  return { overall, funnel };
}
