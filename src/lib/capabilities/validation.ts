import { PLAN_CODES, FEATURE_IDS } from "./constants";
import type { FeatureId } from "./constants";
import { getPlan } from "./plans";
import { getFeatureInfo } from "./features";

export function validatePlanCode(code: string): boolean {
  return (PLAN_CODES as readonly string[]).includes(code);
}

export function validateFeatureId(id: string): id is FeatureId {
  return (Object.values(FEATURE_IDS) as string[]).includes(id);
}

export function validateUsageContext(context: { planCode: string; usage?: Record<string, number> }): string[] {
  const errors: string[] = [];
  if (!validatePlanCode(context.planCode)) {
    errors.push(`Invalid plan code: ${context.planCode}`);
  }
  if (context.usage) {
    for (const [key] of Object.entries(context.usage)) {
      if (!validateFeatureId(key)) {
        errors.push(`Invalid feature ID in usage: ${key}`);
      }
    }
  }
  return errors;
}

export function validatePlanTransition(fromCode: string, toCode: string): string[] {
  const errors: string[] = [];
  if (!validatePlanCode(fromCode)) errors.push(`Invalid source plan: ${fromCode}`);
  if (!validatePlanCode(toCode)) errors.push(`Invalid target plan: ${toCode}`);
  if (errors.length > 0) return errors;

  const from = getPlan(fromCode);
  const to = getPlan(toCode);
  if (from && to && from.family !== to.family) {
    errors.push(`Cannot switch between ${from.family} and ${to.family} plans`);
  }
  if (fromCode === toCode) {
    errors.push("Source and target plans are the same");
  }
  return errors;
}

export function validateUsageRequest(
  planCode: string,
  featureKey: string,
  used: number,
): string[] {
  const errors: string[] = [];
  if (!validatePlanCode(planCode)) errors.push(`Invalid plan code: ${planCode}`);
  if (!validateFeatureId(featureKey)) errors.push(`Invalid feature ID: ${featureKey}`);
  if (used < 0) errors.push("Usage cannot be negative");
  return errors;
}

export function formatPlanName(code: string): string {
  const plan = getPlan(code);
  if (plan) return plan.name;
  return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatFeatureLabel(id: string): string {
  const info = getFeatureInfo(id);
  return info.label;
}
