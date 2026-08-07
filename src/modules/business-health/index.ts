// ── Business Health Runtime (RCCF-EPIC-07) ──────────────────
// Composes every existing runtime (via the shared Runtime Context) into a
// single 0-100 Business Health Score — the creator's north-star KPI and the
// optimization target for the Recommendation Runtime. A derived projection:
// it owns no business data.

// Domain
export {
  HEALTH_DIMENSION_REGISTRY,
  getHealthDimension,
  defaultWeights,
  type HealthEvalDeps,
} from "./domain/registry";
export type {
  BusinessHealth,
  HealthDimensionId,
  HealthDimensionDefinition,
  HealthDimensionScore,
  HealthGrade,
  HealthTrend,
  HealthProjection,
  HealthHistory,
  HealthTrendResult,
  PlatformHealthSnapshot,
  PlatformHealthReport,
} from "./domain/types";

// Application
export {
  computeBusinessHealth,
  toProjection,
  type BusinessHealthOptions,
} from "./application/engine";
export {
  GRADE_BANDS,
  gradeFor,
  nextMilestoneFor,
} from "./application/grades";
export { computeTrend, trendFrom } from "./application/trend";
export {
  businessHealthRuntime,
  type HealthEvaluation,
} from "./application/runtime";

// Infrastructure
export { healthHistoryStore, HEALTH_HISTORY_SETTING_KEY } from "./infrastructure/history-store";
