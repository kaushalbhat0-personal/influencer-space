import { capabilityService } from "@/lib/capabilities";
import type { EntitlementCheck } from "../domain/types";

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
  has(planCode: string, featureKey: string): boolean {
    return capabilityService.can(planCode, featureKey).allowed;
  }

  limit(planCode: string, featureKey: string): number {
    return capabilityService.limit(planCode, featureKey);
  }

  can(planCode: string, featureKey: string): EntitlementCheck {
    const result = capabilityService.can(planCode, featureKey);
    return {
      allowed: result.allowed,
      limit: result.limit ?? (result.allowed ? undefined : 0),
      reason: result.reason,
    };
  }

  remaining(planCode: string, featureKey: string, currentUsage: number): number {
    return capabilityService.remaining(planCode, featureKey, currentUsage);
  }

  getPlanFeatures(planCode: string): Record<string, number | boolean | string> {
    const plan = capabilityService.getPlan(planCode);
    return plan?.features ?? {};
  }

  audit(planCode: string, accountId?: string): EntitlementAuditRow[] {
    const plan = capabilityService.getPlan(planCode);
    if (!plan) return [];

    return Object.entries(plan.features).map(([feature, value]) => ({
      accountId: accountId ?? "\u2014",
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

export { entitlement as featureGate };
