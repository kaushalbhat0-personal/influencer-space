import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { MetricValue, MetricDefinition } from "./types";
import { COMPLETED_STATUSES, CACHE_TTL_MS, MAX_CACHE_ENTRIES } from "./constants";
import { percentChange, previousPeriod } from "./date";

function orderWhere(tenantId: string | undefined, from: Date, to: Date, extra?: Prisma.ProductOrderWhereInput): Prisma.ProductOrderWhereInput {
  const base: Prisma.ProductOrderWhereInput = {};
  if (tenantId) base.tenantId = tenantId;
  base.createdAt = { gte: from, lte: to };
  if (extra) Object.assign(base, extra);
  return base;
}

interface CacheEntry {
  value: MetricValue;
  expiresAt: number;
}

export class MetricsRegistry {
  private metrics = new Map<string, MetricDefinition>();
  private dependencies = new Map<string, string[]>();
  private cache = new Map<string, CacheEntry>();
  private pendingLazy = new Set<string>();

  register(metric: MetricDefinition): void {
    this.metrics.set(metric.id, metric);
  }

  registerPlugin(metrics: MetricDefinition[]): void {
    for (const m of metrics) {
      this.metrics.set(m.id, m);
    }
  }

  registerLazy(id: string, factory: () => Promise<MetricDefinition>): void {
    if (!this.pendingLazy.has(id)) {
      this.pendingLazy.add(id);
      factory().then((metric) => {
        this.metrics.set(metric.id, metric);
        this.pendingLazy.delete(id);
      }).catch(() => {
        this.pendingLazy.delete(id);
      });
    }
  }

  addDependency(metricId: string, dependsOn: string[]): void {
    this.dependencies.set(metricId, dependsOn);
  }

  getDependencies(id: string): string[] {
    return this.dependencies.get(id) ?? [];
  }

  get(id: string): MetricDefinition | undefined {
    return this.metrics.get(id);
  }

  getAll(): MetricDefinition[] {
    return Array.from(this.metrics.values());
  }

  clearCache(): void {
    this.cache.clear();
  }

  invalidateCache(tenantId?: string): void {
    if (tenantId) {
      const entries = Array.from(this.cache.entries());
      for (const [key] of entries) {
        if (key.includes(tenantId)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  }

  private cacheKey(id: string, from: Date, to: Date, tenantId?: string): string {
    return `${id}:${from.getTime()}:${to.getTime()}:${tenantId ?? ""}`;
  }

  async calculate(id: string, from: Date, to: Date, tenantId?: string, useCache = true): Promise<MetricValue> {
    const metric = this.metrics.get(id);
    if (!metric) throw new Error(`Unknown metric: ${id}`);

    const key = this.cacheKey(id, from, to, tenantId);
    if (useCache) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > Date.now()) return cached.value;
    }

    const deps = this.dependencies.get(id) ?? [];
    if (deps.length > 0) {
      await Promise.all(deps.map((depId) => this.calculate(depId, from, to, tenantId, useCache)));
    }

    const value = await metric.calculate(from, to, tenantId);

    if (useCache) {
      if (this.cache.size >= MAX_CACHE_ENTRIES) {
        const entries = Array.from(this.cache.entries());
        const oldest = entries.reduce((a, b) => a[1].expiresAt < b[1].expiresAt ? a : b)[0];
        this.cache.delete(oldest);
      }
      this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    return value;
  }

  async dashboard(metricIds: string[], from: Date, to: Date, tenantId?: string): Promise<MetricValue[]> {
    return Promise.all(
      metricIds.map((id) =>
        this.calculate(id, from, to, tenantId).catch(() => ({
          id, label: id, value: 0, unit: undefined,
        } as MetricValue)),
      ),
    );
  }
}

export const metricsRegistry = new MetricsRegistry();

metricsRegistry.register({
  id: "revenue_total",
  label: "Revenue",
  description: "Total revenue from completed orders",
  unit: "INR",
  calculate: async (from, to, tenantId) => {
    const where = orderWhere(tenantId, from, to, { status: { in: COMPLETED_STATUSES as unknown as string[] } });
    const result = await prisma.productOrder.aggregate({ where, _sum: { amount: true } });
    const total = result._sum?.amount ?? 0;

    const prev = previousPeriod({ from, to, preset: "last_30_days", label: "" });
    const prevWhere = orderWhere(tenantId, prev.from, prev.to, { status: { in: COMPLETED_STATUSES as unknown as string[] } });
    const prevResult = await prisma.productOrder.aggregate({ where: prevWhere, _sum: { amount: true } });
    const previousTotal = prevResult._sum?.amount ?? 0;

    return {
      id: "revenue_total", label: "Revenue", value: total,
      previousValue: previousTotal, change: total - previousTotal,
      changePercent: percentChange(total, previousTotal) ?? 0,
      unit: "INR",
    };
  },
});

metricsRegistry.register({
  id: "order_count",
  label: "Orders",
  description: "Total number of orders",
  calculate: async (from, to, tenantId) => {
    const where = orderWhere(tenantId, from, to);
    const value = await prisma.productOrder.count({ where });

    const prev = previousPeriod({ from, to, preset: "last_30_days", label: "" });
    const prevWhere = orderWhere(tenantId, prev.from, prev.to);
    const prevValue = await prisma.productOrder.count({ where: prevWhere });

    return {
      id: "order_count", label: "Orders", value,
      previousValue: prevValue, change: value - prevValue,
      changePercent: percentChange(value, prevValue) ?? 0,
    };
  },
});

metricsRegistry.register({
  id: "aov",
  label: "Average Order Value",
  description: "Average revenue per completed order",
  unit: "INR",
  calculate: async (from, to, tenantId) => {
    const where = orderWhere(tenantId, from, to, { status: { in: COMPLETED_STATUSES as unknown as string[] } });
    const [aggregate, count] = await Promise.all([
      prisma.productOrder.aggregate({ where, _sum: { amount: true } }),
      prisma.productOrder.count({ where }),
    ]);
    const value = count > 0 ? Math.round((aggregate._sum?.amount ?? 0) / count) : 0;
    return { id: "aov", label: "Average Order Value", value, unit: "INR" };
  },
});

metricsRegistry.register({
  id: "conversion_rate",
  label: "Conversion Rate",
  description: "Percentage of orders that are completed",
  unit: "%",
  calculate: async (from, to, tenantId) => {
    const where = orderWhere(tenantId, from, to);
    const [total, completed] = await Promise.all([
      prisma.productOrder.count({ where }),
      prisma.productOrder.count({ where: { ...where, status: { in: COMPLETED_STATUSES as unknown as string[] } } }),
    ]);
    const value = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { id: "conversion_rate", label: "Conversion Rate", value, unit: "%" };
  },
});

metricsRegistry.register({
  id: "active_products",
  label: "Active Products",
  description: "Number of active products in catalog",
  calculate: async (_from, _to, tenantId) => {
    const where: Prisma.ProductWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    where.isActive = true;
    const value = await prisma.product.count({ where });
    return { id: "active_products", label: "Active Products", value };
  },
});

metricsRegistry.addDependency("total_revenue_growth", ["revenue_total"]);

metricsRegistry.register({
  id: "total_revenue_growth",
  label: "Revenue Growth",
  description: "Revenue growth compared to previous period",
  unit: "%",
  calculate: async (from, to, tenantId) => {
    const result = await metricsRegistry.calculate("revenue_total", from, to, tenantId);
    return {
      id: "total_revenue_growth", label: "Revenue Growth",
      value: result.changePercent ?? 0, unit: "%",
      previousValue: result.previousValue,
      change: result.change,
    };
  },
});
