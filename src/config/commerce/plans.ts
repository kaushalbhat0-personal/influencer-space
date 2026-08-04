/**
 * Canonical Commerce Configuration — IMPLEMENTATION-34.
 *
 * THE single source of truth for product pricing, plan→capability grants and
 * Razorpay plan mapping. Pricing page, checkout, webhooks and CapabilityService
 * all derive from this file — never hardcode a price, a Razorpay plan id, or a
 * capability check anywhere else.
 *
 * Principle: PAYMENTS NEVER UNLOCK FEATURES. Payments produce Billing Events →
 * Entitlements → Capabilities → Feature access. This file defines which
 * capabilities a plan GRANTS; consumption happens through CapabilityService.
 */

export type CommerceCapability =
  | "basic_builder"
  | "basic_themes"
  | "creator_subdomain"
  | "premium_themes"
  | "custom_domain"
  | "advanced_builder"
  | "ai_generation"
  | "advanced_ai"
  | "social_integrations"
  | "api_access"
  | "api_integrations"
  | "white_label"
  | "brand_removal"
  | "advanced_analytics"
  | "priority_support"
  | "storage"
  | "ai_credits" // future add-on
  | "storage_pack" // future add-on
  | "theme_packs"; // future add-on

export interface CommercePlanConfig {
  code: string;
  name: string;
  description: string;
  price: number | null; // null = manual sales (enterprise)
  currency: string;
  cycle: "monthly" | "yearly";
  /** Razorpay plan id — configuration-only. Code references internal codes. */
  razorpayPlanId: string | null;
  /** Manual sales (no public checkout). */
  manual: boolean;
  capabilities: CommerceCapability[];
  recommended?: boolean;
  badge?: string;
  ctaType: "signup" | "checkout" | "contact";
  ctaLabel: string;
}

export const COMMERCE_PLANS: CommercePlanConfig[] = [
  {
    code: "creator_launch",
    name: "Creator Launch",
    description: "Start your creator storefront for free.",
    price: 0,
    currency: "INR",
    cycle: "monthly",
    razorpayPlanId: null,
    manual: false,
    capabilities: ["basic_builder", "basic_themes", "creator_subdomain"],
    ctaType: "signup",
    ctaLabel: "Start Free",
  },
  {
    code: "creator_grow",
    name: "Creator Grow",
    description: "Premium themes, custom domain and AI-powered creation.",
    price: 699,
    currency: "INR",
    cycle: "monthly",
    razorpayPlanId: "plan_TLTGQBU1EXkseF",
    manual: false,
    recommended: true,
    badge: "Most Popular",
    capabilities: [
      "premium_themes",
      "custom_domain",
      "advanced_builder",
      "ai_generation",
      "social_integrations",
    ],
    ctaType: "checkout",
    ctaLabel: "Upgrade to Grow",
  },
  {
    code: "creator_scale",
    name: "Creator Scale",
    description: "Maximum growth: advanced AI, API access and white label.",
    price: 1995,
    currency: "INR",
    cycle: "monthly",
    razorpayPlanId: "plan_TLTH45wQlPdW7v",
    manual: false,
    capabilities: [
      "premium_themes",
      "custom_domain",
      "advanced_builder",
      "advanced_ai",
      "api_access",
      "api_integrations",
      "white_label",
      "brand_removal",
      "advanced_analytics",
      "priority_support",
    ],
    ctaType: "checkout",
    ctaLabel: "Upgrade to Scale",
  },
  {
    code: "creator_enterprise",
    name: "Creator Enterprise",
    description: "Custom requirements, dedicated support, manual sales.",
    price: null,
    currency: "INR",
    cycle: "monthly",
    razorpayPlanId: null,
    manual: true,
    capabilities: [
      "premium_themes",
      "custom_domain",
      "advanced_builder",
      "advanced_ai",
      "api_access",
      "api_integrations",
      "white_label",
      "brand_removal",
      "advanced_analytics",
      "priority_support",
      "storage",
    ],
    ctaType: "contact",
    ctaLabel: "Contact Sales",
  },
];

export const COMMERCE_PLAN_BY_CODE: Record<string, CommercePlanConfig> = Object.fromEntries(
  COMMERCE_PLANS.map((p) => [p.code, p]),
);

/** Legacy creator plan codes → canonical commerce codes (backward compat). */
export const LEGACY_TO_CANONICAL: Record<string, string> = {
  creator_free: "creator_launch",
  creator_pro: "creator_grow",
  creator_elite: "creator_scale",
};

/** Maps a commerce capability to an entitlement feature value (existing catalog). */
export const COMMERCE_CAPABILITY_TO_FEATURE: Record<
  CommerceCapability,
  { feature: string; value: number | boolean }
> = {
  basic_builder: { feature: "basic_builder", value: true },
  basic_themes: { feature: "template_library", value: true },
  creator_subdomain: { feature: "max_websites", value: 1 },
  premium_themes: { feature: "premium_themes", value: true },
  custom_domain: { feature: "custom_domain", value: true },
  advanced_builder: { feature: "advanced_builder", value: true },
  ai_generation: { feature: "ai_automation", value: true },
  advanced_ai: { feature: "ai_automation", value: true },
  social_integrations: { feature: "api_integrations", value: true },
  api_access: { feature: "api_access", value: true },
  api_integrations: { feature: "api_integrations", value: true },
  white_label: { feature: "white_label", value: true },
  brand_removal: { feature: "remove_branding", value: true },
  advanced_analytics: { feature: "analytics_advanced", value: true },
  priority_support: { feature: "priority_support", value: true },
  storage: { feature: "storage_gb", value: 10 },
  ai_credits: { feature: "ai_automation", value: true },
  storage_pack: { feature: "storage_gb", value: -1 },
  theme_packs: { feature: "premium_themes", value: true },
};

export function getCommercePlan(code: string): CommercePlanConfig | undefined {
  return COMMERCE_PLAN_BY_CODE[code];
}

export function getCreatorCommercePlans(): CommercePlanConfig[] {
  return COMMERCE_PLANS;
}

/** Razorpay plan id for an internal plan code (config-only mapping). */
export function razorpayPlanIdFor(code: string | null | undefined): string | null {
  if (!code) return null;
  return getCommercePlan(code)?.razorpayPlanId ?? null;
}

export function capabilitiesForPlan(code: string | null | undefined): CommerceCapability[] {
  if (!code) return [];
  const canonical = LEGACY_TO_CANONICAL[code] ?? code;
  return getCommercePlan(canonical)?.capabilities ?? [];
}

export function isManualPlan(code: string | null | undefined): boolean {
  if (!code) return false;
  return getCommercePlan(code)?.manual ?? false;
}

/** Feature map derived from the capability matrix (used by CapabilityService). */
export function featuresForPlan(code: string): Record<string, number | boolean> {
  const out: Record<string, number | boolean> = {};
  for (const cap of capabilitiesForPlan(code)) {
    const mapping = COMMERCE_CAPABILITY_TO_FEATURE[cap];
    if (mapping) out[mapping.feature] = mapping.value;
  }
  return out;
}
