// ── Navigation Runtime (Phase 5) ────────────────────────────
// Navigation adapts to goals: the goal's primary surface appears earlier,
// supporting sections move up. With no goal profile the navigation is
// returned unchanged (existing storefront nav behaves identically).

import type { GoalProfile } from "../domain/types";
import { getGoal } from "../domain/registry";

export interface GoalNavLike {
  id: string;
  [key: string]: unknown;
}

const navBase = (id: string): string => (id ?? "").toLowerCase();

export function goalNavScore(itemId: string, profile: GoalProfile | null): number {
  if (!profile) return 0;
  const base = navBase(itemId);
  let score = 0;
  for (const weight of profile.weights) {
    const goal = getGoal(weight.goalId);
    if (!goal) continue;
    const hint = goal.navigationPriority;
    const index = hint.indexOf(base);
    score += weight.weight * (index === -1 ? hint.length + 1 : index + 1);
  }
  return score;
}

export function applyGoalNavigation<T extends GoalNavLike>(
  navigation: T[],
  profile: GoalProfile | null,
): T[] {
  if (!profile || profile.weights.length === 0) return navigation;

  const home = navigation.filter((n) => navBase(n.id) === "hero" || n.href === "#hero");
  const contact = navigation.filter((n) => navBase(n.id) === "contact");
  const middle = navigation.filter((n) => {
    const base = navBase(n.id);
    return base !== "hero" && base !== "contact" && n.href !== "#hero";
  });

  const orderedMiddle = [...middle].sort(
    (a, b) => goalNavScore(a.id, profile) - goalNavScore(b.id, profile),
  );

  return [...home, ...orderedMiddle, ...contact];
}
