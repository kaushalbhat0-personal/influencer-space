/**
 * Pricing Section — Data (RCCF-IMPLEMENTATION-71)
 *
 * Marketing consumes the RUNTIME pricing module (BillingPlan + registry
 * fallback). Server components fetch `ResolvedPlan[]` via the runtime layer and
 * pass them down; this module only provides the display math + feature-catalog
 * helpers. No duplicated plan lists, prices or bullets anywhere in the UI.
 */

import { getFeatureInfo, getAllFeatureIds } from "@/lib/capabilities";
import type { ResolvedPlan } from "@/modules/pricing/application/runtime";

export type PlanFamily = "creator" | "agency";

export interface PricingData {
  creator: ResolvedPlan[];
  partner: ResolvedPlan[];
  enterpriseCreator: ResolvedPlan | null;
  enterprisePartner: ResolvedPlan | null;
}

/** Effective price for a billing cycle (annual = annualPrice/12). */
export function getDisplayPrice(plan: ResolvedPlan, cycle: "monthly" | "yearly"): number | null {
  if (plan.price === null) return null;
  if (cycle === "yearly" && plan.annualPrice) return Math.round(plan.annualPrice / 12);
  return plan.price;
}

export function getAnnualSavings(plan: ResolvedPlan): number | null {
  if (plan.price === null || !plan.annualPrice) return null;
  const annualized = plan.price * 12;
  if (annualized <= 0) return null;
  return Math.round((1 - plan.annualPrice / annualized) * 100);
}

/** Trial framing — Launch plans are free trials, not "free forever". */
export function getTrialFraming(plan: ResolvedPlan): { title: string; subtitle: string } | null {
  if (plan.price !== 0 || plan.trialDays === undefined || plan.trialDays === null) return null;
  return {
    title: `${plan.trialDays}-Day Free Trial`,
    subtitle: "No credit card required. Upgrade anytime.",
  };
}

/** Recurring-revenue framing for partner plans (Phase 13). */
export const PARTNER_VALUE_POINTS = [
  "Earn recurring commission as your clients grow",
  "Manage every client website from one dashboard",
  "Your clients pay CreatorStore directly — you focus on delivery",
  "Scale with white-label, API access and higher commission tiers",
];

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
