// ── Business Health Engine (Phase 3) ────────────────────────
// Computes the live Business Health from the shared Runtime Context ONLY.
// Never rebuilds the WebsiteAggregate, never recalculates existing scores —
// it consumes the context's outputs (knowledge score, goal alignment,
// storefront score, success progress, metrics, recommendation history).

import type { RuntimeContext } from "@/modules/runtime-context";
import { HEALTH_DIMENSION_REGISTRY, type HealthEvalDeps } from "../domain/registry";
import { gradeFor, nextMilestoneFor } from "./grades";
import type {
  BusinessHealth,
  HealthDimensionId,
  HealthDimensionScore,
  HealthProjection,
} from "../domain/types";

export interface BusinessHealthOptions {
  /** Override registry weights (relative, configurable). */
  weights?: Partial<Record<HealthDimensionId, number>>;
}

function statusFor(score: number, healthy: number, warning: number, critical: number): HealthDimensionScore["status"] {
  if (score >= healthy) return "healthy";
  if (score >= warning) return "warning";
  if (score >= critical) return "critical";
  return "critical";
}

export function computeBusinessHealth(
  ctx: RuntimeContext,
  deps: HealthEvalDeps,
  options: BusinessHealthOptions = {},
): BusinessHealth {
  const weights = { ...Object.fromEntries(HEALTH_DIMENSION_REGISTRY.map((d) => [d.id, d.weight])), ...(options.weights ?? {}) };

  const dimensions: HealthDimensionScore[] = HEALTH_DIMENSION_REGISTRY.map((def) => {
    const score = Math.round(Math.min(100, Math.max(0, def.scoreExtractor(ctx, deps))));
    return {
      id: def.id,
      label: def.label,
      description: def.description,
      score,
      weight: weights[def.id] ?? 0,
      status: statusFor(score, def.healthyThreshold, def.warningThreshold, def.criticalThreshold),
      improvementRecommendations: def.improvementRecommendations,
      sourceRuntime: def.sourceRuntime,
    };
  });

  const weighted = dimensions.filter((d) => d.weight > 0);
  const totalWeight = weighted.reduce((sum, d) => sum + d.weight, 0);
  const overallScore = totalWeight > 0
    ? Math.round(weighted.reduce((sum, d) => sum + (d.score * d.weight) / totalWeight, 0))
    : 0;

  const available = HEALTH_DIMENSION_REGISTRY.map((def) => def.dataAvailable(ctx, deps));
  const confidence = available.filter(Boolean).length / available.length;

  const sorted = [...weighted].sort((a, b) => b.score - a.score);
  const strongestAreas = sorted.slice(0, 3).map((d) => d.label);
  const weakestAreas = [...weighted].sort((a, b) => a.score - b.score).slice(0, 3).map((d) => d.label);

  const focus = [...weighted]
    .filter((d) => d.status !== "healthy")
    .sort((a, b) => b.weight - a.weight)[0]
    ?? sorted[0];

  return {
    overallScore,
    grade: gradeFor(overallScore),
    dimensions,
    strongestAreas,
    weakestAreas,
    recommendedFocus: focus ? `Increase ${focus.label}` : "Maintain your health",
    nextMilestone: nextMilestoneFor(overallScore),
    confidence: Math.round(confidence * 100) / 100,
  };
}

/** Immutable projection of a health result (for trend history). */
export function toProjection(health: BusinessHealth): HealthProjection {
  return {
    recordedAt: new Date().toISOString(),
    overallScore: health.overallScore,
    grade: health.grade,
    dimensions: health.dimensions.map((d) => ({ id: d.id, score: d.score })),
  };
}
