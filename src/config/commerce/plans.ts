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
  family: "creator" | "partner";
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
    description: "Get your storefront online and start selling — free, no credit card needed.",
    family: "creator",
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
    description: "Sell more with a custom domain, premium themes and AI-assisted creation.",
    family: "creator",
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
    description: "Run your creator business at full scale with advanced AI, API access and a brand you own.",
    family: "creator",
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
    description: "Custom requirements and dedicated support for teams and brands.",
    family: "creator",
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
  {
    code: "partner_free",
    name: "Partner Free",
    description: "Manage your first clients and explore the partner workspace — free.",
    family: "partner",
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
    code: "partner_solo",
    name: "Solo Partner",
    description: "Run client projects with confidence: custom domains, premium themes and AI help.",
    family: "partner",
    price: 1499,
    currency: "INR",
    cycle: "monthly",
    razorpayPlanId: "plan_solo",
    manual: false,
    recommended: true,
    badge: "Recommended",
    capabilities: [
      "premium_themes",
      "custom_domain",
      "advanced_builder",
      "ai_generation",
      "social_integrations",
    ],
    ctaType: "checkout",
    ctaLabel: "Upgrade to Solo",
  },
  {
    code: "partner_growth",
    name: "Partner Growth",
    description: "Grow your creator portfolio with advanced AI, analytics and API integrations.",
    family: "partner",
    price: 4999,
    currency: "INR",
    cycle: "monthly",
    razorpayPlanId: "plan_growth",
    manual: false,
    capabilities: [
      "premium_themes",
      "custom_domain",
      "advanced_builder",
      "advanced_ai",
      "api_access",
      "api_integrations",
      "advanced_analytics",
    ],
    ctaType: "checkout",
    ctaLabel: "Upgrade to Growth",
  },
  {
    code: "partner_scale",
    name: "Partner Scale",
    description: "Scale many creators under your own brand with white-label and priority support.",
    family: "partner",
    price: 9999,
    currency: "INR",
    cycle: "monthly",
    razorpayPlanId: "plan_scale",
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
    code: "partner_enterprise",
    name: "Partner Enterprise",
    description: "Custom requirements for enterprise partner programs.",
    family: "partner",
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
  agency_free: "partner_free",
  agency_studio: "partner_solo",
  agency_agency: "partner_growth",
  agency_growth: "partner_scale",
  agency_starter: "partner_solo",
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
  return COMMERCE_PLANS.filter((p) => p.family === "creator");
}

/** Partner plans (Phase 3) — canonical partner pricing. */
export function getPartnerCommercePlans(): CommercePlanConfig[] {
  return COMMERCE_PLANS.filter((p) => p.family === "partner");
}

/**
 * IMPLEMENTATION-42 Phase 5: agency creator restriction.
 * A creator managed by a partner/agency (AgencyTenant) cannot be on Creator
 * Launch (Free) — the minimum is Creator Grow. This is the single canonical
 * rule; every surface (checkout, billing, provisioning, admin, super-admin,
 * CapabilityService) enforces it server-side.
 */
export const MIN_PLAN_FOR_AGENCY_CREATORS = "creator_grow";

export function isAgencyRestrictedPlan(code: string | null | undefined): boolean {
  if (!code) return false;
  const canonical = LEGACY_TO_CANONICAL[code] ?? code;
  if (canonical === "creator_launch") return true;
  const order: Record<string, number> = { creator_launch: 0, creator_grow: 1, creator_scale: 2, creator_enterprise: 3 };
  const canonicalRank = order[canonical];
  const minRank = order[MIN_PLAN_FOR_AGENCY_CREATORS];
  if (canonicalRank === undefined || minRank === undefined) return false;
  return canonicalRank < minRank;
}

/** Resolve the minimum eligible plan code for an agency-managed creator. */
export function minEligiblePlanForAgencyCreator(code: string | null | undefined): string {
  const canonical = code ? LEGACY_TO_CANONICAL[code] ?? code : "creator_launch";
  if (!isAgencyRestrictedPlan(canonical)) return canonical;
  return MIN_PLAN_FOR_AGENCY_CREATORS;
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
