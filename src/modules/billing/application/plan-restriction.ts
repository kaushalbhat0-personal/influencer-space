/**
 * Plan Restriction (IMPLEMENTATION-42 Phase 5) — the canonical server-side rule:
 * a creator managed by a partner/agency (AgencyTenant) cannot be on Creator
 * Launch (Free); the minimum is Creator Grow. Every surface (checkout, billing,
 * provisioning, admin, super-admin, CapabilityService) enforces this through
 * this module. Never client-only.
 */
import { prisma } from "@/lib/prisma";
import {
  isAgencyRestrictedPlan,
  minEligiblePlanForAgencyCreator,
  MIN_PLAN_FOR_AGENCY_CREATORS,
} from "@/config/commerce/plans";

let cache: { at: number; value: Set<string> } | null = null;
const CACHE_TTL_MS = 30_000;

/** Test helper: invalidate the managed-tenant cache. */
export function resetPlanRestrictionCache(): void {
  cache = null;
}

/** Tenant ids that are managed by a partner/agency (AgencyTenant link). */
export async function isTenantAgencyManaged(tenantId: string | null | undefined): Promise<boolean> {
  if (!tenantId) return false;
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value.has(tenantId);
  const links = (await prisma.agencyTenant?.findMany?.({
    where: { status: "ACTIVE" },
    select: { tenantId: true },
  }).catch(() => [])) ?? [];
  cache = { at: Date.now(), value: new Set(links.map((l) => l.tenantId)) };
  return cache.value.has(tenantId);
}

/**
 * Resolve the effective plan code for a creator, clamping Launch → Grow when
 * the creator is agency-managed. Used by every resolution path (UI, billing,
 * diagnostics, capability checks).
 */
export async function resolveRestrictedPlanCode(input: {
  tenantId: string | null | undefined;
  code: string | null | undefined;
}): Promise<string | null> {
  if (!input.code) return input.code ?? null;
  const managed = await isTenantAgencyManaged(input.tenantId);
  if (!managed) return input.code;
  return minEligiblePlanForAgencyCreator(input.code);
}

export interface PlanEligibility {
  ok: boolean;
  error?: string;
  effectiveCode: string;
}

/**
 * Validate a requested plan for a creator. Throws when the creator is
 * agency-managed and the requested plan is below the minimum (Grow).
 */
export async function assertEligiblePlan(input: {
  tenantId: string | null | undefined;
  workspaceId?: string | null;
  planCode: string | null | undefined;
}): Promise<PlanEligibility> {
  const code = input.planCode ?? null;
  const managed = await isTenantAgencyManaged(input.tenantId);
  if (!managed) return { ok: true, effectiveCode: code ?? "creator_launch" };
  if (code && isAgencyRestrictedPlan(code)) {
    return {
      ok: false,
      effectiveCode: minEligiblePlanForAgencyCreator(code),
      error: `Agency-managed creators require at least ${MIN_PLAN_FOR_AGENCY_CREATORS.replace("creator_", "").toUpperCase()} (Creator Grow) — Creator Launch is not available.`,
    };
  }
  return { ok: true, effectiveCode: code ?? minEligiblePlanForAgencyCreator("creator_launch") };
}
