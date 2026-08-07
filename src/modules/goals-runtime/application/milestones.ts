// ── Goal-Aware Milestones (Phase 9) ─────────────────────────
// Success milestones become goal-aware. For a selected goal, this runtime
// produces the goal's milestone plan with done states, composing with the
// existing Creator Success Runtime rather than duplicating it — the goals
// runtime consumes the same canonical counts.

import type { GoalCounts, GoalMilestoneStep, GoalProfile } from "../domain/types";
import { getGoal } from "../domain/registry";

export interface GoalMilestone extends Omit<GoalMilestoneStep, "done"> {
  done: boolean;
}

export function goalMilestones(goalId: string, counts: GoalCounts): GoalMilestone[] {
  const goal = getGoal(goalId);
  if (!goal) return [];
  return goal.milestonePath.map((step) => ({ ...step, done: step.done(counts) }));
}

export function goalMilestoneProgress(goalId: string, counts: GoalCounts): number {
  const milestones = goalMilestones(goalId, counts);
  if (milestones.length === 0) return 0;
  const done = milestones.filter((m) => m.done).length;
  return Math.round((done / milestones.length) * 100);
}

/** First undone milestone for the primary goal — the goal-aware "next task". */
export function goalAwareNextTask(
  profile: GoalProfile | null,
  counts: GoalCounts,
): GoalMilestone | null {
  if (!profile || profile.weights.length === 0) return null;
  const primary = profile.weights[0];
  return goalMilestones(primary.goalId, counts).find((m) => !m.done) ?? null;
}
