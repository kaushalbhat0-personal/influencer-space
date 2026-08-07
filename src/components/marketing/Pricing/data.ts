/**
 * Pricing Section — Data (RCCF-IMPLEMENTATION-70)
 *
 * Marketing consumes the Commerce Registry ONLY — no duplicated plan lists,
 * prices, features or bullets anywhere in the UI. Plan cards, comparison rows,
 * annual pricing and upgrade copy all derive from `src/config/commerce/plans.ts`
 * + the canonical capability catalog.
 */

import { getMarketingPlans, getEnterprisePlan, getPlanMonthlyPrice, getAnnualSavingsPercent, getUpgradeHighlights, type CommercePlanConfig } from "@/config/commerce/plans";
import { getFeatureInfo, getAllFeatureIds } from "@/lib/capabilities";

export type PlanFamily = "creator" | "agency";

export interface PlanWithMeta {
  plan: CommercePlanConfig;
  highlights: string[];
}

/** Standard comparison plans (hidden/enterprise excluded), registry order. */
export function getCreatorPlans(): PlanWithMeta[] {
  return getMarketingPlans("creator").map((p) => ({
    plan: p,
    highlights: p.marketingHighlights ?? [],
  }));
}

/** Partner (agency) plans — same registry, same rules. */
export function getAgencyPlans(): PlanWithMeta[] {
  return getMarketingPlans("partner").map((p) => ({
    plan: p,
    highlights: p.marketingHighlights ?? [],
  }));
}

/** Plans that appear in the standard comparison matrix (no enterprise, no hidden). */
export function getComparisonPlans(family: PlanFamily): CommercePlanConfig[] {
  return getMarketingPlans(family === "agency" ? "partner" : "creator");
}

/** Enterprise plan for a family — rendered separately under Enterprise Solutions. */
export function getEnterprisePlanFor(family: PlanFamily): CommercePlanConfig | undefined {
  return getEnterprisePlan(family === "agency" ? "partner" : "creator");
}

/** Effective price for a billing cycle (monthly × 12 vs annualPrice). */
export function getDisplayPrice(plan: CommercePlanConfig, cycle: "monthly" | "yearly"): number | null {
  return getPlanMonthlyPrice(plan, cycle);
}

export function getAnnualSavings(plan: CommercePlanConfig): number | null {
  return getAnnualSavingsPercent(plan);
}

/** Upgrade copy: exactly what the next tier adds. */
export function getUpgradeCopy(planCode: string): string[] {
  return getUpgradeHighlights(planCode);
}

export function getComparisonFeatures(): Array<{ key: string; description: string; valueType: string }> {
  return getAllFeatureIds().map((id) => {
    const info = getFeatureInfo(id);
    return { key: id, description: info.label, valueType: info.valueType };
  });
}

export function getFeatureLabel(feature: number | boolean | string, featureDef: { valueType: string }): string {
  if (featureDef.valueType === "boolean") return feature ? "✓" : "—";
  if (typeof feature === "number" && feature === -1) return "Unlimited";
  if (typeof feature === "number") return String(feature);
  return String(feature);
}

/** Trial framing — Launch plans are 15-day free trials, not "free forever". */
export function getTrialFraming(plan: CommercePlanConfig): { title: string; subtitle: string } | null {
  if (plan.price !== 0 || plan.trialDays === undefined) return null;
  return {
    title: `${plan.trialDays}-Day Free Trial`,
    subtitle: "No credit card required. Upgrade anytime.",
  };
}

/** Recurring-revenue framing for partner plans (Phase 13). */
export const PARTNER_VALUE_POINTS = [
  "Earn recurring commission as your clients grow",
  "Manage unlimited client websites from one dashboard",
  "Your clients pay CreatorStore directly — you focus on delivery",
  "Scale with white-label, bulk operations and API automation",
];
