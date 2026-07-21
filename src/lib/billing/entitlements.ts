/**
 * Billing v2 — EntitlementService
 *
 * THE ONLY public API for authorization and limit checks.
 * Application code must never check plan names, subscription names,
 * or hardcoded limits directly.
 *
 * All checks flow through:
 *   entitlement.has("custom_domain")
 *   entitlement.limit("products")
 *   entitlement.can("custom_branding")
 */

import { PLANS } from "./plan-catalog";
import type { EntitlementCheck } from "./types";

export interface EntitlementAuditRow {
  accountId: string;
  planCode: string;
  planName: string;
  feature: string;
  allowed: boolean;
  limit: number | null;
  value: string;
}

export class EntitlementService {
  /**
   * Check whether an account has a boolean feature.
   */
  has(planCode: string, featureKey: string): boolean {
    const plan = PLANS.find((p) => p.code === planCode);
    if (!plan) return false;
    const value = plan.features[featureKey];
    if (typeof value === "boolean") return value;
    return false;
  }

  /**
   * Get the numeric limit for a feature.
   * Returns -1 for unlimited. Returns 0 if feature not in plan.
   */
  limit(planCode: string, featureKey: string): number {
    const plan = PLANS.find((p) => p.code === planCode);
    if (!plan) return 0;
    const value = plan.features[featureKey];
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? -1 : 0;
    return 0;
  }

  /**
   * Generic check — returns allowed + optional limit.
   */
  can(planCode: string, featureKey: string): EntitlementCheck {
    const plan = PLANS.find((p) => p.code === planCode);
    if (!plan) return { allowed: false, reason: `Unknown plan: ${planCode}` };

    const value = plan.features[featureKey];
    if (value === undefined) return { allowed: false, reason: `Feature not in plan: ${featureKey}` };

    if (typeof value === "boolean") return { allowed: value };
    if (typeof value === "number") return {
      allowed: value === -1 || value > 0,
      limit: value === -1 ? undefined : value,
    };

    return { allowed: false };
  }

  /**
   * Remaining usage for a numeric feature.
   */
  remaining(planCode: string, featureKey: string, currentUsage: number): number {
    const max = this.limit(planCode, featureKey);
    if (max === -1) return Infinity;
    return Math.max(0, max - currentUsage);
  }

  /**
   * All features for a plan.
   */
  getPlanFeatures(planCode: string): Record<string, number | boolean | string> {
    const plan = PLANS.find((p) => p.code === planCode);
    return plan?.features ?? {};
  }

  /**
   * Audit — returns every feature's status for an account.
   * Useful for debugging, support, and admin tooling.
   */
  audit(planCode: string, accountId?: string): EntitlementAuditRow[] {
    const plan = PLANS.find((p) => p.code === planCode);
    if (!plan) return [];

    return Object.entries(plan.features).map(([feature, value]) => ({
      accountId: accountId ?? "—",
      planCode,
      planName: plan.name,
      feature,
      allowed: typeof value === "boolean" ? value : (typeof value === "number" ? (value === -1 || value > 0) : false),
      limit: typeof value === "number" ? (value === -1 ? null : value) : null,
      value: String(value),
    }));
  }
}

export const entitlement = new EntitlementService();

// Backward-compatible alias
export { entitlement as featureGate };
