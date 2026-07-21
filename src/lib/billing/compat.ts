/**
 * Billing v2 — Compatibility Layer
 *
 * Maps legacy plan names to v2 plan codes, then delegates to EntitlementService.
 * Legacy callers use this during migration. Eventually remove and use
 * EntitlementService directly.
 *
 * Phase 2B: Wired to entitlement service (not featureGate).
 */

import { entitlement } from "./entitlements";

function legacyToV2(plan: string): string {
  const map: Record<string, string> = {
    STARTER: "creator_free",
    PRO: "creator_pro",
    FREELANCER: "agency_starter",
    GROWTH: "agency_growth",
  };
  return map[plan] ?? "creator_free";
}

export const v2FeatureGate = {
  canUse(plan: string, featureKey: string) {
    return entitlement.can(legacyToV2(plan), featureKey);
  },

  getLimit(plan: string, featureKey: string): number {
    return entitlement.limit(legacyToV2(plan), featureKey);
  },

  maxProducts(plan: string): number {
    return entitlement.limit(legacyToV2(plan), "max_products");
  },

  canUseCustomDomain(plan: string): boolean {
    return entitlement.has(legacyToV2(plan), "custom_domain");
  },

  canRemoveBranding(plan: string): boolean {
    return entitlement.has(legacyToV2(plan), "custom_branding");
  },

  maxClients(plan: string): number {
    return entitlement.limit(legacyToV2(plan), "max_clients");
  },

  maxTeamMembers(plan: string): number {
    return entitlement.limit(legacyToV2(plan), "max_team_members");
  },

  remaining(plan: string, featureKey: string, currentUsage: number): number {
    return entitlement.remaining(legacyToV2(plan), featureKey, currentUsage);
  },
};
