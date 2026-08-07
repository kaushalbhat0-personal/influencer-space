// ── Goal Dashboard Card (Phase 6) ───────────────────────────
// The creator dashboard shows the current business goal, its progress, missing
// items and a CTA. Progress = goal alignment of the primary goal (how much of
// its supporting knowledge is complete); the CTA deep-links to the first
// missing item. Deterministic — no AI.

import type { KnowledgeSnapshot, MissingField } from "@/modules/knowledge-runtime";
import { detectMissingFields } from "@/modules/knowledge-runtime";
import type { GoalDashboardData, GoalProfile } from "../domain/types";
import { getGoal } from "../domain/registry";
import { primaryGoal } from "./profile-service";
import { commercePriority } from "./commerce";
import { computeGoalAlignment } from "./alignment";

export function goalDashboard(
  profile: GoalProfile | null,
  snapshot: KnowledgeSnapshot,
): GoalDashboardData | null {
  if (!profile || profile.weights.length === 0) return null;

  const primary = primaryGoal(profile);
  if (!primary) return null;

  const goal = getGoal(primary.goalId);
  const supporting = new Set(goal?.supportingKnowledge ?? []);
  const byFieldId = new Map(detectMissingFields(snapshot).map((m) => [m.fieldId, m]));

  // Order missing items by the GOAL's supporting-knowledge order (the goal's
  // own intent), not the generic knowledge priority.
  const missing: MissingField[] = (goal?.supportingKnowledge ?? [])
    .filter((fieldId) => supporting.has(fieldId) && byFieldId.has(fieldId))
    .map((fieldId) => byFieldId.get(fieldId)!);

  // CTA follows the goal's own suggestion order (first missing suggestion).
  const ctaTemplate = goal?.suggestions.find((s) => byFieldId.has(s.knowledgeField)) ?? null;
  const cta = ctaTemplate
    ? { label: ctaTemplate.title, href: ctaTemplate.href }
    : goal?.milestonePath.length
      ? { label: "Keep growing", href: "/admin/goals" }
      : null;

  const alignment = computeGoalAlignment(profile, snapshot);
  const primaryAlignment = alignment.items.find((i) => i.goalId === primary.goalId);

  return {
    primary: {
      goalId: primary.goalId,
      label: goal?.label ?? primary.goalId,
      icon: goal?.icon ?? "Target",
      weight: primary.weight,
      progress: primaryAlignment?.percent ?? 0,
      missing: missing.slice(0, 4),
      cta,
      recommendations: missing.length,
    },
    secondary: profile.weights
      .filter((w) => w.goalId !== primary.goalId)
      .map((w) => {
        const g = getGoal(w.goalId);
        const item = alignment.items.find((i) => i.goalId === w.goalId);
        return {
          goalId: w.goalId,
          label: g?.label ?? w.goalId,
          weight: w.weight,
          progress: item?.percent ?? 0,
        };
      }),
    commercePriority: commercePriority(profile),
  };
}
