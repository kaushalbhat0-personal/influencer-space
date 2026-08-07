// ── Customer Success — Public API ──────────────────────────
export { computeFromSignals } from "./application/compute";
export { computeSuccessScore, SUCCESS_DIMENSIONS } from "./application/score";
export { resolveJourney, JOURNEY_STAGES, JOURNEY_STAGE_LABEL } from "./application/journey";
export { assessRisk } from "./application/risk";
export { detectOpportunities } from "./application/opportunities";
export { getCustomerTimeline } from "./application/timeline";
export { getPlatformSuccessCenter, getAgencySuccessClients } from "./application/platform";
export { loadSignals, loadSignalsLight, computeCustomerSuccessCached } from "./application/signals";
export type {
  CustomerSuccess,
  SuccessSignals,
  SuccessDimensions,
  SuccessOpportunity,
  RiskFinding,
  RiskLevel,
  JourneyStage,
  JourneyMilestone,
  OpportunityType,
  TimelineEvent,
} from "./domain/types";
