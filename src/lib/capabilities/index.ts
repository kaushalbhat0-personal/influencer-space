export { capabilityEngine } from "./engine";
export type { CapabilityEngine } from "./engine";
export { capabilityService } from "./service";
export type { CapabilityService } from "./service";

export { getPlan, getAllPlans, getPlansByFamily } from "./plans";
export { getFeatureInfo, getAllFeatureIds, getFeaturesByCategory, FEATURE_CATALOG } from "./features";
export { getEffectiveLimit, checkLimit, getLimitsMap, getOverLimitFeatures } from "./limits";

export { validatePlanCode, validateFeatureId, validateUsageContext, validatePlanTransition, validateUsageRequest, formatPlanName, formatFeatureLabel } from "./validation";
export { isLegacyPlan, resolvePlan } from "./plans";
export { toPlanSummary, formatFeatureComparison, formatUsageHint, comparisonToRows } from "./mapper";

export * from "./constants";
export type * from "./types";
