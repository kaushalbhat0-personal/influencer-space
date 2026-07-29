export const PLAN_FAMILIES = ["creator", "agency"] as const;
export type PlanFamily = (typeof PLAN_FAMILIES)[number];

export const PLAN_CODES = [
  "creator_free",
  "creator_pro",
  "creator_elite",
  "agency_free",
  "agency_studio",
  "agency_agency",
  "agency_starter",
  "agency_growth",
] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const FEATURE_IDS = {
  PRODUCTS: "max_products",
  GALLERY: "max_gallery",
  STORAGE_GB: "storage_gb",
  MESSAGES: "max_messages",
  ORDERS: "max_orders",
  WEBSITES: "max_websites",
  TEAM_MEMBERS: "max_team_members",
  CLIENTS: "max_clients",
  API_CALLS: "max_api_calls",
  CUSTOM_DOMAIN: "custom_domain",
  CUSTOM_BRANDING: "custom_branding",
  REMOVE_BRANDING: "remove_branding",
  ANALYTICS_BASIC: "analytics_basic",
  ANALYTICS_ADVANCED: "analytics_advanced",
  SEO: "seo",
  PREMIUM_THEMES: "premium_themes",
  AI_TOOLS: "ai_automation",
  EXPORT: "export_data",
  PRIORITY_SUPPORT: "priority_support",
  MULTIPLE_USERS: "multiple_users",
  MULTIPLE_WEBSITES: "max_websites",
  API_ACCESS: "api_access",
  WEBHOOKS: "webhooks",
  WHITE_LABEL: "white_label",
  BUILDER: "basic_builder",
  ADVANCED_BUILDER: "advanced_builder",
  MARKETPLACE_ACCESS: "marketplace_access",
  TEMPLATE_LIBRARY: "template_library",
  NAVIGATION_EDITOR: "navigation_editor",
  MEDIA_STORAGE: "media_storage",
  AUTOMATION: "automation",
  MULTIPLE_BRANDS: "multiple_brands",
  AGENCY_CLIENTS: "agency_clients",
  BULK_PUBLISH: "bulk_publish",
  CUSTOM_COMPONENTS: "custom_components",
  API_INTEGRATIONS: "api_integrations",
} as const;
export type FeatureId = (typeof FEATURE_IDS)[keyof typeof FEATURE_IDS];

export const LIMIT_FEATURES = new Set<FeatureId>([
  FEATURE_IDS.PRODUCTS,
  FEATURE_IDS.GALLERY,
  FEATURE_IDS.STORAGE_GB,
  FEATURE_IDS.MESSAGES,
  FEATURE_IDS.ORDERS,
  FEATURE_IDS.WEBSITES,
  FEATURE_IDS.TEAM_MEMBERS,
  FEATURE_IDS.CLIENTS,
  FEATURE_IDS.API_CALLS,
]);

export const BOOLEAN_FEATURES = new Set<FeatureId>([
  FEATURE_IDS.CUSTOM_DOMAIN,
  FEATURE_IDS.CUSTOM_BRANDING,
  FEATURE_IDS.REMOVE_BRANDING,
  FEATURE_IDS.ANALYTICS_BASIC,
  FEATURE_IDS.ANALYTICS_ADVANCED,
  FEATURE_IDS.SEO,
  FEATURE_IDS.PREMIUM_THEMES,
  FEATURE_IDS.AI_TOOLS,
  FEATURE_IDS.EXPORT,
  FEATURE_IDS.PRIORITY_SUPPORT,
  FEATURE_IDS.MULTIPLE_USERS,
  FEATURE_IDS.API_ACCESS,
  FEATURE_IDS.WEBHOOKS,
  FEATURE_IDS.WHITE_LABEL,
  FEATURE_IDS.BUILDER,
  FEATURE_IDS.ADVANCED_BUILDER,
  FEATURE_IDS.MARKETPLACE_ACCESS,
  FEATURE_IDS.TEMPLATE_LIBRARY,
  FEATURE_IDS.NAVIGATION_EDITOR,
  FEATURE_IDS.MEDIA_STORAGE,
  FEATURE_IDS.AUTOMATION,
  FEATURE_IDS.MULTIPLE_BRANDS,
  FEATURE_IDS.AGENCY_CLIENTS,
  FEATURE_IDS.BULK_PUBLISH,
  FEATURE_IDS.CUSTOM_COMPONENTS,
  FEATURE_IDS.API_INTEGRATIONS,
]);

export const USAGE_METRICS = [
  FEATURE_IDS.PRODUCTS,
  FEATURE_IDS.GALLERY,
  FEATURE_IDS.STORAGE_GB,
  FEATURE_IDS.MESSAGES,
  FEATURE_IDS.ORDERS,
] as const;
export type UsageMetric = (typeof USAGE_METRICS)[number];

export const UNLIMITED = -1;
export const DISABLED = 0;

export const RESERVED_PLAN_CODES = [
  "agency_enterprise", "addon_ai", "addon_storage", "addon_team", "addon_whitelabel",
] as const;

export const UPGRADE_PATHS: Record<string, string[]> = {
  creator_free: ["creator_pro", "creator_elite"],
  creator_pro: ["creator_elite"],
  creator_elite: [],
  agency_free: ["agency_studio", "agency_agency"],
  agency_studio: ["agency_agency"],
  agency_agency: [],
  agency_starter: ["agency_growth"],
  agency_growth: [],
};

// ── Canonical Plan Constants ─────────────────────────────────────────────────

export const DEFAULT_CREATOR_PLAN = "creator_free";
export const DEFAULT_AGENCY_PLAN = "agency_free";
export const DEFAULT_PLAN_CODE = DEFAULT_CREATOR_PLAN;
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_BILLING_INTERVAL = "monthly";
export const LEGACY_PLAN_MAP: Record<string, string> = {
  STARTER: "creator_free",
  PRO: "creator_pro",
  FREELANCER: "agency_starter",
  GROWTH: "agency_growth",
  ENTERPRISE: "agency_agency",
};
