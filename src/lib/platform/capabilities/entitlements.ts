import { subscriptionRegistry, type PlanTier } from "./subscriptions";
import { capabilityRegistry } from "./registry";
import type { CapabilityId } from "./registry";

export interface EntitlementResult {
  granted: boolean;
  capabilityId: CapabilityId;
  planTier: PlanTier | null;
  reason?: string;
}

export class EntitlementService {
  has(planTier: PlanTier | null | undefined, capabilityId: CapabilityId): boolean {
    if (!planTier) return false;

    const cap = capabilityRegistry.getCapability(capabilityId);
    if (!cap) return false;

    return subscriptionRegistry.hasCapability(planTier, capabilityId);
  }

  check(planTier: PlanTier | null | undefined, capabilityId: CapabilityId): EntitlementResult {
    const granted = this.has(planTier, capabilityId);
    const cap = capabilityRegistry.getCapability(capabilityId);

    return {
      granted,
      capabilityId,
      planTier: planTier ?? null,
      reason: granted ? undefined : `Requires ${cap?.name ?? capabilityId} capability`,
    };
  }

  getGrantedCapabilities(planTier: PlanTier | null | undefined): CapabilityId[] {
    if (!planTier) return [];
    return subscriptionRegistry.getCapabilitiesForPlan(planTier);
  }

  getDeniedCapabilities(planTier: PlanTier | null | undefined): CapabilityId[] {
    if (!planTier) return capabilityRegistry.getAllCapabilities().map((c) => c.id);
    const granted = new Set(this.getGrantedCapabilities(planTier));
    return capabilityRegistry.getAllCapabilities().map((c) => c.id).filter((id) => !granted.has(id));
  }
}

export const entitlementService = new EntitlementService();
