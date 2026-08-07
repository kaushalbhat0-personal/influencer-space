// ── Recommendation Categories (Phase 3) ─────────────────────
// Groups recommendations into buckets the dashboard and knowledge page render
// as grouped cards: Critical · High Impact · Quick Wins · Growth ·
// Optimization · Advanced.

import type { Recommendation, RecommendationCategory } from "../domain/types";
import { RECOMMENDATION_CATEGORY_LABELS } from "../domain/types";

export const CATEGORY_ORDER: RecommendationCategory[] = [
  "critical",
  "high_impact",
  "quick_win",
  "growth",
  "optimization",
  "advanced",
];

export interface RecommendationGroup {
  category: RecommendationCategory;
  label: string;
  items: Recommendation[];
}

export function groupByCategory(recommendations: Recommendation[]): RecommendationGroup[] {
  const groups: RecommendationGroup[] = [];
  for (const category of CATEGORY_ORDER) {
    const items = recommendations
      .filter((r) => r.category === category)
      .sort((a, b) => b.score - a.score);
    if (items.length > 0) {
      groups.push({ category, label: RECOMMENDATION_CATEGORY_LABELS[category], items });
    }
  }
  return groups;
}
