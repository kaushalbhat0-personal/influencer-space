// ── Recommendation Runtime (Phase 13) ───────────────────────
// Canonical public API. Future AI consumes this instead of generating its own
// recommendations. Methods: getRecommendations, getTopRecommendation, dismiss,
// complete, refresh — plus Phase 12 admin analytics.

import { recommendationContextSource } from "../infrastructure/context-source";
import { recommendationHistory } from "./history";
import { computeRecommendations } from "./engine";
import { computeStorefrontLift } from "./impact";
import { RECOMMENDATION_REGISTRY, getRecommendation } from "../domain/registry";
import { computeGoalAlignment } from "@/modules/goals-runtime";
import { computeKnowledgeScore, computeStorefrontScore, knowledgeAggregateSource } from "@/modules/knowledge-runtime";
import type {
  Recommendation,
  RecommendationAnalytics,
  RecommendationContext,
} from "../domain/types";

export class RecommendationRuntime {
  /** Full scored recommendation list for a creator (highest impact first). */
  async getRecommendations(tenantId: string): Promise<Recommendation[]> {
    const ctx = await recommendationContextSource.build(tenantId);
    const history = await recommendationHistory.get(tenantId);
    const recommendations = computeRecommendations(ctx, history);
    await recommendationHistory.markShown(
      tenantId,
      recommendations.slice(0, 8).map((r) => r.id),
    );
    return recommendations;
  }

  /** Today's highest-impact next action (or null when everything is done). */
  async getTopRecommendation(tenantId: string): Promise<Recommendation | null> {
    const recommendations = await this.getRecommendations(tenantId);
    return recommendations[0] ?? null;
  }

  async dismiss(tenantId: string, recommendationId: string): Promise<void> {
    await recommendationHistory.dismiss(tenantId, recommendationId);
  }

  async complete(tenantId: string, recommendationId: string): Promise<void> {
    const scores = await this.scoresSnapshot(tenantId);
    await recommendationHistory.complete(tenantId, recommendationId, scores);
  }

  async refresh(tenantId: string): Promise<void> {
    await recommendationHistory.clearIgnored(tenantId);
  }

  /** Re-evaluate from the live context (exposed for future consumers). */
  async buildContext(tenantId: string): Promise<RecommendationContext> {
    return recommendationContextSource.build(tenantId);
  }

  private async scoresSnapshot(tenantId: string): Promise<{ knowledge: number; goalAlignment: number; storefront: number }> {
    try {
      const snapshot = await knowledgeAggregateSource.buildSnapshot(tenantId);
      const profile = await recommendationContextSource.build(tenantId).then((ctx) => ctx.activeProfile);
      const knowledge = computeKnowledgeScore(snapshot).overall;
      const goalAlignment = computeGoalAlignment(profile, snapshot).overall;
      const storefront = computeStorefrontScore(snapshot, knowledge, { percent: goalAlignment }).overall;
      return { knowledge, goalAlignment, storefront };
    } catch {
      return { knowledge: 0, goalAlignment: 0, storefront: 0 };
    }
  }

  // ── Phase 12 — Admin analytics ────────────────────────────
  async analytics(): Promise<RecommendationAnalytics> {
    const rows = await recommendationHistory.getAll();
    const totals = {
      suggested: 0,
      completed: 0,
      dismissed: 0,
      creatorsWithRecommendations: rows.length,
    };

    const perRecommendation: RecommendationAnalytics["perRecommendation"] = RECOMMENDATION_REGISTRY.map((def) => {
      let suggested = 0;
      let completed = 0;
      let dismissed = 0;
      const completionTimes: number[] = [];

      for (const row of rows) {
        const entry = row.history[def.id];
        if (!entry) continue;
        if (entry.shownAt || entry.status === "accepted") suggested++;
        if (entry.status === "completed") completed++;
        if (entry.status === "dismissed") dismissed++;
        if (entry.status === "completed" && entry.completedAt && entry.shownAt) {
          const diffMs = new Date(entry.completedAt).getTime() - new Date(entry.shownAt).getTime();
          if (diffMs > 0) completionTimes.push(diffMs / 60000);
        }
      }

      totals.suggested += suggested;
      totals.completed += completed;
      totals.dismissed += dismissed;

      const avgCompletionMinutes = completionTimes.length > 0
        ? Math.round((completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length) * 10) / 10
        : null;

      return {
        id: def.id,
        title: def.title,
        suggested,
        completed,
        dismissed,
        completionRate: suggested > 0 ? Math.round((completed / suggested) * 100) : 0,
        avgCompletionMinutes,
        expectedLift: {
          knowledge: def.expectedImpact.knowledge ?? 0,
          goalAlignment: def.expectedImpact.goalAlignment ?? 0,
          storefront: computeStorefrontLift(def.expectedImpact),
        },
      };
    });

    perRecommendation.sort((a, b) => b.suggested - a.suggested);

    return { totals, perRecommendation };
  }

  getDefinition(id: string) {
    return getRecommendation(id);
  }
}

export const recommendationRuntime = new RecommendationRuntime();
