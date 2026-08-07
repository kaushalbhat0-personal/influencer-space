// ── Goal Weights (pure) ─────────────────────────────────────
// Pure weight helpers — no prisma, no I/O. Safe to import from client
// components. The prisma-backed GoalProfileService re-exports these.

import type { GoalProfile, GoalWeight } from "../domain/types";

export function sortWeightsDesc(weights: GoalWeight[]): GoalWeight[] {
  return [...weights].sort((a, b) => b.weight - a.weight);
}

export function primaryGoal(profile: GoalProfile | null): GoalWeight | null {
  if (!profile || profile.weights.length === 0) return null;
  return [...profile.weights].sort((a, b) => b.weight - a.weight)[0]!;
}
