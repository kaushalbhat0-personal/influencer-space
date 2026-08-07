// ── Goal Runtime ────────────────────────────────────────────
// Canonical orchestrator (Phase 11 — the contract future systems consume).
// Composes the Knowledge Runtime with creator goals:
//
//   Knowledge Runtime → Goals Runtime → Composition / Navigation / Dashboard /
//   Builder / Milestones / Alignment → Recommendation Runtime (future)
//
// Deterministic. No AI. No duplicate logic.

import { knowledgeAggregateSource } from "@/modules/knowledge-runtime";
import type { KnowledgeSnapshot } from "@/modules/knowledge-runtime";
import { goalProfileService, type SaveGoalProfileInput } from "./profile-service";
import { recommendGoals, recommendedProfile, type GoalRecommendation } from "./recommendation-engine";
import { computeGoalAlignment } from "./alignment";
import { goalBuilderSuggestions } from "./builder-suggestions";
import { goalDashboard } from "./dashboard";
import { goalMilestones, type GoalMilestone } from "./milestones";
import { buildGoalCounts, countsFromSnapshot } from "../infrastructure/goal-source";
import { commercePriority, type CommerceSurface } from "./commerce";
import { getGoal } from "../domain/registry";
import type { GoalAlignment, GoalBuilderSuggestion, GoalCounts, GoalDashboardData, GoalProfile } from "../domain/types";

export interface GoalRuntimeResult {
  /** Persisted profile (null when the creator hasn't set goals). */
  profile: GoalProfile | null;
  /** Effective profile — persisted or deterministically recommended. */
  activeProfile: GoalProfile;
  recommendations: GoalRecommendation[];
  alignment: GoalAlignment;
  builderSuggestions: GoalBuilderSuggestion[];
  dashboard: GoalDashboardData | null;
  counts: GoalCounts;
  milestones: GoalMilestone[];
  commercePriority: CommerceSurface | null;
  snapshot: KnowledgeSnapshot;
}

function toActiveProfile(
  profile: GoalProfile | null,
  snapshot: KnowledgeSnapshot,
): GoalProfile {
  if (profile) return profile;
  const recommended = recommendedProfile(snapshot);
  return {
    weights: recommended.weights,
    updatedAt: "",
    source: "recommended",
    entityType: recommended.entityType,
  };
}

export class GoalRuntime {
  async evaluate(tenantId: string): Promise<GoalRuntimeResult> {
    const snapshot = await knowledgeAggregateSource.buildSnapshot(tenantId);
    const profile = await goalProfileService.getProfile(tenantId);
    return this.evaluateFrom(snapshot, profile, tenantId);
  }

  /**
   * Evaluate from an already-built snapshot (RCCF-INTEGRATION-01). Consumers of
   * the shared RuntimeContext call this so the WebsiteAggregate is built once.
   */
  async evaluateFromSnapshot(snapshot: KnowledgeSnapshot, tenantId: string): Promise<GoalRuntimeResult> {
    const profile = await goalProfileService.getProfile(tenantId);
    return this.evaluateFrom(snapshot, profile, tenantId);
  }

  async evaluateFrom(
    snapshot: KnowledgeSnapshot,
    profile: GoalProfile | null,
    tenantId: string,
  ): Promise<GoalRuntimeResult> {
    const activeProfile = toActiveProfile(profile, snapshot);
    const counts = await buildGoalCounts(tenantId, snapshot).catch(() => countsFromSnapshot(snapshot));
    const primary = activeProfile.weights[0];

    return {
      profile,
      activeProfile,
      recommendations: recommendGoals(snapshot),
      alignment: computeGoalAlignment(activeProfile, snapshot),
      builderSuggestions: goalBuilderSuggestions(activeProfile, snapshot),
      dashboard: goalDashboard(activeProfile, snapshot),
      counts,
      milestones: primary ? goalMilestones(primary.goalId, counts) : [],
      commercePriority: commercePriority(activeProfile),
      snapshot,
    };
  }

  /** Persist a manual weighted profile. */
  async saveProfile(tenantId: string, input: SaveGoalProfileInput): Promise<GoalProfile> {
    return goalProfileService.saveProfile(tenantId, input);
  }

  /** Persist the deterministically recommended profile. */
  async recommendAndSave(tenantId: string): Promise<GoalProfile> {
    const snapshot = await knowledgeAggregateSource.buildSnapshot(tenantId);
    const recommended = recommendedProfile(snapshot);
    return goalProfileService.saveProfile(tenantId, {
      weights: recommended.weights,
      source: "recommended",
    });
  }

  async clearProfile(tenantId: string): Promise<void> {
    return goalProfileService.clearProfile(tenantId);
  }

  /** Goal-aware milestones for any goal. */
  milestonesFor(goalId: string, snapshot: KnowledgeSnapshot, tenantId: string): Promise<GoalMilestone[]> {
    return buildGoalCounts(tenantId, snapshot).then((counts) => goalMilestones(goalId, counts));
  }

  getGoalDefinition(goalId: string) {
    return getGoal(goalId);
  }
}

export const goalRuntime = new GoalRuntime();
