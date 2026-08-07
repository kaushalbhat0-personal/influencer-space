// ── Commerce Strategy — Public API ──────────────────────────
export {
  COMMERCE_STRATEGY_REGISTRY,
  COMMERCE_STRATEGY_BY_ID,
  DEFAULT_COMMERCE_STRATEGY_ID,
} from "./application/registry";
export {
  resolveCommerceStrategy,
  getCommerceStrategyReadiness,
  getStrategyDistribution,
  getMigrationReadiness,
  emitStrategyEvent,
  setTenantCommerceStrategy,
} from "./application/runtime";
export type {
  CommerceStrategyId,
  CommerceStrategyDefinition,
  ResolvedCommerceStrategy,
  StrategyReadiness,
  StrategyReadinessReport,
} from "./domain/types";
