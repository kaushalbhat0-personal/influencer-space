// ── Creator Goals Runtime (RCCF-EPIC-05) ───────────────────
// Goals answer "what are you trying to achieve?" and COMPOSE with the
// Knowledge Runtime ("who are you?"). Goals are a weighted profile — never a
// single selection — so composition, navigation, dashboard, Builder hints,
// milestones and the storefront score can all make nuanced decisions.
//
// Deterministic. Registry-driven. No AI. No duplicate logic.

// Domain
export {
  GOAL_REGISTRY,
  getGoal,
  isKnownGoal,
} from "./domain/registry";
export {
  GOAL_PACKS,
  getBaseWeights,
} from "./domain/goal-packs";
export type {
  GoalId,
  GoalCategory,
  GoalDefinition,
  GoalWeight,
  GoalProfile,
  GoalRecommendation,
  GoalAlignment,
  GoalAlignmentItem,
  GoalCounts,
  GoalMilestoneStep,
  GoalSuggestionTemplate,
  GoalDashboardData,
  GoalDashboardPrimary,
  GoalBuilderSuggestion,
  CommerceSurface,
} from "./domain/types";

// Application
export {
  recommendGoals,
  normalizeGoalWeights,
  recommendedProfile,
  MAX_RECOMMENDED_GOALS,
} from "./application/recommendation-engine";
export {
  goalProfileService,
  validateGoalProfile,
  sortWeightsDesc,
  primaryGoal,
  GOALS_SETTING_KEY,
  type SaveGoalProfileInput,
  type ProfileValidation,
} from "./application/profile-service";
export {
  applyGoalSectionOrder,
  applyGoalSectionPriority,
  goalSectionScore,
  type GoalSectionLike,
} from "./application/composition";
export {
  applyGoalNavigation,
  goalNavScore,
  type GoalNavLike,
} from "./application/navigation";
export {
  commercePriority,
  commerceRank,
  applyCommerceOrder,
  COMMERCE_SURFACE_LABELS,
  primaryGoalSummary,
} from "./application/commerce";
export { goalBuilderSuggestions } from "./application/builder-suggestions";
export {
  goalMilestones,
  goalMilestoneProgress,
  goalAwareNextTask,
  type GoalMilestone,
} from "./application/milestones";
export { computeGoalAlignment } from "./application/alignment";
export { goalDashboard } from "./application/dashboard";
export {
  goalRuntime,
  type GoalRuntimeResult,
} from "./application/goal-runtime";

// Infrastructure
export {
  buildGoalCounts,
  countsFromSnapshot,
} from "./infrastructure/goal-source";
