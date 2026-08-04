/**
 * Pricing Section — Data
 *
 * All pricing data comes from BillingPlan catalog.
 * CTA routing is driven by plan.ctaType metadata.
 * No hardcoded prices, features, or routes.
 */

import { getPlansByFamily, getFeatureInfo, getAllFeatureIds, DEFAULT_CURRENCY } from "@/lib/capabilities";
import { entitlement } from "@/modules/billing/application/entitlements";
import { getCreatorCommercePlans, getCommercePlan } from "@/config/commerce/plans";
import type { PlanDefinition } from "@/lib/capabilities";

export interface PlanWithMeta {
  plan: PlanDefinition;
  highlights: string[];
}

/**
 * IMPLEMENTATION-34: creator pricing derives from the canonical commerce
 * config (Launch/Grow/Scale/Enterprise). No duplicated pricing anywhere.
 */
export function getCreatorPlans(): PlanWithMeta[] {
  const catalog = getPlanDefinitionsByCode();
  return getCreatorCommercePlans()
    .filter((p) => catalog[p.code])
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
    .map((p) => ({ plan: catalog[p.code]!, highlights: getHighlights(p.code) }));
}

function getPlanDefinitionsByCode(): Record<string, PlanDefinition> {
  const out: Record<string, PlanDefinition> = {};
  for (const plan of getPlansByFamily("creator")) {
    out[plan.code] = plan;
  }
  return out;
}

export function getAgencyPlans(): PlanWithMeta[] {
  return getPlansByFamily("agency")
    .sort((a, b) => a.price - b.price)
    .map((plan) => ({ plan, highlights: getHighlights(plan.code) }));
}

export function getEnterprisePlan(): Partial<PlanDefinition> {
  const commerce = getCommercePlan("creator_enterprise");
  return {
    code: "creator_enterprise",
    family: "creator",
    name: commerce?.name ?? "Enterprise",
    description: commerce?.description ?? "Custom requirements and dedicated support.",
    targetAudience: "Growing creators and brands",
    price: 0,
    currency: DEFAULT_CURRENCY,
    cycle: "monthly",
    ctaLabel: commerce?.ctaLabel ?? "Contact Sales",
    ctaType: "contact",
    features: {},
  };
}

export function getEnterpriseHighlights(): string[] {
  return ["Unlimited clients", "Custom integrations", "Dedicated support", "SLA guarantee", "SSO + Audit logs"];
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

function getHighlights(planCode: string): string[] {
  const h: string[] = [];
  const p = entitlement.limit(planCode, "max_products");
  if (p === -1) h.push("Unlimited products");
  else h.push(`${p} products`);

  if (entitlement.has(planCode, "custom_domain")) h.push("Custom domain");
  if (entitlement.has(planCode, "custom_branding")) h.push("Remove branding");
  if (entitlement.has(planCode, "analytics_advanced")) h.push("Advanced analytics");
  if (entitlement.has(planCode, "ai_automation")) h.push("AI automation");
  if (entitlement.has(planCode, "priority_support")) h.push("Priority support");
  const c = entitlement.limit(planCode, "max_clients");
  if (c > 0) h.push(`${c} clients`);
  if (entitlement.has(planCode, "white_label")) h.push("White-label");
  return h.slice(0, 5);
}
