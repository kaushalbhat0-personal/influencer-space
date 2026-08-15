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
  "Scale with white-label branding and commission that grows with your client count",
];

export function getComparisonFeatures(): Array<{ key: string; description: string; valueType: string }> {
  return getAllFeatureIds().map((id) => {
    const info = getFeatureInfo(id);
    return { key: id, description: info.label, valueType: info.valueType };
  });
}

// ── RCCF-58/RCCF-59/RCCF-60.2 — marketing-truth presentation adapters ────────
// Creator storage is the canonical RCCF-59 `storage_mb` capability (20/100/300
// MB, Enterprise Custom) and IS enforced. Partner storage is NOT a real
// capability — Partner agencies have no storage accounting path and the
// config-only `storage_gb` values are NOT enforced — so Partner marketing does
// NOT advertise storage (RCCF-60.2). The table below is a presentation fallback
// for Creator plans only; never add Partner storage numbers here.

export const APPROVED_STORAGE: Record<string, string> = {
  creator_launch: "20 MB",
  creator_grow: "100 MB",
  creator_scale: "300 MB",
  creator_enterprise: "Custom",
};

/** Marketing-safe storage value for a plan. Creator plans render the approved
 *  MB decision; anything else (including all Partner plans) renders "—". */
export function getStorageDisplay(planCode: string): string {
  return APPROVED_STORAGE[planCode] ?? "—";
}

/**
 * Presentation-safe feature value. `storage_mb` (RCCF-59 canonical Creator
 * storage) renders as "<n> MB"; `storage_gb` (Partner/legacy) renders from the
 * approved MB table; every other feature renders its canonical value unchanged.
 */
export function getFeatureDisplayValue(
  planCode: string,
  featureId: string,
  value: number | boolean | string,
  _valueType: string,
): number | boolean | string {
  if (featureId === "storage_mb") return `${value} MB`;
  if (featureId === "storage_gb") return getStorageDisplay(planCode);
  return value;
}

// Family-appropriate comparison vocabulary (RCCF-58/60.2). The runtime feature
// map is shared across families, but creator-commerce and agency features must
// not be shown under the wrong tab — an Agency's plan does not govern its
// clients' products/orders, and Creators have no team/client management.
// Creators render `storage_mb`; Partner plans do NOT advertise storage
// (no real Partner storage capability — RCCF-60.2), so `storage_gb` is never
// shown on the Partner comparison either.
const CREATOR_EXCLUDED = new Set([
  "max_clients", "max_team_members", "agency_clients", "multiple_users",
  "white_label", "remove_branding", "automation", "bulk_publish", "multiple_brands",
  "storage_gb",
]);

const PARTNER_ALLOWED = new Set([
  "max_clients", "max_team_members", "white_label", "custom_domain",
  "analytics_basic", "analytics_advanced", "priority_support",
  "premium_themes",
]);

/** Feature ids shown in the comparison for a plan family (truthful vocabulary). */
export function getComparisonFeatureIds(family: PlanFamily): string[] {
  const all = getAllFeatureIds();
  if (family === "creator") return all.filter((id) => !CREATOR_EXCLUDED.has(id));
  return all.filter((id) => PARTNER_ALLOWED.has(id));
}

export function getFeatureLabel(feature: number | boolean | string, featureDef: { valueType: string }): string {
  if (featureDef.valueType === "boolean") return feature ? "✓" : "—";
  if (typeof feature === "number" && feature === -1) return "Unlimited";
  if (typeof feature === "number") return String(feature);
  return String(feature);
}
