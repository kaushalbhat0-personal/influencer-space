// ── Commerce Strategy — Domain Types ─────────────────────────
// RCCF-IMPLEMENTATION-73. The canonical strategy determines how money flows
// for every commercial transaction. Checkout and all commerce consumers ask
// exactly one question: "Which strategy does this tenant use?".

export type CommerceStrategyId = "PLATFORM_COLLECT" | "DIRECT_CREATOR" | "MARKETPLACE" | "HYBRID";

export type MerchantOfRecord = "platform" | "creator";

/** Declarative strategy definition (Phase 2 registry). */
export interface CommerceStrategyDefinition {
  id: CommerceStrategyId;
  label: string;
  description: string;
  merchantOfRecord: MerchantOfRecord;
  supportsTransfers: boolean;
  supportsSubscriptions: boolean;
  supportsProducts: boolean;
  supportsBookings: boolean;
  supportsServices: boolean;
  supportsCourses: boolean;
  requiresLinkedAccount: boolean;
  requiresSettlement: boolean;
  requiresShipping: boolean;
  requiresDigitalDelivery: boolean;
  /** Current implementation status. */
  status: "active" | "reserved" | "future";
}

export type StrategyReadiness = "ready" | "blocked" | "incomplete";

/** The resolved strategy for a tenant, with the source of the decision. */
export interface ResolvedCommerceStrategy {
  id: CommerceStrategyId;
  source: "tenant" | "workspace" | "platform" | "default";
  definition: CommerceStrategyDefinition;
  readiness: StrategyReadiness;
  reason: string | null;
}

/** Readiness of a tenant for a given strategy (e.g. DIRECT_CREATOR needs a linked account). */
export interface StrategyReadinessReport {
  strategy: CommerceStrategyId;
  readiness: StrategyReadiness;
  requirements: Array<{ key: string; label: string; met: boolean }>;
}
