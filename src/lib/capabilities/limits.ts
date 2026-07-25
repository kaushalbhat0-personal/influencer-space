import { UNLIMITED } from "./constants";
import type { FeatureId } from "./constants";
import type { LimitCheck } from "./types";
import { getPlan } from "./plans";

export function resolveLimitValue(value: number | boolean | string): number {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? UNLIMITED : 0;
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

export function getEffectiveLimit(planCode: string, featureKey: string): number {
  const plan = getPlan(planCode);
  if (!plan) return 0;
  const value = plan.features[featureKey];
  return resolveLimitValue(value);
}

export function isUnlimited(value: number): boolean {
  return value === UNLIMITED;
}

export function isDisabled(value: number): boolean {
  return value === 0;
}

export function isExceeded(used: number, limit: number): boolean {
  if (isUnlimited(limit)) return false;
  return used > limit;
}

export function hasRemaining(used: number, limit: number): boolean {
  if (isUnlimited(limit)) return true;
  return used < limit;
}

export function getRemaining(used: number, limit: number): number {
  if (isUnlimited(limit)) return Infinity;
  return Math.max(0, limit - used);
}

export function getUsagePercent(used: number, limit: number): number {
  if (isUnlimited(limit) || limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function checkLimit(
  planCode: string,
  featureKey: string,
  used: number,
): LimitCheck {
  const limit = getEffectiveLimit(planCode, featureKey);
  return {
    featureId: featureKey as FeatureId,
    planCode,
    limit,
    used,
    remaining: getRemaining(used, limit),
    isUnlimited: isUnlimited(limit),
    isExceeded: isExceeded(used, limit),
    usagePercent: getUsagePercent(used, limit),
  };
}

export function getLimitsMap(
  planCode: string,
  usage: Partial<Record<FeatureId, number>>,
): Record<string, LimitCheck> {
  const result: Record<string, LimitCheck> = {};
  for (const [key, used] of Object.entries(usage)) {
    result[key] = checkLimit(planCode, key, used ?? 0);
  }
  return result;
}

export function getOverLimitFeatures(
  planCode: string,
  usage: Partial<Record<FeatureId, number>>,
): LimitCheck[] {
  return Object.entries(usage)
    .map(([key, used]) => checkLimit(planCode, key, used ?? 0))
    .filter((l) => l.isExceeded);
}
