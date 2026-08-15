import type { PlanDefinition } from "./types";
import { DISABLED } from "./constants";
import { COMMERCE_PLANS, featuresForPlan, LEGACY_TO_CANONICAL } from "@/config/commerce/plans";

const BASE_FEATURES: Record<string, number | boolean | string> = {
  max_products: 5,
  max_gallery: 10,
  max_messages: 100,
  max_orders: 50,
  max_websites: 1,
  max_team_members: 1,
  max_clients: DISABLED,
  max_api_calls: 1000,
  custom_domain: false,
  custom_branding: false,
  remove_branding: false,
  analytics_basic: true,
  analytics_advanced: false,
  seo: true,
  premium_themes: false,
  ai_automation: false,
  export_data: true,
  priority_support: false,
  multiple_users: false,
  api_access: false,
  webhooks: false,
  live_social_sync: false,
  white_label: false,
  basic_builder: true,
  advanced_builder: false,
  marketplace_access: false,
  template_library: true,
  navigation_editor: true,
  media_storage: true,
  automation: false,
  multiple_brands: false,
  agency_clients: false,
  bulk_publish: false,
  custom_components: false,
  api_integrations: false,
};

const CTA_BY_TYPE: Record<string, string> = { signup: "Start Free", checkout: "Upgrade", contact: "Contact Sales" };

const plans: PlanDefinition[] = COMMERCE_PLANS.map((config, i) => ({
  code: config.code,
  family: (config.family === "partner" ? "agency" : "creator") as "creator" | "agency",
  name: config.name,
  description: config.description,
  targetAudience: config.name,
  price: config.price ?? 0,
  currency: config.currency,
  cycle: config.cycle,
  ctaLabel: config.ctaLabel ?? CTA_BY_TYPE[config.ctaType],
  ctaType: config.ctaType,
  features: { ...BASE_FEATURES, ...featuresForPlan(config.code), ...(config.featureOverrides ?? {}) },
  recommended: config.recommended ?? false,
  badge: config.badge ?? "",
  hidden: config.hidden ?? false,
  legacyAliases: [],
  sortOrder: i + 1,
}));

const planMap = new Map<string, PlanDefinition>();
for (const plan of plans) {
  planMap.set(plan.code, plan);
}
for (const plan of plans) {
  if (plan.legacyAliases) {
    for (const alias of plan.legacyAliases) {
      planMap.set(alias, plan);
    }
  }
}

// RCCF-29: Super Admin runtime overrides (persisted BillingPlan.runtimeConfig),
// applied on top of the static registry so enforcement honors persisted
// commercial configuration. Kept prisma-free — populated by the billing
// runtime-config loader (src/modules/billing/application/runtime-config-loader.ts).
const runtimeFeatureOverrides = new Map<string, Record<string, number | boolean | string>>();

/** Apply persisted runtime feature/limit overrides for a plan code. */
export function applyRuntimeFeatureOverrides(code: string, overrides: Record<string, number | boolean | string>): void {
  runtimeFeatureOverrides.set(code, overrides);
}

/** Test/refresh helper: clear all runtime overrides. */
export function resetRuntimeFeatureOverrides(): void {
  runtimeFeatureOverrides.clear();
}

export function getPlan(code: string): PlanDefinition | undefined {
  if (!code) return undefined;
  const canonical = LEGACY_TO_CANONICAL[code] ?? code;
  const base = planMap.get(canonical);
  if (!base) return undefined;
  const runtime = runtimeFeatureOverrides.get(canonical);
  if (!runtime || Object.keys(runtime).length === 0) return base;
  return { ...base, features: { ...base.features, ...runtime } };
}

export function getAllPlans(): PlanDefinition[] {
  const sorted = [...plans].sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  return sorted;
}

export function getPlansByFamily(family: "creator" | "agency"): PlanDefinition[] {
  return getAllPlans().filter((p) => p.family === family);
}

export function getPlanOrThrow(code: string): PlanDefinition {
  const plan = getPlan(code);
  if (!plan) throw new Error(`Unknown plan code: ${code}`);
  return plan;
}

export function isLegacyPlan(code: string): boolean {
  return Object.prototype.hasOwnProperty.call(LEGACY_TO_CANONICAL, code);
}

export function resolvePlan(code: string): PlanDefinition | undefined {
  return getPlan(code);
}
