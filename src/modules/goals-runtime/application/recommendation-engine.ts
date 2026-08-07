// ── Goal Recommendation Engine (Phase 3) ───────────────────
// The Knowledge Runtime recommends goals. Deterministic, no AI:
//   1. start from the entity pack's base weights,
//   2. adjust with live knowledge signals (what the creator already does),
//   3. keep the top goals and normalize to integer weights summing to 100.
//
// The result is a weighted profile — primary = highest weight — so a creator
// can shift from coaching-first to products-first by changing weights, never
// by replacing the goal model.

import type { KnowledgeSnapshot } from "@/modules/knowledge-runtime";
import type { GoalRecommendation, GoalWeight } from "../domain/types";
import { getGoal } from "../domain/registry";
import { getBaseWeights } from "../domain/goal-packs";

export type { GoalRecommendation } from "../domain/types";

export const MAX_RECOMMENDED_GOALS = 4;

type WeightMap = Map<string, number>;

/** Live knowledge signals that adjust goal weights. */
function signalsFromSnapshot(snapshot: KnowledgeSnapshot): Array<{ goalId: string; delta: number; label: string }> {
  const signals: Array<{ goalId: string; delta: number; label: string }> = [];
  const s = snapshot;

  if (s.commerce.productCount > 0) signals.push({ goalId: "SELL_PRODUCTS", delta: 10, label: "products already listed" });
  if (s.commerce.bookingCount > 0) signals.push({ goalId: "GET_BOOKINGS", delta: 10, label: "bookings already enabled" });
  if (s.commerce.courseCount > 0) signals.push({ goalId: "SELL_COURSES", delta: 10, label: "courses already published" });
  if (s.commerce.serviceCount > 0) signals.push({ goalId: "SELL_SERVICES", delta: 10, label: "services already listed" });
  if (s.content.galleryCount >= 3) signals.push({ goalId: "SHOW_PORTFOLIO", delta: 10, label: "strong portfolio already present" });
  if (s.content.feedCount > 0 || s.social.feedConnected) signals.push({ goalId: "GROW_YOUTUBE", delta: 10, label: "content feed connected" });
  if (s.social.affiliateLinkCount > 0) signals.push({ goalId: "MONETIZE_CONTENT", delta: 10, label: "affiliate links already added" });
  if (s.business.customDomain) signals.push({ goalId: "BUILD_BRAND", delta: 5, label: "custom domain connected" });
  if (s.trust.testimonialCount >= 3) signals.push({ goalId: "INCREASE_TRUST", delta: 5, label: "testimonials already present" });

  return signals;
}

/**
 * Normalize goal weights to positive integers summing to exactly 100
 * (largest remainders absorb rounding). Goal order is preserved.
 */
export function normalizeGoalWeights(weights: Array<{ goalId: string; weight: number }>): GoalWeight[] {
  const filtered = weights.filter((w) => w.weight > 0 && getGoal(w.goalId));
  if (filtered.length === 0) return [];

  const total = filtered.reduce((sum, w) => sum + w.weight, 0);
  if (total <= 0) return [];

  const scaled = filtered.map((w) => ({ goalId: w.goalId, weight: (w.weight / total) * 100 }));
  const result: GoalWeight[] = scaled.map((w) => ({ goalId: w.goalId as GoalWeight["goalId"], weight: Math.floor(w.weight) }));
  const remainder = 100 - result.reduce((sum, w) => sum + w.weight, 0);

  // Distribute the rounding remainder to the goals with the largest fractions.
  const orderedByFraction = scaled
    .map((w, i) => ({ index: i, fraction: w.weight - result[i]!.weight }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < remainder; i++) {
    const target = orderedByFraction[i % orderedByFraction.length]!;
    result[target.index]!.weight += 1;
  }

  return result;
}

/**
 * Recommend a weighted goal profile from the knowledge snapshot.
 * Entity pack priors → live signals → top-N normalized to 100.
 */
export function recommendGoals(snapshot: KnowledgeSnapshot): GoalRecommendation[] {
  const weights: WeightMap = new Map();
  const reasons = new Map<string, string>();

  for (const base of getBaseWeights(snapshot.entityType)) {
    weights.set(base.goalId, base.weight);
    reasons.set(base.goalId, base.reason);
  }

  for (const signal of signalsFromSnapshot(snapshot)) {
    weights.set(signal.goalId, (weights.get(signal.goalId) ?? 0) + signal.delta);
    const existing = reasons.get(signal.goalId) ?? "";
    reasons.set(signal.goalId, existing ? `${existing} · ${signal.label}` : signal.label);
  }

  const candidates = Array.from(weights.entries())
    .map(([goalId, weight]) => ({ goalId, weight }))
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return (getGoal(a.goalId)?.priority ?? 99) - (getGoal(b.goalId)?.priority ?? 99);
    })
    .slice(0, MAX_RECOMMENDED_GOALS);

  const normalized = normalizeGoalWeights(candidates);
  return normalized.map((w) => ({
    goalId: w.goalId,
    weight: w.weight,
    reason: reasons.get(w.goalId) ?? getGoal(w.goalId)?.description ?? "",
  }));
}

/** Build a recommended GoalProfile (usable as a default profile). */
export function recommendedProfile(
  snapshot: KnowledgeSnapshot,
): { weights: GoalWeight[]; entityType: string } {
  return {
    weights: recommendGoals(snapshot).map((r) => ({ goalId: r.goalId, weight: r.weight })),
    entityType: snapshot.entityType,
  };
}
