// ── Builder Goal Suggestions (Phase 7) ─────────────────────
// The Builder knows the creator's goals. For each active goal, surface
// contextual suggestions only for knowledge that is actually missing — never
// popups, never content that already exists.

import type { KnowledgeSnapshot } from "@/modules/knowledge-runtime";
import { detectMissingFields } from "@/modules/knowledge-runtime";
import type { GoalBuilderSuggestion, GoalProfile } from "../domain/types";
import { getGoal } from "../domain/registry";

export function goalBuilderSuggestions(
  profile: GoalProfile | null,
  snapshot: KnowledgeSnapshot,
): GoalBuilderSuggestion[] {
  if (!profile) return [];

  const missing = new Set(detectMissingFields(snapshot).map((m) => m.fieldId));
  const suggestions: GoalBuilderSuggestion[] = [];

  for (const weight of profile.weights) {
    const goal = getGoal(weight.goalId);
    if (!goal) continue;
    for (const template of goal.suggestions) {
      if (missing.has(template.knowledgeField)) {
        suggestions.push({
          goalId: goal.id,
          goalLabel: goal.label,
          goalIcon: goal.icon,
          title: template.title,
          message: template.message,
          moduleId: template.moduleId,
          href: template.href,
          severity: template.severity,
        });
      }
    }
  }

  return suggestions;
}
