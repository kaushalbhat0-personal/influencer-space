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
  | "webhooks"
  | "live_social_sync"
  | "white_label"
  | "brand_removal"
  | "advanced_analytics"
  | "priority_support"
  | "storage"
  | "ai_credits" // future add-on
  | "storage_pack" // future add-on
  | "theme_packs" // future add-on
  // RCCF-LAUNCH-POLISH-06: granular theme capabilities (single authority —
  // the storefront resolves every visual layer through these, never raw plans).
  | "theme_background_solid"
  | "theme_background_gradient"
  | "theme_background_image"
  | "theme_background_video"
  | "theme_background_animation"
  | "theme_effects_particles"
  | "theme_effects_glow"
  | "theme_effects_noise"
  | "theme_effects_blur"
  | "theme_effects_custom";

export type CommerceCycle = "monthly" | "yearly";

export interface CommercePlanConfig {
  code: string;
  name: string;
  description: string;
  family: "creator" | "partner";
  price: number | null;
  currency: string;
  cycle: CommerceCycle;
  /**
   * RCCF-73 — the billing FORM this plan charges with.
   *  - "subscription" (default): recurring Razorpay subscription contract
   *    (Creator Growth/Scale — unchanged).
   *  - "one_time": a single Razorpay ORDER at the DB-authoritative price.
   *    No renewal, no annual variant, no provider subscription contract is
   *    ever created or provisioned for these plans (Partner Solo/Scale).
   */
  billingForm?: "one_time";
  razorpayPlanId: string | null;
  manual: boolean;
  capabilities: CommerceCapability[];
  recommended?: boolean;
  badge?: string;
  ctaType: "signup" | "checkout" | "contact";
  ctaLabel: string;
  /** Human-readable marketing features for pricing/comparison pages. */
  marketingFeatures?: string[];
  /** Rich capability labels mapped to categories for comparison tables. */
  comparisonGroups?: Record<string, string[]>;
  /** Sort order on pricing pages (lower = first). */
  sortOrder?: number;
  /** Hidden from pricing page if true. */
  hidden?: boolean;
  /** Annual pricing (future). */
  annualPrice?: number | null;

  // ── RCCF-IMPLEMENTATION-70: registry-driven marketing surface ──────────────
  /** Value-focused pitch used on the pricing card (backed by real capabilities). */
  marketingDescription?: string;
  /** Who this plan is for. */
  targetAudience?: string;
  /** Curated marketing highlights — every item maps to a real capability/module. */
  marketingHighlights?: string[];
  /** Order inside the pricing comparison (lower = leftmost). */
  comparisonOrder?: number;
  /** Free trial length in days (Launch plans). */
  trialDays?: number;
  /** Marks the "Most Popular" tier. */
  popular?: boolean;
  /** Marks the "Best Value" tier. */
  bestValue?: boolean;
  /** Enterprise plan — never shown in the standard comparison, only under Enterprise Solutions. */
  enterprise?: boolean;
  /** Per-plan numeric/boolean limit overrides merged over the base feature map (RCCF-IMPLEMENTATION-70). */
  featureOverrides?: Record<string, number | boolean | string>;
}

/** Human-readable labels for capability keys — used by pricing & comparison tables. */
export const CAPABILITY_LABELS: Record<CommerceCapability, string> = {
  basic_builder: "Basic Website Builder",
  basic_themes: "Basic Themes",
  creator_subdomain: "Creator Subdomain",
  premium_themes: "Premium Themes",
  custom_domain: "Custom Domain",
  advanced_builder: "Advanced Builder",
  ai_generation: "Automated Storefront Generation",
  advanced_ai: "Advanced Automation",
  social_integrations: "Social Integrations",
  api_access: "API Access",
  api_integrations: "API Integrations",
  webhooks: "Webhooks",
  live_social_sync: "Live Social Sync",
  white_label: "White Label",
  brand_removal: "Brand Removal",
  advanced_analytics: "Advanced Analytics",
  priority_support: "Priority Support",
  storage: "Storage",
  ai_credits: "AI Credits",
  storage_pack: "Storage Pack",
  theme_packs: "Theme Packs",
  theme_background_solid: "Solid Backgrounds",
  theme_background_gradient: "Gradient Backgrounds",
  theme_background_image: "Background Images",
  theme_background_video: "Video Backgrounds",
  theme_background_animation: "Animated Backgrounds",
  theme_effects_particles: "Decorative Particles",
  theme_effects_glow: "Glow Effects",
  theme_effects_noise: "Texture Effects",
  theme_effects_blur: "Surface Effects",
  theme_effects_custom: "Advanced Effects",
};

export const COMMERCE_PLANS: CommercePlanConfig[] = [
  {
    code: "creator_launch",
    name: "Creator Launch",
    description: "Your profile-built creator website — free for the first 15 days.",
    family: "creator",
    price: 0,
    currency: "INR",
    cycle: "monthly",
    razorpayPlanId: null,
    manual: false,
    capabilities: ["basic_builder", "basic_themes", "creator_subdomain", "theme_background_solid"],
    ctaType: "signup",
    ctaLabel: "Start Free Trial",
    trialDays: 15,
    featureOverrides: {
      max_products: 3,
      max_gallery: 3,
      max_services: 3,
      // RCCF-72.15B: Launch is a fully functional Creator plan — Courses and
      // Games are capability-available. The four core content types share ONE
      // Launch-wide ceiling of 3 ACTIVE items (enforced by the global counter
      // in content-limit.enforcement), so these values only mark availability;
      // the per-type value is superseded by the global counter on Launch.
      max_courses: 3,
      max_testimonials: 3,
      max_faq: 3,
      max_timeline: 3,
      max_links: 3,
      max_feed: 3,
      max_games: 3,
      max_bookings: 0,
      max_orders: 10,
      ai_credits: 0,
      // RCCF-59: canonical Creator storage (MB) + hero video capability.
      storage_mb: 20,
      hero_video_enabled: true,
      hero_video_max_size_mb: 12,
      hero_video_max_duration_sec: 15,
    },
    marketingDescription: "Get online with a website built from your creator profile. 15-day free trial — no credit card required.",
    targetAudience: "New creators getting started",
    // RCCF-MKT-05: truthful Launch entitlement copy. Products, services,
    // courses and games share ONE combined allowance of 3 ACTIVE items
    // (LAUNCH_GLOBAL_LIMIT, content-limit.enforcement) — never advertise them
    // as four independent "3×" buckets. Gallery/testimonials/FAQs/timeline/
    // links/feed keep their independent per-type limits of 3.
    marketingHighlights: [
      "Profile-built website generation",
      "Beautiful creator website",
      "CreatorStore subdomain",
      "Basic themes",
      "Up to 3 active items across products, services, courses & games",
      "3 gallery items",
      "3 testimonials",
      "3 FAQs",
      "3 timeline entries",
      "3 links",
      "3 feed posts",
      "Mobile responsive",
      "Community support",
    ],
    comparisonOrder: 1,
  },
  {
    code: "creator_grow",
    name: "Creator Growth",
    description: "Unlimited products, premium themes and a full visual builder — the most popular plan for growing creators.",
    family: "creator",
    price: 999,
    currency: "INR",
    cycle: "monthly",
    razorpayPlanId: "plan_TLTGQBU1EXkseF",
    manual: false,
    recommended: true,
    popular: true,
    badge: "Most Popular",
    annualPrice: 9990,
    capabilities: [
      "premium_themes",
      "advanced_builder",
      "ai_generation",
      "social_integrations",
      "priority_support",
      "theme_background_solid",
      "theme_background_gradient",
      "theme_background_image",
      "theme_background_animation",
      "theme_effects_particles",
      "theme_effects_glow",
      "theme_effects_noise",
      "theme_effects_blur",
    ],
    ctaType: "checkout",
    ctaLabel: "Upgrade to Growth",
    featureOverrides: {
      max_products: -1,
      max_gallery: -1,
      max_services: -1,
      max_courses: -1,
      max_testimonials: -1,
      max_faq: -1,
      max_timeline: -1,
      max_links: -1,
      max_feed: -1,
      max_games: 10,
      max_bookings: 20,
      max_orders: 100,
      ai_credits: 500,
      // RCCF-59: canonical Creator storage (MB) + hero video capability.
      storage_mb: 100,
      hero_video_enabled: true,
      hero_video_max_size_mb: 12,
      hero_video_max_duration_sec: 15,
    },
    marketingDescription: "Unlimited products and gallery, premium themes, a full visual builder and automation credits (coming soon).",
    targetAudience: "Most creators",
    marketingHighlights: [
      "Unlimited products",
      "Unlimited gallery",
      "Unlimited services",
      "Premium themes",
      "Full visual builder",
      "Advanced experience backgrounds",
      "Automation credits (coming soon)",
      "Analytics",
      "SEO optimization",
      "Priority support",
    ],
    comparisonOrder: 2,
  },
  {
    code: "creator_scale",
    name: "Creator Scale",
    description: "Run your creator business at full scale with advanced AI, API access and a brand you own.",
    family: "creator",
    // RCCF-MKT-05 approved pricing contract: Creator Scale = ₹1,999/month.
    // Annual keeps the catalog-wide invariant annualPrice = 10 × monthly.
    price: 1999,
    currency: "INR",
    cycle: "monthly",
    // RCCF-MKT-05: the previous Razorpay plan id (`plan_TLTH45wQlPdW7v`) was a
    // provider contract priced at the retired ₹1,995 amount. A stale id would
    // bill the old price after a catalog re-sync (subscriptions.create charges
    // the Razorpay plan's own amount), so it is removed; checkout falls back to
    // the existing one-time-order path at the DB-authoritative price until a
    // fresh subscription plan is provisioned via the Super Admin Pricing Center
    // (savePlanConfig provisions one automatically on the next price edit).
    razorpayPlanId: null,
    manual: false,
    bestValue: true,
    badge: "Best Value",
    annualPrice: 19990,
    capabilities: [
      "premium_themes",
      "custom_domain",
      "advanced_builder",
      "advanced_ai",
      "api_access",
      "api_integrations",
      "webhooks",
      "live_social_sync",
      "white_label",
      "brand_removal",
      "advanced_analytics",
      "priority_support",
      "theme_background_solid",
      "theme_background_gradient",
      "theme_background_image",
      "theme_background_video",
      "theme_background_animation",
      "theme_effects_particles",
      "theme_effects_glow",
      "theme_effects_noise",
      "theme_effects_blur",
      "theme_effects_custom",
    ],
    ctaType: "checkout",
    ctaLabel: "Upgrade to Scale",
    featureOverrides: {
      max_products: -1,
      max_gallery: -1,
      max_services: -1,
      max_courses: -1,
      max_testimonials: -1,
      max_faq: -1,
      max_timeline: -1,
      max_links: -1,
      max_feed: -1,
      max_games: -1,
      max_bookings: 100,
      max_orders: -1,
      ai_credits: 2000,
      max_team_members: 10,
      max_api_calls: 10000,
      // RCCF-59: canonical Creator storage (MB) + hero video capability.
      storage_mb: 300,
      hero_video_enabled: true,
      hero_video_max_size_mb: 12,
      hero_video_max_duration_sec: 15,
    },
    marketingDescription: "Everything in Growth, plus your own custom domain, platform-managed payment webhooks, live social sync and advanced analytics.",
    targetAudience: "Professional creators",
    marketingHighlights: [
      "Everything in Growth",
      "Custom domain",
      "API access",
      "Platform-managed payment webhooks",
      "Live social sync",
      "Advanced analytics",
      "Higher automation credits (coming soon)",
      "300 MB storage",
    ],
    comparisonOrder: 3,
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
    enterprise: true,
    hidden: true,
    capabilities: [
      "premium_themes",
      "custom_domain",
      "advanced_builder",
      "advanced_ai",
      "api_access",
      "api_integrations",
      "webhooks",
      "live_social_sync",
      "white_label",
      "brand_removal",
      "advanced_analytics",
      "priority_support",
      "theme_background_solid",
      "theme_background_gradient",
      "theme_background_image",
      "theme_background_video",
      "theme_background_animation",
      "theme_effects_particles",
      "theme_effects_glow",
      "theme_effects_noise",
      "theme_effects_blur",
      "theme_effects_custom",
      "storage",
    ],
    ctaType: "contact",
    ctaLabel: "Contact Sales",
    featureOverrides: {
      max_products: -1,
      max_gallery: -1,
      max_services: -1,
      max_courses: -1,
      max_testimonials: -1,
      max_faq: -1,
      max_timeline: -1,
      max_links: -1,
      max_feed: -1,
      max_games: -1,
      max_bookings: -1,
      max_orders: -1,
      max_team_members: 50,
      max_api_calls: -1,
      ai_credits: 10000,
      storage_gb: 500,
    },
    marketingDescription: "Custom plans for teams, brands and high-volume creators. Dedicated support.",
    targetAudience: "Teams and brands",
    marketingHighlights: [
      "Unlimited everything",
      "Custom integrations",
      "Dedicated support",
    ],
    comparisonOrder: 4,
  },
  {
    code: "partner_free",
    name: "Partner Launch",
    description: "Run your first client projects with the agency dashboard and workspace — free for 15 days.",
    family: "partner",
    price: 0,
    currency: "INR",
    cycle: "monthly",
    razorpayPlanId: null,
    manual: false,
    trialDays: 15,
    featureOverrides: {
      max_products: 5,
      max_gallery: 10,
      max_services: 5,
      max_testimonials: 10,
      max_faq: 10,
      max_timeline: 10,
      max_links: 10,
      max_feed: 10,
      max_clients: 1,
      max_websites: 1,
      max_team_members: 1,
      max_bookings: 5,
    },
    capabilities: ["basic_builder", "basic_themes", "creator_subdomain", "theme_background_solid"],
    ctaType: "signup",
    ctaLabel: "Start Free Trial",
    marketingDescription: "A 15-day free trial to evaluate client management — 1 client website. A paid partner plan (from 5 client websites) is required after the trial.",
    targetAudience: "New agencies and freelancers",
    marketingHighlights: [
      "15-day free trial",
      "1 client website",
      "Agency dashboard",
      "Client management",
      "Workspace management",
      "White-label on Scale and above",
      "Community support",
    ],
    comparisonOrder: 1,
  },
  {
    code: "partner_solo",
    name: "Solo Partner",
    description: "Run client projects with confidence: custom domains, premium themes and automation help.",
    family: "partner",
    // RCCF-73 approved pricing contract: Solo Partner = ₹4,999 ONE-TIME for the
    // included client capacity. No monthly renewal, no annual variant — the
    // purchase is a single Razorpay order (never a subscription).
    price: 4999,
    currency: "INR",
    cycle: "monthly",
    billingForm: "one_time",
    razorpayPlanId: null,
    manual: false,
    recommended: true,
    badge: "Recommended",
    capabilities: [
      "premium_themes",
      "custom_domain",
      "advanced_builder",
      "ai_generation",
      "social_integrations",
      "priority_support",
      "theme_background_solid",
      "theme_background_gradient",
      "theme_background_image",
      "theme_background_animation",
      "theme_effects_particles",
      "theme_effects_glow",
      "theme_effects_noise",
      "theme_effects_blur",
    ],
    ctaType: "checkout",
    ctaLabel: "Upgrade to Solo",
    featureOverrides: {
      max_products: 20,
      max_gallery: 50,
      max_services: 20,
      max_testimonials: 50,
      max_faq: 50,
      max_timeline: 50,
      max_links: 50,
      max_feed: 50,
      max_games: 20,
      max_bookings: 50,
      max_clients: 5,
      max_websites: 5,
      max_team_members: 3,
      ai_credits: 1000,
    },
    marketingDescription: "Run client projects with custom domains, premium themes, team members and recurring commission eligibility.",
    targetAudience: "Independent agencies",
    marketingHighlights: [
      "Agency dashboard",
      "Client management",
      "Workspace management",
      // RCCF-MKT-08-R1: commission is ELIGIBILITY for paid Partners (the rate
      // lives in the runtime configuration hierarchy) — never a guaranteed
      // amount or fixed percentage.
      "Recurring commission eligibility",
      "Team members",
      "Partner analytics",
      "Premium themes",
      "Custom domain",
      "Priority support",
    ],
    comparisonOrder: 2,
  },
  {
    code: "partner_scale",
    name: "Partner Scale",
    description: "Scale many creators under your own brand with white-label and priority support.",
    family: "partner",
    // RCCF-73 approved pricing contract: Partner Scale = ₹14,999 ONE-TIME for
    // the included client capacity. No monthly renewal, no annual variant —
    // the purchase is a single Razorpay order (never a subscription).
    price: 14999,
    currency: "INR",
    cycle: "monthly",
    billingForm: "one_time",
    razorpayPlanId: null,
    manual: false,
    bestValue: true,
    badge: "Best Value",
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
      "theme_background_solid",
      "theme_background_gradient",
      "theme_background_image",
      "theme_background_video",
      "theme_background_animation",
      "theme_effects_particles",
      "theme_effects_glow",
      "theme_effects_noise",
      "theme_effects_blur",
      "theme_effects_custom",
    ],
    ctaType: "checkout",
    ctaLabel: "Upgrade to Scale",
    featureOverrides: {
      max_products: 100,
      max_gallery: 500,
      max_services: 100,
      max_testimonials: 500,
      max_faq: 500,
      max_timeline: 500,
      max_links: 500,
      max_feed: 500,
      max_games: 100,
      max_bookings: 200,
      max_clients: 15,
      max_websites: 15,
      max_team_members: 10,
      ai_credits: 5000,
      max_api_calls: 50000,
    },
    marketingDescription: "Grow your agency under your own brand with white-label, multi-client management and priority support.",
    targetAudience: "Scaling agencies",
    marketingHighlights: [
      "Everything in Solo",
      "White label",
      "Multi-client management",
      "Advanced analytics",
      // RCCF-MKT-08-R1: eligibility wording — no guaranteed escalation claim.
      "Recurring commission from eligible active clients",
      "Priority support",
    ],
    // RCCF-MKT-05: post-Growth lineup is Free(1) → Solo(2) → Scale(3).
    comparisonOrder: 3,
  },
  {
    code: "partner_enterprise",
    name: "Enterprise Partner",
    description: "Custom requirements for enterprise partner programs.",
    family: "partner",
    price: 14999,
    currency: "INR",
    cycle: "monthly",
    razorpayPlanId: null,
    manual: true,
    enterprise: true,
    hidden: true,
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
      "theme_background_solid",
      "theme_background_gradient",
      "theme_background_image",
      "theme_background_video",
      "theme_background_animation",
      "theme_effects_particles",
      "theme_effects_glow",
      "theme_effects_noise",
      "theme_effects_blur",
      "theme_effects_custom",
    ],
    ctaType: "contact",
    ctaLabel: "Contact Sales",
    featureOverrides: {
      max_products: -1,
      max_gallery: -1,
      max_services: -1,
      max_courses: -1,
      max_testimonials: -1,
      max_faq: -1,
      max_timeline: -1,
      max_links: -1,
      max_feed: -1,
      max_games: -1,
      max_bookings: -1,
      max_clients: -1,
      max_websites: -1,
      max_team_members: 50,
      max_api_calls: -1,
      ai_credits: 10000,
    },
    marketingDescription: "Custom plans for enterprise partner programs. Dedicated support.",
    targetAudience: "Enterprise partner programs",
    marketingHighlights: [
      "Custom client capacity",
      "Custom integrations",
      "Team audit trail",
    ],
    comparisonOrder: 5,
  },
];

export const COMMERCE_PLAN_BY_CODE: Record<string, CommercePlanConfig> = Object.fromEntries(
  COMMERCE_PLANS.map((p) => [p.code, p]),
);

/** Legacy creator plan codes → canonical commerce codes (backward compat).
 *  RCCF-MKT-04-R1: `agency_agency → partner_growth` removed — Partner Growth
 *  is fully retired from the registry (Agency never launched; no subscribers). */
export const LEGACY_TO_CANONICAL: Record<string, string> = {
  creator_free: "creator_launch",
  creator_pro: "creator_grow",
  creator_elite: "creator_scale",
  agency_free: "partner_free",
  agency_studio: "partner_solo",
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
  webhooks: { feature: "webhooks", value: true },
  live_social_sync: { feature: "live_social_sync", value: true },
  white_label: { feature: "white_label", value: true },
  brand_removal: { feature: "remove_branding", value: true },
  advanced_analytics: { feature: "analytics_advanced", value: true },
  priority_support: { feature: "priority_support", value: true },
  storage: { feature: "storage_gb", value: 10 },
  ai_credits: { feature: "ai_automation", value: true },
  storage_pack: { feature: "storage_gb", value: -1 },
  theme_packs: { feature: "premium_themes", value: true },
  // RCCF-LAUNCH-POLISH-06: granular theme capabilities → boolean features so
  // capabilityService.can(plan, "theme_background_gradient") is authoritative.
  theme_background_solid: { feature: "theme_background_solid", value: true },
  theme_background_gradient: { feature: "theme_background_gradient", value: true },
  theme_background_image: { feature: "theme_background_image", value: true },
  theme_background_video: { feature: "theme_background_video", value: true },
  theme_background_animation: { feature: "theme_background_animation", value: true },
  theme_effects_particles: { feature: "theme_effects_particles", value: true },
  theme_effects_glow: { feature: "theme_effects_glow", value: true },
  theme_effects_noise: { feature: "theme_effects_noise", value: true },
  theme_effects_blur: { feature: "theme_effects_blur", value: true },
  theme_effects_custom: { feature: "theme_effects_custom", value: true },
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

// ── RCCF-73 — billing-form selectors ─────────────────────────────────────────
/**
 * The authoritative billing FORM for a plan code. Registry plans without an
 * explicit form are recurring subscriptions (every Creator plan — unchanged).
 * Unknown/DB-only codes default to "subscription", preserving pre-RCCF-73
 * behavior for any plan outside this registry.
 */
export function planBillingForm(code: string | null | undefined): "subscription" | "one_time" {
  if (!code) return "subscription";
  return getCommercePlan(code)?.billingForm === "one_time" ? "one_time" : "subscription";
}

/** True when the plan is purchased as a single one-time order (never renews). */
export function isOneTimePlan(code: string | null | undefined): boolean {
  return planBillingForm(code) === "one_time";
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

// ── RCCF-IMPLEMENTATION-70: registry-driven marketing selectors ─────────────
// Marketing surfaces consume ONLY these — no duplicated plan lists, features or
// prices anywhere in the UI.

/** Plans shown in the standard pricing comparison (no hidden/enterprise). */
export function getMarketingPlans(family: "creator" | "partner"): CommercePlanConfig[] {
  return COMMERCE_PLANS.filter((p) => p.family === family && !p.hidden && !p.enterprise)
    .sort((a, b) => (a.comparisonOrder ?? (a.price ?? 0)) - (b.comparisonOrder ?? (b.price ?? 0)));
}

/** The enterprise plan for a family (shown separately under Enterprise Solutions). */
export function getEnterprisePlan(family: "creator" | "partner"): CommercePlanConfig | undefined {
  return COMMERCE_PLANS.find((p) => p.family === family && p.enterprise);
}

/** Effective monthly price for a billing cycle. */
export function getPlanMonthlyPrice(plan: CommercePlanConfig, cycle: "monthly" | "yearly"): number | null {
  if (plan.price === null) return null;
  if (cycle === "yearly" && plan.annualPrice) return Math.round(plan.annualPrice / 12);
  return plan.price;
}

/** Annual savings percentage (monthly × 12 vs annual price). */
export function getAnnualSavingsPercent(plan: CommercePlanConfig): number | null {
  if (plan.price === null || !plan.annualPrice) return null;
  const annualized = plan.price * 12;
  if (annualized <= 0) return null;
  return Math.round((1 - plan.annualPrice / annualized) * 100);
}

/**
 * Upgrade highlights: what a plan ADDS over the previous visible tier in its
 * family. Used by the upgrade dialog to explain the value of the next step.
 */
export function getUpgradeHighlights(planCode: string): string[] {
  const current = getCommercePlan(planCode);
  if (!current) return [];
  const tier = getMarketingPlans(current.family);
  const idx = tier.findIndex((p) => p.code === planCode);
  const next = tier[idx + 1];
  if (!next) return [];
  const prev = idx > 0 ? tier[idx - 1] : null;
  const prevHighlights = new Set(prev?.marketingHighlights ?? []);
  const adds = (next.marketingHighlights ?? []).filter((h) => h !== "Everything in Growth" && h !== "Everything in Solo" && !prevHighlights.has(h));
  return adds.length > 0 ? adds : next.marketingHighlights ?? [];
}
