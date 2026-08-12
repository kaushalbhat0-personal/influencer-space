/**
 * RCCF-09 — Scale-only runtime capability gates.
 *
 * Every gate resolves the ACTIVE plan through the billing source of truth
 * (resolveActivePlan) and checks capabilities via entitlementService — never
 * by comparing plan codes directly. These mirror the UI-level gates (e.g. the
 * Integrations page) so the server layer enforces the same boundary as the
 * pages, closing write-action and cron bypasses.
 */
import { resolveActivePlan } from "./plan-source";
import { entitlementService } from "@/lib/capabilities";

/** True when the resolved plan code grants any of the given capabilities. */
export function hasAnyCapability(
  code: string | null | undefined,
  capabilities: string[],
): boolean {
  return capabilities.some((capabilityId) => entitlementService.has(code, capabilityId));
}

export interface CapabilityGateResult {
  code: string | null;
  granted: boolean;
}

/**
 * Resolve the tenant's active plan and assert it grants at least one of the
 * requested capabilities. Throws `Forbidden` (or a custom message) when the
 * tenant is not entitled. Callers with existing auth catch blocks that map
 * "Forbidden" to a clean error message get consistent behavior.
 */
export async function assertAnyCapability(params: {
  tenantId: string;
  capabilities: string[];
  message?: string;
}): Promise<CapabilityGateResult> {
  const resolved = await resolveActivePlan(null, params.tenantId);
  const granted = hasAnyCapability(resolved.code, params.capabilities);
  if (!granted) {
    throw new Error(params.message ?? "Forbidden");
  }
  return { code: resolved.code, granted };
}
