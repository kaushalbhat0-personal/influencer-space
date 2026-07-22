/**
 * Product Analytics v1.0
 *
 * Unified analytics service. All platform events flow through here.
 * Supports funnel analysis, retention, and cohort tracking.
 */

export type EventStage =
  | "signup" | "workspace_created" | "website_generated" | "website_published"
  | "product_added" | "checkout_enabled" | "domain_connected"
  | "first_sale" | "upgrade";

export interface ProductEvent {
  id: string;
  stage: EventStage;
  userId?: string;
  tenantId?: string;
  persona?: "creator" | "agency";
  planCode?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export const ACTIVATION_FUNNEL: EventStage[] = [
  "signup", "workspace_created", "website_generated", "website_published",
  "product_added", "checkout_enabled", "domain_connected", "first_sale", "upgrade",
];

const events: ProductEvent[] = [];

export function trackProductEvent(stage: EventStage, meta?: Record<string, unknown>): ProductEvent {
  const event: ProductEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    stage, timestamp: new Date().toISOString(), metadata: meta,
  };
  events.push(event);
  return event;
}

export function getFunnelCounts(): Record<EventStage, number> {
  const counts: Record<string, number> = {};
  for (const stage of ACTIVATION_FUNNEL) {
    counts[stage] = events.filter((e) => e.stage === stage).length;
  }
  return counts as Record<EventStage, number>;
}

export function getFunnelDropoff(): { stage: EventStage; count: number; dropoff: number; dropoffPct: number }[] {
  const counts = getFunnelCounts();
  return ACTIVATION_FUNNEL.map((stage, i) => {
    const prev = i > 0 ? counts[ACTIVATION_FUNNEL[i - 1]!]! : counts[stage]!;
    const current = counts[stage]!;
    const dropoff = prev - current;
    return { stage, count: current, dropoff, dropoffPct: prev > 0 ? Math.round((dropoff / prev) * 100) : 0 };
  });
}

export function getConversionRate(from: EventStage, to: EventStage): number {
  const counts = getFunnelCounts();
  const fromCount = counts[from] ?? 0;
  const toCount = counts[to] ?? 0;
  return fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0;
}

export function getAllEvents(): ProductEvent[] {
  return [...events];
}
