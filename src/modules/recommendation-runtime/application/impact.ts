// ── Expected Impact (Phase 8) ───────────────────────────────
// Every recommendation declares expected improvement across storefront
// dimensions (Knowledge +5, SEO +8, Trust +4, …). The runtime surfaces these
// deltas and a single "Storefront lift" figure. Computed from the registry —
// no AI.

import type { ExpectedImpact } from "../domain/types";

export const IMPACT_DIMENSIONS: Array<keyof ExpectedImpact> = [
  "knowledge",
  "content",
  "commerce",
  "brand",
  "seo",
  "trust",
  "accessibility",
  "goalAlignment",
];

export const IMPACT_LABELS: Record<keyof ExpectedImpact, string> = {
  knowledge: "Knowledge",
  content: "Content",
  commerce: "Commerce",
  brand: "Brand",
  seo: "SEO",
  trust: "Trust",
  accessibility: "Accessibility",
  goalAlignment: "Goal Alignment",
};

/** Average expected improvement across the 8 storefront dimensions. */
export function computeStorefrontLift(impact: ExpectedImpact): number {
  const total = IMPACT_DIMENSIONS.reduce((sum, d) => sum + Math.abs(impact[d] ?? 0), 0);
  return Math.round((total / IMPACT_DIMENSIONS.length) * 10) / 10;
}

/**
 * Expected Business Health lift (RCCF-EPIC-07). The Business Health score is a
 * weighted composition of the storefront dimensions, so the total impact maps
 * to an approximate health-lift figure. Deterministic.
 */
export function computeHealthLift(impact: ExpectedImpact): number {
  const total = IMPACT_DIMENSIONS.reduce((sum, d) => sum + Math.abs(impact[d] ?? 0), 0);
  return Math.round(total / 20);
}

/** Non-zero impact dimensions (for display). */
export function activeImpacts(impact: ExpectedImpact): Array<{ id: keyof ExpectedImpact; label: string; delta: number }> {
  return IMPACT_DIMENSIONS
    .filter((d) => (impact[d] ?? 0) !== 0)
    .map((d) => ({ id: d, label: IMPACT_LABELS[d], delta: impact[d] ?? 0 }));
}
