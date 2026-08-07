// ── Goal Alignment (Phase 10) ───────────────────────────────
// Measures how well the storefront supports the selected goals: for each
// weighted goal, how many of its supporting knowledge fields are complete.
// Overall = weight-weighted average. Deterministic, registry-derived.

import type { KnowledgeSnapshot } from "@/modules/knowledge-runtime";
import { getField } from "@/modules/knowledge-runtime";
import type { GoalAlignment, GoalProfile } from "../domain/types";
import { getGoal } from "../domain/registry";

/**
 * Fields whose knowledge-runtime `complete()` is vacuously true when their
 * parent content is empty (e.g. "product images" is satisfied when there are
 * no products). For GOAL ALIGNMENT these must not count as support — a
 * products goal is not 40% aligned just because there are no products.
 */
const VACUOUS_PARENT: Record<string, (s: KnowledgeSnapshot) => number> = {
  "commerce.productImages": (s) => s.commerce.productCount,
  "commerce.productDescriptions": (s) => s.commerce.productCount,
  "content.galleryQuality": (s) => s.content.galleryCount,
};

function isSupported(fieldId: string, snapshot: KnowledgeSnapshot): boolean {
  const field = getField(fieldId);
  if (!field || !field.complete(snapshot)) return false;
  const parent = VACUOUS_PARENT[fieldId];
  if (parent && parent(snapshot) <= 0) return false;
  return true;
}

export function computeGoalAlignment(
  profile: GoalProfile | null,
  snapshot: KnowledgeSnapshot,
): GoalAlignment {
  if (!profile || profile.weights.length === 0) {
    return { items: [], overall: 0 };
  }

  const items = profile.weights.map((weight) => {
    const goal = getGoal(weight.goalId);
    const fields = goal?.supportingKnowledge ?? [];
    const supported = fields.filter((fieldId) => isSupported(fieldId, snapshot)).length;
    const percent = fields.length > 0 ? Math.round((supported / fields.length) * 100) : 100;
    return {
      goalId: weight.goalId,
      label: goal?.label ?? weight.goalId,
      weight: weight.weight,
      supported,
      total: fields.length,
      percent,
    };
  });

  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const overall = totalWeight > 0
    ? Math.round(items.reduce((sum, i) => sum + (i.weight * i.percent) / totalWeight, 0))
    : 0;

  return { items, overall };
}
