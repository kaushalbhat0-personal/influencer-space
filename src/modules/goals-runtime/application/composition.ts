// ── Website Composition (Phase 4) ───────────────────────────
// Goals influence homepage composition by RE-ORDERING existing sections —
// never by adding, removing or duplicating templates. Hero stays first,
// footer stays last, and with no goal profile the input is returned untouched
// (existing storefronts behave identically).

import type { GoalProfile } from "../domain/types";
import { getGoal } from "../domain/registry";

export interface GoalSectionLike {
  moduleId: string;
  [key: string]: unknown;
}

const baseOf = (moduleId: string): string => (moduleId ?? "").split(".")[0];

/**
 * Lower score = earlier. Sections mentioned in a goal's sectionOrderHint are
 * boosted by that goal's weight; sections in no hint sink below hinted ones
 * while preserving their original relative order.
 */
export function goalSectionScore(moduleId: string, profile: GoalProfile | null): number {
  if (!profile) return 0;
  const base = baseOf(moduleId);
  let score = 0;
  for (const weight of profile.weights) {
    const goal = getGoal(weight.goalId);
    if (!goal) continue;
    const hint = goal.sectionOrderHint;
    const index = hint.indexOf(base);
    score += weight.weight * (index === -1 ? hint.length + 1 : index + 1);
  }
  return score;
}

export function applyGoalSectionOrder<T extends GoalSectionLike>(
  pages: Array<{ sections: T[] }>,
  profile: GoalProfile | null,
): Array<{ sections: T[] }> {
  if (!profile || profile.weights.length === 0) return pages;

  return pages.map((page) => {
    const hero = page.sections.filter((s) => baseOf(s.moduleId) === "hero");
    const footer = page.sections.filter((s) => baseOf(s.moduleId) === "footer");
    const middle = page.sections.filter((s) => {
      const base = baseOf(s.moduleId);
      return base !== "hero" && base !== "footer";
    });

    const orderedMiddle = [...middle].sort(
      (a, b) => goalSectionScore(a.moduleId, profile) - goalSectionScore(b.moduleId, profile),
    );

    return { ...page, sections: [...hero, ...orderedMiddle, ...footer] };
  });
}

/**
 * RCCF-INTEGRATION-01 Phase 3: re-order a generated builder-artifact section
 * list by the creator's weighted goal profile (hero first, footer last,
 * goal-preferred sections earlier). Applies to the pre-provisioning artifact so
 * generated websites lead with what the creator wants to achieve. Pure and
 * additive — no-op without a profile.
 */
export function applyGoalSectionPriority<T extends { type: string }>(
  sections: T[],
  profile: GoalProfile | null,
): T[] {
  if (!profile || profile.weights.length === 0) return sections;

  const hero = sections.filter((s) => s.type === "hero");
  const footer = sections.filter((s) => s.type === "footer");
  const middle = sections.filter((s) => s.type !== "hero" && s.type !== "footer");
  const ordered = [...middle].sort(
    (a, b) => goalSectionScore(a.type, profile) - goalSectionScore(b.type, profile),
  );
  return [...hero, ...ordered, ...footer];
}
