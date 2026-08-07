// ── Business Health Runtime — Domain Types ─────────────────
// RCCF-EPIC-07. Answers "how healthy is your creator business?" by composing
// EVERY existing runtime into a single 0-100 Business Health Score. It owns no
// business data — it is a derived projection over the Runtime Context.

import type { RecommendationHistory } from "@/modules/recommendation-runtime";
import type { RuntimeContext } from "@/modules/runtime-context";

export type HealthDimensionId =
  | "knowledge"
  | "goal_alignment"
  | "storefront_quality"
  | "success_progress"
  | "commerce_readiness"
  | "brand"
  | "trust"
  | "seo"
  | "platform_configuration"
  | "recommendation_adoption"
  | "performance"
  | "future_ready";

/** Shared per-evaluation deps (built once by the engine — no duplicate reads). */
export interface HealthEvalDeps {
  tenantId: string;
  recommendationHistory: RecommendationHistory;
}

export type HealthGrade = "A+" | "A" | "B" | "C" | "D" | "F";

export type HealthTrend = "improving" | "stable" | "declining" | "new";

export interface HealthDimensionDefinition {
  id: HealthDimensionId;
  label: string;
  description: string;
  /** Relative weight (0-100). Configurable via engine options. */
  weight: number;
  /** Source runtime that contributes this dimension. */
  sourceRuntime: string;
  healthyThreshold: number;
  warningThreshold: number;
  criticalThreshold: number;
  improvementRecommendations: string[];
  /** Deterministic 0-100 score from the shared Runtime Context. */
  scoreExtractor: (ctx: RuntimeContext, deps: HealthEvalDeps) => number;
  /** Whether the underlying data exists (drives confidence). */
  dataAvailable: (ctx: RuntimeContext, deps: HealthEvalDeps) => boolean;
}

export interface HealthDimensionScore {
  id: HealthDimensionId;
  label: string;
  description: string;
  score: number;
  weight: number;
  status: "healthy" | "warning" | "critical" | "na";
  improvementRecommendations: string[];
  sourceRuntime: string;
}

export interface BusinessHealth {
  overallScore: number;
  grade: HealthGrade;
  dimensions: HealthDimensionScore[];
  strongestAreas: string[];
  weakestAreas: string[];
  recommendedFocus: string;
  nextMilestone: number;
  confidence: number;
}

/** Immutable projection — appended to history, never mutated. */
export interface HealthProjection {
  recordedAt: string;
  overallScore: number;
  grade: HealthGrade;
  dimensions: Array<{ id: HealthDimensionId; score: number }>;
}

export interface HealthHistory {
  tenantId: string;
  projections: HealthProjection[];
}

export interface HealthTrendResult {
  trend: HealthTrend;
  current: number;
  previous: number | null;
  delta: number;
  historyLength: number;
}

export interface PlatformHealthSnapshot {
  tenantId: string;
  name: string;
  overallScore: number;
  grade: HealthGrade;
  recordedAt: string;
  plan: string | null;
  industry: string | null;
}

export interface PlatformHealthReport {
  creators: number;
  average: number;
  distribution: Array<{ grade: string; count: number }>;
  topTen: PlatformHealthSnapshot[];
  lowestTen: PlatformHealthSnapshot[];
  fastestImprovers: Array<PlatformHealthSnapshot & { delta: number }>;
  dimensionAverages: Array<{ id: string; label: string; average: number }>;
  byPlan: Array<{ plan: string; average: number; count: number }>;
  byIndustry: Array<{ industry: string; average: number; count: number }>;
}
