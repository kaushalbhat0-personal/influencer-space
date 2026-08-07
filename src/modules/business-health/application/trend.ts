// ── Health Trend Engine (Phase 5) ───────────────────────────
// Compares the current health against the last recorded projection to produce
// a trend (improving / stable / declining). Deterministic — no external
// analytics.

import type { HealthTrendResult } from "../domain/types";

const TREND_DELTA = 2; // ±2 points counts as stable

export function computeTrend(current: number, previous: number | null): HealthTrendResult["trend"] {
  if (previous === null) return "new";
  const delta = current - previous;
  if (delta > TREND_DELTA) return "improving";
  if (delta < -TREND_DELTA) return "declining";
  return "stable";
}

export function trendFrom(current: number, previous: number | null, historyLength: number): HealthTrendResult {
  return {
    trend: computeTrend(current, previous),
    current,
    previous,
    delta: previous === null ? 0 : Math.round((current - previous) * 10) / 10,
    historyLength,
  };
}
