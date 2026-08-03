/**
 * Pure progress helpers for the Generation Animation Runtime — IMPLEMENTATION-28.
 * Kept free of JSX so they are unit-testable in the node environment.
 */

/**
 * Clamps a progress value to [0, 100]. NaN/undefined defensively → 0.
 * The bar animates to EXACTLY this value (no overshoot, no looping).
 */
export function normalizeProgress(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
}

/** ARIA progressbar contract for a given runtime value. */
export function progressAria(value: number): { valuemin: number; valuemax: number; valuenow: number } {
  return { valuemin: 0, valuemax: 100, valuenow: Math.round(normalizeProgress(value)) };
}
