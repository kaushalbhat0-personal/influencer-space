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
  | "payout.completed"
  // RCCF-IMPLEMENTATION-73 — commerce strategy events.
  | "commerce.strategy.resolved"
  | "commerce.strategy.changed"
  // RCCF-IMPLEMENTATION-74 — payment account events.
  | "payment.account.created"
  | "payment.account.updated"
  | "payment.account.verified"
  | "payment.account.disconnected"
  | "payment.readiness.changed"
  // RCCF-EPIC-09 — customer success events.
  | "success.stage.changed"
  | "risk.changed"
  | "opportunity.detected"
  | "customer.activated"
  | "customer.retained"
  | "customer.churn-risk"
  // RCCF-TRACK-01 — fulfillment events.
  | "fulfillment.created"
  | "fulfillment.updated"
  | "shipment.created"
  | "shipment.delivered"
  | "download.generated"
  | "download.expired"
  | "booking.confirmed"
  | "service.completed"
  // RCCF-LAUNCH-TRACK-03 — real-time generation progress events.
  | "generation.started"
  | "generation.profile.imported"
  | "generation.workspace.created"
  | "generation.runtime.initialized"
  | "generation.website.generated"
  | "generation.content.generated"
  | "generation.builder.completed"
  | "generation.quality.started"
  | "generation.quality.completed"
  | "generation.publish.started"
  | "generation.publish.completed"
  | "generation.dashboard.ready"
  | "generation.completed"
  | "generation.failed"
  | "generation.cancelled";

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
  "commerce.strategy.resolved",
  "commerce.strategy.changed",
  "payment.account.created",
  "payment.account.updated",
  "payment.account.verified",
  "payment.account.disconnected",
  "payment.readiness.changed",
  "success.stage.changed",
  "risk.changed",
  "opportunity.detected",
  "customer.activated",
  "customer.retained",
  "customer.churn-risk",
  "fulfillment.created",
  "fulfillment.updated",
  "shipment.created",
  "shipment.delivered",
  "download.generated",
  "download.expired",
  "booking.confirmed",
  "service.completed",
  "generation.started",
  "generation.profile.imported",
  "generation.workspace.created",
  "generation.runtime.initialized",
  "generation.website.generated",
  "generation.content.generated",
  "generation.builder.completed",
  "generation.quality.started",
  "generation.quality.completed",
  "generation.publish.started",
  "generation.publish.completed",
  "generation.dashboard.ready",
  "generation.completed",
  "generation.failed",
  "generation.cancelled",
];

export interface RuntimeEvent {
  type: IntelligenceEventType;
  tenantId: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  occurredAt: string;
}

export type RuntimeEventSubscriber = (event: RuntimeEvent) => void;
