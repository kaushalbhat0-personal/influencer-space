/**
 * Billing v2 — FeatureGateService
 *
 * THE ONLY public API for entitlement checks.
 * Application code must never contain:
 *   if (plan === "PRO") { ... }
 * All feature access goes through this service.
 *
 * Phase 1: Reads from in-memory plan catalog.
 * Phase 2+: Reads from database (BillingPlanFeature table).
 */

import { PLANS } from "../domain/plan-catalog";
import type { EntitlementCheck } from "../domain/types";

export class FeatureGateService {
  /**
   * Check if an account can use a feature.
   */
  canUse(planCode: string, featureKey: string): EntitlementCheck {
    const plan = PLANS.find((p) => p.code === planCode);
    if (!plan) return { allowed: false, reason: `Unknown plan: ${planCode}` };

    const value = plan.features[featureKey];
    if (value === undefined) return { allowed: false, reason: `Feature not in plan: ${featureKey}` };

    if (typeof value === "boolean") return { allowed: value };
    if (typeof value === "number") return { allowed: value === -1 || value > 0, limit: value === -1 ? undefined : value };

    return { allowed: false, reason: "Unknown feature value type" };
  }

  /**
   * Get the numeric limit for a feature (e.g., max_products).
   * Returns -1 for unlimited. Returns 0 if feature not in plan.
   */
  getLimit(planCode: string, featureKey: string): number {
    const plan = PLANS.find((p) => p.code === planCode);
    if (!plan) return 0;
    const value = plan.features[featureKey];
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? -1 : 0;
    return 0;
  }

  /**
   * Convenience: maximum products for a plan.
   */
  maxProducts(planCode: string): number {
    return this.getLimit(planCode, "max_products");
  }

  /**
   * Convenience: can use custom domain?
   */
  canUseCustomDomain(planCode: string): boolean {
    return this.canUse(planCode, "custom_domain").allowed;
  }

  /**
   * Convenience: can remove branding?
   */
  canRemoveBranding(planCode: string): boolean {
    return this.canUse(planCode, "custom_branding").allowed;
  }

  /**
   * Convenience: maximum managed clients (agencies only).
   */
  maxClients(planCode: string): number {
    return this.getLimit(planCode, "max_clients");
  }

  /**
   * Convenience: maximum team members.
   */
  maxTeamMembers(planCode: string): number {
    return this.getLimit(planCode, "max_team_members");
  }

  /**
   * List all features with their values for a given plan.
   * Useful for debugging / admin UI.
   */
  getPlanFeatures(planCode: string): Record<string, number | boolean | string> {
    const plan = PLANS.find((p) => p.code === planCode);
    return plan?.features ?? {};
  }
}

export const featureGate = new FeatureGateService();
