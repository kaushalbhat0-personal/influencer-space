import { prisma } from "@/lib/prisma";
import type { MetricDefinition, MetricValue } from "./types";

export class MetricsRegistry {
  private metrics = new Map<string, MetricDefinition>();

  register(metric: MetricDefinition): void {
    this.metrics.set(metric.id, metric);
  }

  get(id: string): MetricDefinition | undefined {
    return this.metrics.get(id);
  }

  getAll(): MetricDefinition[] {
    return Array.from(this.metrics.values());
  }

  async calculate(id: string, from: Date, to: Date, tenantId?: string): Promise<MetricValue> {
    const metric = this.metrics.get(id);
    if (!metric) throw new Error(`Unknown metric: ${id}`);
    return metric.calculate(from, to, tenantId);
  }
}

export const metricsRegistry = new MetricsRegistry();

// ─── Built-in Metrics ─────────────────────────────────────

function previousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const diff = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - diff), to: new Date(from.getTime()) };
}

metricsRegistry.register({
  id: "total_tenants",
  label: "Active Tenants",
  description: "Total number of active tenants",
  calculate: async () => {
    const value = await prisma.tenant.count();
    return { label: "Active Tenants", value };
  },
});

metricsRegistry.register({
  id: "total_websites",
  label: "Websites",
  description: "Total number of websites",
  calculate: async () => {
    const value = await prisma.website.count();
    return { label: "Websites", value };
  },
});

metricsRegistry.register({
  id: "total_users",
  label: "Users",
  description: "Total registered users",
  calculate: async () => {
    const count = await prisma.user.count();
    return { label: "Users", value: count };
  },
});

metricsRegistry.register({
  id: "total_offerings",
  label: "Offerings",
  description: "Total published offerings",
  calculate: async () => {
    const value = await prisma.offering.count({ where: { status: "published" } });
    return { label: "Published Offerings", value };
  },
});

metricsRegistry.register({
  id: "total_purchases",
  label: "Purchases",
  description: "Total completed purchases",
  calculate: async (from, to) => {
    const value = await prisma.purchase.count({
      where: { status: "completed", createdAt: { gte: from, lte: to } },
    });
    const prev = previousPeriod(from, to);
    const prevValue = await prisma.purchase.count({
      where: { status: "completed", createdAt: { gte: prev.from, lte: prev.to } },
    });
    return { label: "Purchases", value, previousValue: prevValue, change: value - prevValue, changePercent: prevValue > 0 ? Math.round(((value - prevValue) / prevValue) * 100) : 0 };
  },
});

metricsRegistry.register({
  id: "total_revenue",
  label: "Revenue",
  description: "Total revenue from completed purchases",
  unit: "INR",
  calculate: async (from, to) => {
    const result = await prisma.purchase.aggregate({
      where: { status: "completed", createdAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    return { label: "Revenue", value: result._sum.amount || 0, unit: "INR" };
  },
});

metricsRegistry.register({
  id: "total_workflows",
  label: "Workflow Executions",
  description: "Total workflow executions",
  calculate: async () => {
    const value = await prisma.workflowExecution.count();
    return { label: "Workflow Executions", value };
  },
});

metricsRegistry.register({
  id: "total_assets",
  label: "Assets",
  description: "Total uploaded assets",
  calculate: async () => {
    const value = await prisma.asset.count();
    return { label: "Assets", value };
  },
});

metricsRegistry.register({
  id: "total_analytics_events",
  label: "Analytics Events",
  description: "Total analytics events ingested",
  calculate: async () => {
    const value = await prisma.analyticsEvent.count();
    return { label: "Analytics Events", value };
  },
});
