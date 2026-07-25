import type { FeatureId } from "./constants";
import { UPGRADE_PATHS } from "./constants";
import { getPlan } from "./plans";
import { getFeatureInfo } from "./features";
import { getEffectiveLimit, getRemaining, getOverLimitFeatures, resolveLimitValue } from "./limits";
import type {
  CapabilityCheck,
  PlanSummary,
  PlanComparison,
  UpgradeRecommendation,
} from "./types";

export class CapabilityEngine {
  can(planCode: string, featureKey: string): CapabilityCheck {
    const plan = getPlan(planCode);
    if (!plan) return { allowed: false, reason: `Unknown plan: ${planCode}` };

    const value = plan.features[featureKey];
    if (value === undefined) return { allowed: false, reason: `Feature not found: ${featureKey}` };

    if (typeof value === "boolean") return { allowed: value };
    if (typeof value === "number") return { allowed: value === -1 || value > 0, limit: value };

    return { allowed: false, reason: "Unknown feature value type" };
  }

  cannot(planCode: string, featureKey: string): boolean {
    return !this.can(planCode, featureKey).allowed;
  }

  limit(planCode: string, featureKey: string): number {
    return getEffectiveLimit(planCode, featureKey);
  }

  remaining(planCode: string, featureKey: string, used: number): number {
    return getRemaining(used, this.limit(planCode, featureKey));
  }

  used(planCode: string, featureKey: string, currentUsage: number): { used: number; limit: number; remaining: number } {
    const lim = this.limit(planCode, featureKey);
    return { used: currentUsage, limit: lim, remaining: getRemaining(currentUsage, lim) };
  }

  hasReachedLimit(planCode: string, featureKey: string, used: number): boolean {
    const lim = this.limit(planCode, featureKey);
    if (lim === -1) return false;
    return used >= lim;
  }

  requiresUpgrade(planCode: string, featureKey: string, used: number): CapabilityCheck {
    const plan = getPlan(planCode);
    if (!plan) return { allowed: false, reason: `Unknown plan: ${planCode}` };

    const value = plan.features[featureKey];
    if (value === undefined) return { allowed: true };

    if (typeof value === "boolean") {
      if (value) return { allowed: true };
    const upgrade = this.findUpgradeForFeature(planCode, featureKey);
    return {
      allowed: false,
      reason: `Feature not available on ${plan.name}`,
      suggestedUpgrade: upgrade,
    };
    }

    if (typeof value === "number") {
      const lim = value;
      if (lim === -1) return { allowed: true };
      if (used < lim) return { allowed: true, remaining: lim - used, limit: lim };
      const upgrade = this.findUpgradeForFeature(planCode, featureKey);
      return {
        allowed: false,
        used,
        limit: lim,
        remaining: 0,
        reason: `Limit reached: ${used}/${lim}`,
        suggestedUpgrade: upgrade,
      };
    }

    return { allowed: false, reason: "Unknown feature value type" };
  }

  missingFeatures(planCode: string): { id: FeatureId; label: string; upgradeTo?: string }[] {
    const plan = getPlan(planCode);
    if (!plan) return [];

    const missing: { id: FeatureId; label: string; upgradeTo?: string }[] = [];

    for (const [key, value] of Object.entries(plan.features)) {
      const isAvailable = typeof value === "boolean" ? value : (typeof value === "number" ? value === -1 || value > 0 : false);
      if (!isAvailable) {
        const info = getFeatureInfo(key);
        const upgrade = this.findUpgradeForFeature(planCode, key);
        missing.push({ id: key as FeatureId, label: info.label, upgradeTo: upgrade });
      }
    }

    return missing;
  }

  planSummary(planCode: string): PlanSummary | null {
    const plan = getPlan(planCode);
    if (!plan) return null;

    const entries = Object.entries(plan.features);
    const enabledCount = entries.filter(([, v]) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v === -1 || v > 0;
      return false;
    }).length;

    return {
      code: plan.code,
      name: plan.name,
      family: plan.family,
      price: plan.price,
      currency: plan.currency,
      features: { ...plan.features },
      featureCount: entries.length,
      enabledFeatureCount: enabledCount,
    };
  }

  comparePlans(fromCode: string, toCode: string): PlanComparison | null {
    const from = getPlan(fromCode);
    const to = getPlan(toCode);
    if (!from || !to) return null;

    const addedFeatures: PlanComparison["addedFeatures"] = [];
    const upgradedLimits: PlanComparison["upgradedLimits"] = [];

    for (const [key, toVal] of Object.entries(to.features)) {
      const fromVal = from.features[key];
      const info = getFeatureInfo(key);

      const fromEffective = resolveLimitValue(fromVal);
      const toEffective = resolveLimitValue(toVal);

      if (info.valueType === "boolean") {
        if (!fromVal && toVal) {
          addedFeatures.push({ id: key as FeatureId, label: info.label });
        }
      } else {
        if (fromEffective !== toEffective && (toEffective > fromEffective || toEffective === -1)) {
          upgradedLimits.push({
            id: key as FeatureId,
            label: info.label,
            from: fromEffective,
            to: toEffective,
          });
        }
      }
    }

    return {
      from: fromCode,
      to: toCode,
      addedFeatures,
      upgradedLimits,
      priceDifference: to.price - from.price,
      recommendation: this.buildComparisonRecommendation(from, to, addedFeatures, upgradedLimits),
    };
  }

  recommendedUpgrade(context: { planCode: string; usage: Partial<Record<FeatureId, number>> }): UpgradeRecommendation | null {
    const { planCode, usage } = context;
    const paths = UPGRADE_PATHS[planCode];
    if (!paths) return null;

    const overLimit = getOverLimitFeatures(planCode, usage);
    if (overLimit.length === 0 || paths.length === 0) return null;

    for (const targetCode of paths) {
      const target = getPlan(targetCode);
      if (!target) continue;

      const resolved: UpgradeRecommendation["triggeredBy"] = [];
      let allResolved = true;

      for (const ol of overLimit) {
        const targetLimit = resolveLimitValue(target.features[ol.featureId] ?? 0);
        if (targetLimit === -1 || targetLimit > ol.limit) {
          resolved.push({ feature: ol.featureId, used: ol.used, limit: ol.limit });
        } else {
          allResolved = false;
        }
      }

      if (allResolved && resolved.length > 0) {
        const currentName = getPlan(planCode)?.name ?? planCode;
        const featureLabels = resolved.map((r) => {
          const info = getFeatureInfo(r.feature);
          return `${info.label} (${r.used}/${r.limit})`;
        });

        return {
          currentPlan: planCode,
          targetPlan: targetCode,
          reason: `Upgrade from ${currentName} to ${target.name} to increase limits: ${featureLabels.join(", ")}.`,
          priority: resolved.some((r) => r.used >= r.limit) ? "high" : "medium",
          triggeredBy: resolved,
        };
      }
    }

    return null;
  }

  private findUpgradeForFeature(planCode: string, featureKey: string): string | undefined {
    const paths = UPGRADE_PATHS[planCode];
    for (const targetCode of paths) {
      const target = getPlan(targetCode);
      if (target) {
        const val = target.features[featureKey];
        const effective = resolveLimitValue(val);
        if (effective === -1 || effective > 0) return targetCode;
      }
    }
    return undefined;
  }

  private buildComparisonRecommendation(
    from: { name: string; price: number },
    to: { name: string; price: number },
    addedFeatures: PlanComparison["addedFeatures"],
    upgradedLimits: PlanComparison["upgradedLimits"],
  ): string {
    const parts: string[] = [];
    if (addedFeatures.length > 0) {
      const names = addedFeatures.slice(0, 3).map((f) => f.label);
      if (addedFeatures.length > 3) names.push(`+${addedFeatures.length - 3} more`);
      parts.push(`Unlock ${names.join(", ")}`);
    }
    if (upgradedLimits.length > 0) {
      const names = upgradedLimits.slice(0, 2).map((f) => f.label);
      if (upgradedLimits.length > 2) names.push(`+${upgradedLimits.length - 2} more`);
      parts.push(`Increase ${names.join(", ")}`);
    }
    const priceDiff = to.price - from.price;
    if (priceDiff > 0) parts.push(`$${priceDiff}/mo`);
    return parts.join(" · ");
  }
}

export const capabilityEngine = new CapabilityEngine();
