import { prisma } from "@/lib/prisma";
import { metricsRegistry } from "./metrics";
import type { AnalyticsEvent, MetricValue, DashboardSummary } from "./types";

export class AnalyticsEngine {
  /** Ingest an analytics event — stores immutably and returns the record ID. */
  async ingest(event: AnalyticsEvent): Promise<string> {
    const record = await prisma.analyticsEvent.create({
      data: JSON.parse(JSON.stringify({
        tenantId: event.tenantId || null,
        source: event.source,
        eventType: event.eventType,
        entityId: event.entityId || null,
        payload: event.payload || {},
        occurredAt: event.occurredAt || new Date(),
      })),
    });
    return record.id;
  }

  /** Query raw events with filters. */
  async query(params: {
    tenantId?: string;
    source?: string;
    eventType?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.source) where.source = params.source;
    if (params.eventType) where.eventType = params.eventType;
    const occurredAt: Record<string, Date> = {};
    if (params.from) occurredAt.gte = params.from;
    if (params.to) occurredAt.lte = params.to;
    if (Object.keys(occurredAt).length > 0) where.occurredAt = occurredAt;

    const whereClause = JSON.parse(JSON.stringify(where));
    const [events, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where: whereClause,
        orderBy: { occurredAt: "desc" },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      prisma.analyticsEvent.count({ where: whereClause }),
    ]);

    return { events, total };
  }

  /** Compute a specific metric. */
  async computeMetric(metricId: string, from: Date, to: Date, tenantId?: string): Promise<MetricValue> {
    return metricsRegistry.calculate(metricId, from, to, tenantId);
  }

  /** Build a summary dashboard from a set of metric IDs. */
  async dashboard(metricIds: string[], period: { from: Date; to: Date }, tenantId?: string): Promise<DashboardSummary> {
    const results = await Promise.all(
      metricIds.map((id) =>
        metricsRegistry.calculate(id, period.from, period.to, tenantId).catch(() => ({
          label: id,
          value: 0,
          unit: undefined,
        })),
      ),
    );

    return {
      period: { from: period.from.toISOString(), to: period.to.toISOString() },
      metrics: results,
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();
