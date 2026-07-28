import type { CapabilityId } from "./registry";

export type PlanTier = "free" | "creator_pro" | "creator_business" | "agency" | "enterprise";

export interface PlanLimits {
  products: number;
  galleryImages: number;
  mediaStorageMB: number;
  teamMembers: number;
  clients: number;
  brands: number;
  bandwidthGB: number;
}

export interface PlanDefinition {
  id: PlanTier;
  name: string;
  description: string;
  capabilities: CapabilityId[];
  limits: PlanLimits;
  monthlyCredits?: number;
}

const DEFAULT_LIMITS: PlanLimits = {
  products: 5,
  galleryImages: 10,
  mediaStorageMB: 100,
  teamMembers: 0,
  clients: 0,
  brands: 1,
  bandwidthGB: 1,
};

const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    description: "Launch your first storefront",
    capabilities: [
      "basic_builder",
      "seo_tools",
      "navigation_editor",
      "analytics_basic",
      "template_library",
    ],
    limits: { ...DEFAULT_LIMITS },
  },

  creator_pro: {
    id: "creator_pro",
    name: "Creator Pro",
    description: "Professional presence with custom branding",
    capabilities: [
      "basic_builder",
      "custom_branding",
      "custom_domain",
      "seo_tools",
      "navigation_editor",
      "analytics_basic",
      "api_integrations",
      "template_library",
      "premium_themes",
      "marketplace_access",
    ],
    limits: {
      products: 100,
      galleryImages: 500,
      mediaStorageMB: 10_240,
      teamMembers: 0,
      clients: 0,
      brands: 1,
      bandwidthGB: 10,
    },
  },

  creator_business: {
    id: "creator_business",
    name: "Creator Business",
    description: "Scale with team and automation",
    capabilities: [
      "advanced_builder",
      "custom_branding",
      "custom_domain",
      "seo_tools",
      "navigation_editor",
      "analytics_basic",
      "analytics_advanced",
      "api_integrations",
      "automation",
      "team_members",
      "template_library",
      "premium_themes",
      "marketplace_access",
      "custom_components",
    ],
    limits: {
      products: -1, // unlimited
      galleryImages: -1,
      mediaStorageMB: 102_400,
      teamMembers: 5,
      clients: 0,
      brands: 5,
      bandwidthGB: 100,
    },
  },

  agency: {
    id: "agency",
    name: "Agency",
    description: "Manage multiple clients at scale",
    capabilities: [
      "advanced_builder",
      "custom_branding",
      "custom_domain",
      "seo_tools",
      "navigation_editor",
      "analytics_basic",
      "analytics_advanced",
      "api_integrations",
      "automation",
      "team_members",
      "agency_clients",
      "bulk_publish",
      "template_library",
      "premium_themes",
      "marketplace_access",
      "custom_components",
      "multiple_brands",
    ],
    limits: {
      products: -1,
      galleryImages: -1,
      mediaStorageMB: 512_000,
      teamMembers: 20,
      clients: 50,
      brands: -1,
      bandwidthGB: 500,
    },
  },

  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for large organizations",
    capabilities: [
      "advanced_builder",
      "custom_branding",
      "custom_domain",
      "seo_tools",
      "navigation_editor",
      "analytics_basic",
      "analytics_advanced",
      "api_integrations",
      "automation",
      "team_members",
      "agency_clients",
      "bulk_publish",
      "template_library",
      "premium_themes",
      "marketplace_access",
      "custom_components",
      "multiple_brands",
      "white_label",
    ],
    limits: {
      products: -1,
      galleryImages: -1,
      mediaStorageMB: -1,
      teamMembers: -1,
      clients: -1,
      brands: -1,
      bandwidthGB: -1,
    },
  },
};

export class SubscriptionRegistry {
  getPlan(tier: PlanTier): PlanDefinition | undefined {
    return PLANS[tier];
  }

  getAllPlans(): PlanDefinition[] {
    return Object.values(PLANS);
  }

  getCapabilitiesForPlan(tier: PlanTier): CapabilityId[] {
    return PLANS[tier]?.capabilities ?? [];
  }

  getLimitsForPlan(tier: PlanTier): PlanLimits {
    return PLANS[tier]?.limits ?? DEFAULT_LIMITS;
  }

  hasCapability(tier: PlanTier, capabilityId: CapabilityId): boolean {
    return PLANS[tier]?.capabilities.includes(capabilityId) ?? false;
  }
}

export const subscriptionRegistry = new SubscriptionRegistry();
