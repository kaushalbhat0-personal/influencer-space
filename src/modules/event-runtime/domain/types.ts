// ── Runtime Event Runtime — Domain Types ───────────────────
// RCCF-INTEGRATION-01 Phase 9. A canonical, internal event layer. Every
// runtime emits typed events that become inputs for the future Insights,
// Automation and Business Health runtimes. No external queues — an internal
// bus with a durable AnalyticsEvent record.

export type IntelligenceEventType =
  | "knowledge.completed"
  | "goal.updated"
  | "recommendation.accepted"
  | "recommendation.dismissed"
  | "recommendation.completed"
  | "milestone.unlocked"
  | "storefront.published"
  | "theme.changed"
  | "builder.published"
  | "commerce.created"
  | "booking.received"
  | "product.created"
  | "generation.completed"
  | "onboarding.completed"
  | "business-health.updated"
  | "business-health.milestone"
  | "business-health.grade.changed"
  // RCCF-IMPLEMENTATION-72 — subscription revenue runtime events.
  | "subscription.created"
  | "subscription.renewed"
  | "subscription.upgraded"
  | "subscription.cancelled"
  | "commission.created"
  | "commission.failed"
  | "ledger.updated"
  | "settlement.created"
  | "settlement.completed"
  | "payout.created"
  | "payout.completed";

export const INTELLIGENCE_EVENT_TYPES: IntelligenceEventType[] = [
  "knowledge.completed",
  "goal.updated",
  "recommendation.accepted",
  "recommendation.dismissed",
  "recommendation.completed",
  "milestone.unlocked",
  "storefront.published",
  "theme.changed",
  "builder.published",
  "commerce.created",
  "booking.received",
  "product.created",
  "generation.completed",
  "onboarding.completed",
  "business-health.updated",
  "business-health.milestone",
  "business-health.grade.changed",
  "subscription.created",
  "subscription.renewed",
  "subscription.upgraded",
  "subscription.cancelled",
  "commission.created",
  "commission.failed",
  "ledger.updated",
  "settlement.created",
  "settlement.completed",
  "payout.created",
  "payout.completed",
];

export interface RuntimeEvent {
  type: IntelligenceEventType;
  tenantId: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  occurredAt: string;
}

export type RuntimeEventSubscriber = (event: RuntimeEvent) => void;
