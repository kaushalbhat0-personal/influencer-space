/**
 * Pricing Section — Data
 *
 * All pricing data comes from BillingPlan catalog.
 * CTA routing is driven by plan.ctaType metadata.
 * No hardcoded prices, features, or routes.
 */

import { getPlansByFamily, getFeatureInfo, getAllFeatureIds, DEFAULT_CURRENCY } from "@/lib/capabilities";
import { entitlement } from "@/modules/billing/application/entitlements";
import type { PlanDefinition } from "@/lib/capabilities";

export interface PlanWithMeta {
  plan: PlanDefinition;
  highlights: string[];
}

export function getCreatorPlans(): PlanWithMeta[] {
  return getPlansByFamily("creator")
    .sort((a, b) => a.price - b.price)
    .map((plan) => ({ plan, highlights: getHighlights(plan.code) }));
}

export function getAgencyPlans(): PlanWithMeta[] {
  return getPlansByFamily("agency")
    .sort((a, b) => a.price - b.price)
    .map((plan) => ({ plan, highlights: getHighlights(plan.code) }));
}

export function getEnterprisePlan(): Partial<PlanDefinition> {
  return {
    code: "agency_enterprise",
    family: "agency",
    name: "Enterprise",
    description: "For large agencies with custom requirements.",
    targetAudience: "Large agencies",
    price: 0,
    currency: DEFAULT_CURRENCY,
    cycle: "monthly",
    ctaLabel: "Contact Sales",
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
