/**
 * Billing facade — thin re-export of the canonical entitlement authority.
 *
 * Canonical implementation: src/lib/capabilities/entitlements.ts
 *   → capabilityService → capabilityEngine → plans.ts
 *
 * This file preserves the existing billing import path
 *   @/modules/billing/application/entitlements
 * so consumers do not need migration. There is exactly ONE
 * EntitlementService class in the codebase (the canonical one).
 * All helpers here delegate to capabilityService / entitlementService
 * and do not recreate CAPABILITY_TO_FEATURE or plan matrices.
 */
import {
  EntitlementService as CanonicalEntitlementService,
  entitlementService as canonicalEntitlement,
} from "@/lib/capabilities";
import { capabilityService } from "@/lib/capabilities";
import type { EntitlementCheck } from "../domain/types";

// Re-export the single canonical class — no second implementation.
export { CanonicalEntitlementService as EntitlementService };
export type { EntitlementCheck };

export interface EntitlementAuditRow {
  accountId: string;
  planCode: string;
  planName: string;
  feature: string;
  allowed: boolean;
  limit: number | null;
  value: string;
}

// The singleton is the canonical instance, augmented with billing-specific
// helpers that have no direct canonical equivalent. Core `has`/`check`
// (including nullable planCode and 11 theme_* mappings) is inherited
// from the canonical instance and is not duplicated.
export const entitlement = canonicalEntitlement as unknown as CanonicalEntitlementService & {
  limit(planCode: string, featureKey: string): number;
  can(planCode: string, featureKey: string): EntitlementCheck;
  remaining(planCode: string, featureKey: string, currentUsage: number): number;
  getPlanFeatures(planCode: string): Record<string, number | boolean | string>;
  audit(planCode: string, accountId?: string): EntitlementAuditRow[];
};

// Thin delegates — no capability/plan duplication.
(entitlement as unknown as { limit: (a: string, b: string) => number }).limit = (
  planCode: string,
  featureKey: string,
) => capabilityService.limit(planCode, featureKey);

(entitlement as unknown as { can: (a: string, b: string) => EntitlementCheck }).can = (
  planCode: string,
  featureKey: string,
): EntitlementCheck => {
  const result = capabilityService.can(planCode, featureKey);
  return {
    allowed: result.allowed,
    limit: result.limit ?? (result.allowed ? undefined : 0),
    reason: result.reason,
  };
};

(entitlement as unknown as { remaining: (a: string, b: string, c: number) => number }).remaining = (
  planCode: string,
  featureKey: string,
  currentUsage: number,
) => capabilityService.remaining(planCode, featureKey, currentUsage);

(entitlement as unknown as {
  getPlanFeatures: (a: string) => Record<string, number | boolean | string>;
}).getPlanFeatures = (planCode: string) => {
  const plan = capabilityService.getPlan(planCode);
  return plan?.features ?? {};
};

(entitlement as unknown as {
  audit: (a: string, b?: string) => EntitlementAuditRow[];
}).audit = (planCode: string, accountId?: string): EntitlementAuditRow[] => {
  const plan = capabilityService.getPlan(planCode);
  if (!plan) return [];
  return Object.entries(plan.features).map(([feature, value]) => ({
    accountId: accountId ?? "\u2014",
    planCode,
    planName: plan.name,
    feature,
    allowed:
      typeof value === "boolean"
        ? value
        : typeof value === "number"
          ? value === -1 || value > 0
          : false,
    limit: typeof value === "number" ? (value === -1 ? null : value) : null,
    value: String(value),
  }));
};

export { entitlement as featureGate };
