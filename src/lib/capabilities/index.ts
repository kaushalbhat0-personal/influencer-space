export { capabilityEngine } from "./engine";
export type { CapabilityEngine } from "./engine";
export { capabilityService } from "./service";
export type { CapabilityService } from "./service";

export { getPlan, getAllPlans, getPlansByFamily } from "./plans";
export { getFeatureInfo, getAllFeatureIds, getFeaturesByCategory, FEATURE_CATALOG } from "./features";
export { getFeaturesByGroup, getFeatureGroups, groupForFeature, CAPABILITY_GROUP_LABELS, CAPABILITY_GROUPS } from "./features";
export type { CapabilityGroup } from "./features";
export { getEffectiveLimit, checkLimit, getLimitsMap, getOverLimitFeatures } from "./limits";

export { validatePlanCode, validateFeatureId, validateUsageContext, validatePlanTransition, validateUsageRequest, formatPlanName, formatFeatureLabel } from "./validation";
export { isLegacyPlan, resolvePlan } from "./plans";
export { toPlanSummary, formatFeatureComparison, formatUsageHint, comparisonToRows } from "./mapper";

export * from "./constants";
export type * from "./types";
export { entitlementService, EntitlementService } from "./entitlements";
export type { EntitlementCapabilityId, EntitlementResult } from "./entitlements";
export { capabilityRegistry, featureRegistry, CapabilityRegistry, FeatureRegistry } from "./registry";
export type { CapabilityId, CapabilityDefinition, FeatureDefinition } from "./registry";
