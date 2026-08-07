// ── Recommendation Scoring (Phase 2) ────────────────────────
// Every recommendation is scored deterministically:
//
//   score = Priority × Business Impact × Goal Alignment
//         × Knowledge Gap × Completion Ease × Current Progress
//
// Higher score = higher-impact next action. The product is scaled to a 0-100
// display value; ordering (not absolute value) drives decision making.

import type { GoalProfile } from "@/modules/goals-runtime";
import { getField } from "@/modules/knowledge-runtime";
import type { ExpectedImpact, RecommendationContext, RecommendationDefinition } from "../domain/types";

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** 1..5 → 1.0..0.2 (priority 1 dominates). */
export function priorityTerm(priority: number): number {
  return (6 - priority) / 5;
}

/** Sum of expected-impact deltas normalized to [0,1]. ~40 impact = full weight. */
export function impactTerm(impact: ExpectedImpact): number {
  const total = Object.values(impact).reduce((sum, v) => sum + Math.abs(v ?? 0), 0);
  return clamp(total / 40, 0, 1);
}

/**
 * How well the recommendation aligns with the creator's weighted goal profile.
 * Best matching goal affinity weighted by its share of the profile.
 */
export function goalAlignmentTerm(goalAffinity: Record<string, number>, profile: GoalProfile | null): number {
  if (!profile || profile.weights.length === 0) return 0.2;
  let best = 0;
  const totalWeight = profile.weights.reduce((sum, w) => sum + w.weight, 0) || 1;
  for (const weight of profile.weights) {
    const affinity = goalAffinity[weight.goalId];
    if (affinity === undefined) continue;
    const share = weight.weight / totalWeight;
    best = Math.max(best, affinity * share);
  }
  return clamp(0.2 + 0.8 * best, 0, 1);
}

/** Fraction of knowledge dependencies still missing (the gap the rec closes). */
export function knowledgeGapTerm(dependencies: string[], ctx: RecommendationContext): number {
  if (dependencies.length === 0) return 0.5;
  const satisfied = dependencies.filter((id) => getField(id)?.complete(ctx.snapshot)).length;
  return (dependencies.length - satisfied) / dependencies.length;
}

/** Quick tasks score higher (more likely to be completed). */
export function easeTerm(estimatedMinutes: number): number {
  return clamp(1 - estimatedMinutes / 120, 0.2, 1);
}

/** Near-completion recommendations are boosted (the finish line is close). */
export function progressTerm(dependencies: string[], ctx: RecommendationContext): number {
  if (dependencies.length === 0) return 0.5;
  const satisfied = dependencies.filter((id) => getField(id)?.complete(ctx.snapshot)).length;
  return 0.5 + 0.5 * (satisfied / dependencies.length);
}

export function scoreRecommendation(
  definition: RecommendationDefinition,
  ctx: RecommendationContext,
): number {
  const p = priorityTerm(definition.priority);
  const i = impactTerm(definition.expectedImpact);
  const g = goalAlignmentTerm(definition.goalAffinity, ctx.activeProfile);
  const k = knowledgeGapTerm(definition.knowledgeDependencies, ctx);
  const e = easeTerm(definition.estimatedTime);
  const pr = progressTerm(definition.knowledgeDependencies, ctx);

  const raw = p * i * g * k * e * pr;
  return Math.round(raw * 1000) / 10;
}

export const SCORE_TERMS: Array<keyof RecommendationContext> = [];

export interface ScoreBreakdown {
  priority: number;
  impact: number;
  goalAlignment: number;
  knowledgeGap: number;
  ease: number;
  progress: number;
  total: number;
}

export function breakdown(definition: RecommendationDefinition, ctx: RecommendationContext): ScoreBreakdown {
  const terms = {
    priority: priorityTerm(definition.priority),
    impact: impactTerm(definition.expectedImpact),
    goalAlignment: goalAlignmentTerm(definition.goalAffinity, ctx.activeProfile),
    knowledgeGap: knowledgeGapTerm(definition.knowledgeDependencies, ctx),
    ease: easeTerm(definition.estimatedTime),
    progress: progressTerm(definition.knowledgeDependencies, ctx),
  };
  return {
    ...terms,
    total: Math.round(terms.priority * terms.impact * terms.goalAlignment * terms.knowledgeGap * terms.ease * terms.progress * 1000) / 10,
  };
}
