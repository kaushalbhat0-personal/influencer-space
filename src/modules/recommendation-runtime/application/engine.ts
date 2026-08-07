// ── Recommendation Engine (Phase 2) ─────────────────────────
// Produces the full recommendation list for a context, scored and sorted.
// Pure and deterministic — no I/O. The runtime handles history + persistence.

import { getField } from "@/modules/knowledge-runtime";
import { getGoal } from "@/modules/goals-runtime";
import { RECOMMENDATION_REGISTRY, getRecommendation } from "../domain/registry";
import { scoreRecommendation } from "./scoring";
import { computeStorefrontLift, computeHealthLift } from "./impact";
import { RECOMMENDATION_CATEGORY_LABELS } from "../domain/types";
import type {
  Recommendation,
  RecommendationContext,
  RecommendationDefinition,
  RecommendationHistory,
  RecommendationHistoryEntry,
} from "../domain/types";

function toRecommendation(
  definition: RecommendationDefinition,
  ctx: RecommendationContext,
  score: number,
  historyEntry: RecommendationHistoryEntry | undefined,
): Recommendation {
  const missing = definition.knowledgeDependencies.filter(
    (id) => !(getField(id)?.complete(ctx.snapshot) ?? false),
  );
  const activeGoals =
    ctx.activeProfile?.weights.filter((w) => w.weight > 0 && definition.goalAffinity[w.goalId]) ?? [];

  const reasons = [
    definition.reason(ctx),
    ...activeGoals.map((w) => `Supports your goal: ${getGoal(w.goalId)?.label ?? w.goalId}`),
    ...missing.map((id) => `Missing: ${getField(id)?.label ?? id}`),
  ];

  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    category: definition.category,
    categoryLabel: RECOMMENDATION_CATEGORY_LABELS[definition.category],
    priority: definition.priority,
    estimatedTime: definition.estimatedTime,
    score,
    expectedImpact: definition.expectedImpact,
    storefrontLift: computeStorefrontLift(definition.expectedImpact),
    healthLift: computeHealthLift(definition.expectedImpact),
    goalAffinity: activeGoals.map((w) => w.goalId),
    missingKnowledge: missing,
    reasons,
    actions: {
      dashboard: definition.dashboardAction,
      builder: definition.builderAction,
      adminHref: definition.adminHref,
    },
    history: historyEntry ? { status: historyEntry.status, shownAt: historyEntry.shownAt } : null,
  };
}

export function computeRecommendations(
  ctx: RecommendationContext,
  history: RecommendationHistory,
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const definition of RECOMMENDATION_REGISTRY) {
    const entry = history[definition.id];
    if (entry && (entry.status === "dismissed" || entry.status === "completed" || entry.status === "ignored")) {
      continue;
    }
    if (!definition.when(ctx)) continue;
    if (definition.done(ctx)) continue;

    const prerequisitesSatisfied = definition.prerequisites.every((prereqId) => {
      const prereq = getRecommendation(prereqId);
      if (!prereq) return true;
      return prereq.done(ctx) || history[prereqId]?.status === "completed";
    });
    if (!prerequisitesSatisfied) continue;

    recommendations.push(toRecommendation(definition, ctx, scoreRecommendation(definition, ctx), entry));
  }

  return recommendations.sort((a, b) => b.score - a.score);
}
