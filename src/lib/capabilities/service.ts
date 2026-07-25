import { capabilityEngine } from "./engine";
import { getPlan, getAllPlans, getPlansByFamily } from "./plans";
import { getFeatureInfo, getAllFeatureIds, getFeaturesByCategory } from "./features";
import { getEffectiveLimit, checkLimit, getLimitsMap, getOverLimitFeatures } from "./limits";
import type { FeatureId } from "./constants";
import type {
  CapabilityCheck,
  PlanSummary,
  PlanComparison,
  UpgradeRecommendation,
  PlanDefinition,
  FeatureInfo,
  LimitCheck,
} from "./types";

export class CapabilityService {
  can(planCode: string, featureKey: string): CapabilityCheck {
    return capabilityEngine.can(planCode, featureKey);
  }

  cannot(planCode: string, featureKey: string): boolean {
    return capabilityEngine.cannot(planCode, featureKey);
  }

  limit(planCode: string, featureKey: string): number {
    return capabilityEngine.limit(planCode, featureKey);
  }

  remaining(planCode: string, featureKey: string, used: number): number {
    return capabilityEngine.remaining(planCode, featureKey, used);
  }

  used(planCode: string, featureKey: string, currentUsage: number): { used: number; limit: number; remaining: number } {
    return capabilityEngine.used(planCode, featureKey, currentUsage);
  }

  hasReachedLimit(planCode: string, featureKey: string, used: number): boolean {
    return capabilityEngine.hasReachedLimit(planCode, featureKey, used);
  }

  requiresUpgrade(planCode: string, featureKey: string, used: number): CapabilityCheck {
    return capabilityEngine.requiresUpgrade(planCode, featureKey, used);
  }

  missingFeatures(planCode: string): { id: FeatureId; label: string; upgradeTo?: string }[] {
    return capabilityEngine.missingFeatures(planCode);
  }

  planSummary(planCode: string): PlanSummary | null {
    return capabilityEngine.planSummary(planCode);
  }

  comparePlans(fromCode: string, toCode: string): PlanComparison | null {
    return capabilityEngine.comparePlans(fromCode, toCode);
  }

  recommendedUpgrade(context: { planCode: string; usage: Partial<Record<FeatureId, number>> }): UpgradeRecommendation | null {
    return capabilityEngine.recommendedUpgrade(context);
  }

  getPlan(code: string): PlanDefinition | undefined {
    return getPlan(code);
  }

  getAllPlans(): PlanDefinition[] {
    return getAllPlans();
  }

  getPlansByFamily(family: "creator" | "agency"): PlanDefinition[] {
    return getPlansByFamily(family);
  }

  getFeatureInfo(id: string): FeatureInfo {
    return getFeatureInfo(id);
  }

  getAllFeatureIds(): string[] {
    return getAllFeatureIds();
  }

  getFeaturesByCategory(category: Parameters<typeof getFeaturesByCategory>[0]): FeatureInfo[] {
    return getFeaturesByCategory(category);
  }

  getEffectiveLimit(planCode: string, featureKey: string): number {
    return getEffectiveLimit(planCode, featureKey);
  }

  checkLimit(planCode: string, featureKey: string, used: number): LimitCheck {
    return checkLimit(planCode, featureKey, used);
  }

  getLimitsMap(planCode: string, usage: Partial<Record<FeatureId, number>>): Record<string, LimitCheck> {
    return getLimitsMap(planCode, usage);
  }

  getOverLimitFeatures(planCode: string, usage: Partial<Record<FeatureId, number>>): LimitCheck[] {
    return getOverLimitFeatures(planCode, usage);
  }
}

export const capabilityService = new CapabilityService();
