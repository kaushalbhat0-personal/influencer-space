import { capabilityService } from "./service";

export type EntitlementCapabilityId =
  | "basic_builder"
  | "advanced_builder"
  | "premium_themes"
  | "custom_domain"
  | "analytics_basic"
  | "analytics_advanced"
  | "media_storage"
  | "api_integrations"
  | "api_access"
  | "webhooks"
  | "live_social_sync"
  | "automation"
  | "team_members"
  | "multiple_brands"
  | "agency_clients"
  | "bulk_publish"
  | "custom_components"
  | "white_label"
  | "marketplace_access"
  | "template_library"
  | "seo_tools"
  | "navigation_editor"
  | "custom_branding";

const CAPABILITY_TO_FEATURE: Record<string, string> = {
  basic_builder: "basic_builder",
  advanced_builder: "advanced_builder",
  premium_themes: "premium_themes",
  custom_domain: "custom_domain",
  analytics_basic: "analytics_basic",
  analytics_advanced: "analytics_advanced",
  media_storage: "media_storage",
  api_integrations: "api_integrations",
  api_access: "api_access",
  webhooks: "webhooks",
  live_social_sync: "live_social_sync",
  automation: "automation",
  team_members: "max_team_members",
  multiple_brands: "multiple_brands",
  agency_clients: "agency_clients",
  bulk_publish: "bulk_publish",
  custom_components: "custom_components",
  white_label: "white_label",
  marketplace_access: "marketplace_access",
  template_library: "template_library",
  seo_tools: "seo",
  navigation_editor: "navigation_editor",
  custom_branding: "custom_branding",
};

export interface EntitlementResult {
  granted: boolean;
  capabilityId: string;
  reason?: string;
}

export class EntitlementService {
  has(planCode: string | null | undefined, capabilityId: string): boolean {
    if (!planCode) return false;

    const featureKey = CAPABILITY_TO_FEATURE[capabilityId];
    if (!featureKey) return false;

    const result = capabilityService.can(planCode, featureKey);
    return result.allowed;
  }

  check(planCode: string | null | undefined, capabilityId: string): EntitlementResult {
    const granted = this.has(planCode, capabilityId);
    return {
      granted,
      capabilityId,
      reason: granted ? undefined : `Requires ${capabilityId} capability`,
    };
  }
}

export const entitlementService = new EntitlementService();
