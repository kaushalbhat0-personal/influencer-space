// ── Recommendation Runtime (RCCF-EPIC-06) ───────────────────
// Continuously analyzes every creator's business from EXISTING runtimes and
// determines the highest-impact next action. Deterministic, registry-driven,
// no AI, never invents recommendations, never owns data — it computes.

// Domain
export {
  RECOMMENDATION_REGISTRY,
  getRecommendation,
  isKnownRecommendation,
} from "./domain/registry";
export {
  RECOMMENDATION_CATEGORY_LABELS,
  type Recommendation,
  type RecommendationDefinition,
  type RecommendationContext,
  type RecommendationCategory,
  type RecommendationStatus,
  type RecommendationMetrics,
  type RecommendationHistory,
  type RecommendationHistoryEntry,
  type RecommendationAnalytics,
  type ExpectedImpact,
} from "./domain/types";

// Application
export {
  scoreRecommendation,
  priorityTerm,
  impactTerm,
  goalAlignmentTerm,
  knowledgeGapTerm,
  easeTerm,
  progressTerm,
  breakdown,
  type ScoreBreakdown,
} from "./application/scoring";
export {
  CATEGORY_ORDER,
  groupByCategory,
  type RecommendationGroup,
} from "./application/categories";
export {
  computeStorefrontLift,
  activeImpacts,
  IMPACT_DIMENSIONS,
  IMPACT_LABELS,
} from "./application/impact";
export { computeRecommendations } from "./application/engine";
export {
  recommendationHistory,
  HISTORY_SETTING_KEY,
} from "./application/history";
export {
  recommendationRuntime,
  type RecommendationRuntime as RecommendationRuntimeClass,
} from "./application/runtime";

// Infrastructure
export { recommendationContextSource, RecommendationContextSource } from "./infrastructure/context-source";
