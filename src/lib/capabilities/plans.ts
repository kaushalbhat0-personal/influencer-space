import type { PlanDefinition } from "./types";
import { UNLIMITED, DISABLED } from "./constants";

const plans: PlanDefinition[] = [
  {
    code: "creator_free",
    family: "creator",
    name: "Starter",
    description: "Everything you need to get started. No credit card required.",
    targetAudience: "New creators",
    price: 0,
    currency: "INR",
    cycle: "monthly",
    ctaLabel: "Start Free",
    ctaType: "signup",
    features: {
      max_products: 5,
      max_gallery: 10,
      storage_gb: 1,
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
      white_label: false,
    },
    recommended: false,
    badge: "",
    legacyAliases: [],
    sortOrder: 1,
  },
  {
    code: "creator_pro",
    family: "creator",
    name: "Pro",
    description: "For full-time creators ready to grow their business.",
    targetAudience: "Full-time creators",
    price: 999,
    currency: "INR",
    cycle: "monthly",
    ctaLabel: "Get Started",
    ctaType: "checkout",
    features: {
      max_products: UNLIMITED,
      max_gallery: 50,
      storage_gb: 10,
      max_messages: 1000,
      max_orders: 500,
      max_websites: 1,
      max_team_members: 3,
      max_clients: DISABLED,
      max_api_calls: 10000,
      custom_domain: true,
      custom_branding: true,
      remove_branding: false,
      analytics_basic: true,
      analytics_advanced: true,
      seo: true,
      premium_themes: true,
      ai_automation: true,
      export_data: true,
      priority_support: true,
      multiple_users: true,
      api_access: false,
      webhooks: false,
      white_label: false,
    },
    recommended: true,
    badge: "Most Popular",
    legacyAliases: [],
    sortOrder: 2,
  },
  {
    code: "creator_elite",
    family: "creator",
    name: "Elite",
    description: "For high-volume creators with teams and advanced needs.",
    targetAudience: "High-volume creators",
    price: 2999,
    currency: "INR",
    cycle: "monthly",
    ctaLabel: "Get Started",
    ctaType: "checkout",
    features: {
      max_products: UNLIMITED,
      max_gallery: 200,
      storage_gb: 50,
      max_messages: 5000,
      max_orders: 2000,
      max_websites: 3,
      max_team_members: 10,
      max_clients: DISABLED,
      max_api_calls: 50000,
      custom_domain: true,
      custom_branding: true,
      remove_branding: true,
      analytics_basic: true,
      analytics_advanced: true,
      seo: true,
      premium_themes: true,
      ai_automation: true,
      export_data: true,
      priority_support: true,
      multiple_users: true,
      api_access: true,
      webhooks: true,
      white_label: false,
    },
    recommended: false,
    badge: "",
    legacyAliases: [],
    sortOrder: 3,
  },
  {
    code: "agency_free",
    family: "agency",
    name: "Free",
    description: "For freelancers exploring agency features.",
    targetAudience: "New agencies",
    price: 0,
    currency: "INR",
    cycle: "monthly",
    ctaLabel: "Start Free",
    ctaType: "signup",
    features: {
      max_products: UNLIMITED,
      max_gallery: 10,
      storage_gb: 1,
      max_messages: 100,
      max_orders: UNLIMITED,
      max_websites: 1,
      max_team_members: 1,
      max_clients: 1,
      max_api_calls: 1000,
      custom_domain: true,
      custom_branding: true,
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
      white_label: false,
    },
    recommended: false,
    badge: "",
    legacyAliases: [],
    sortOrder: 4,
  },
  {
    code: "agency_studio",
    family: "agency",
    name: "Studio",
    description: "For small agencies managing a handful of creators.",
    targetAudience: "Small agencies",
    price: 1999,
    currency: "INR",
    cycle: "monthly",
    ctaLabel: "Get Started",
    ctaType: "checkout",
    features: {
      max_products: UNLIMITED,
      max_gallery: 100,
      storage_gb: 25,
      max_messages: 2500,
      max_orders: UNLIMITED,
      max_websites: 5,
      max_team_members: 3,
      max_clients: 5,
      max_api_calls: 25000,
      custom_domain: true,
      custom_branding: true,
      remove_branding: false,
      analytics_basic: true,
      analytics_advanced: false,
      seo: true,
      premium_themes: true,
      ai_automation: false,
      export_data: true,
      priority_support: false,
      multiple_users: true,
      api_access: false,
      webhooks: false,
      white_label: false,
    },
    recommended: true,
    badge: "Most Popular",
    legacyAliases: ["agency_starter"],
    sortOrder: 5,
  },
  {
    code: "agency_agency",
    family: "agency",
    name: "Agency",
    description: "For established agencies scaling their creator portfolio.",
    targetAudience: "Growing agencies",
    price: 4999,
    currency: "INR",
    cycle: "monthly",
    ctaLabel: "Get Started",
    ctaType: "checkout",
    features: {
      max_products: UNLIMITED,
      max_gallery: 500,
      storage_gb: 100,
      max_messages: 10000,
      max_orders: UNLIMITED,
      max_websites: 20,
      max_team_members: 10,
      max_clients: 20,
      max_api_calls: 100000,
      custom_domain: true,
      custom_branding: true,
      remove_branding: true,
      analytics_basic: true,
      analytics_advanced: true,
      seo: true,
      premium_themes: true,
      ai_automation: true,
      export_data: true,
      priority_support: true,
      multiple_users: true,
      api_access: true,
      webhooks: true,
      white_label: true,
    },
    recommended: false,
    badge: "",
    legacyAliases: ["agency_growth"],
    sortOrder: 6,
  },
];

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

export function getPlan(code: string): PlanDefinition | undefined {
  return planMap.get(code);
}

export function getAllPlans(): PlanDefinition[] {
  const seen = new Set<string>();
  const result: PlanDefinition[] = [];
  const entries = Array.from(planMap.entries());
  for (let i = 0; i < entries.length; i++) {
    const plan = entries[i][1];
    if (!seen.has(plan.code)) {
      seen.add(plan.code);
      result.push(plan);
    }
  }
  return result.sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
}

export function getPlansByFamily(family: "creator" | "agency"): PlanDefinition[] {
  return getAllPlans().filter((p) => p.family === family);
}

export function getPlanOrThrow(code: string): PlanDefinition {
  const plan = planMap.get(code);
  if (!plan) throw new Error(`Unknown plan code: ${code}`);
  return plan;
}

export function isLegacyPlan(code: string): boolean {
  const plan = getPlan(code);
  if (!plan) return false;
  return (plan.legacyAliases ?? []).includes(code);
}

export function resolvePlan(code: string): PlanDefinition | undefined {
  return getPlan(code);
}
