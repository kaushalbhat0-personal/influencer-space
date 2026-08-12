/**
 * Server-side storage quota enforcement — RCCF-09 Scope 3.
 *
 * The media upload boundary was fully bypassable: no code path checked the
 * tenant's declared `storage_gb` plan limit, so uploads accumulated without
 * bound on every plan. This resolves the tenant's ACTIVE plan through the
 * canonical plan source and enforces the EXISTING per-plan `storage_gb`
 * values configured in COMMERCE_PLANS (featureOverrides). No new limits are
 * introduced — this only enforces what the plan configuration declares.
 *
 * Deliberately separate from content-limit.enforcement.ts (RCCF-08): that
 * module counts content ROWS; this one measures uploaded BYTES.
 */
import { prisma } from "@/lib/prisma";
import { capabilityService } from "@/lib/capabilities";
import { DEFAULT_PLAN_CODE } from "@/lib/capabilities/constants";
import { resolveActivePlan } from "./plan-source";

export const BYTES_PER_GB = 1024 * 1024 * 1024;

/** Convert bytes to GB with one decimal place (for usage displays). */
export function storageBytesToGb(bytes: number): number {
  return Math.round((bytes / BYTES_PER_GB) * 10) / 10;
}

/** Total bytes currently stored for the tenant (sum of Asset.size). */
export async function countStorageUsage(tenantId: string): Promise<number> {
  const agg = await prisma.asset.aggregate({
    where: { tenantId },
    _sum: { size: true },
  });
  return agg._sum.size ?? 0;
}

export interface StorageLimitDecision {
  ok: boolean;
  /** Bytes currently stored. */
  used: number;
  /** Plan limit in bytes (Infinity when unlimited). */
  limit: number;
  /** Bytes of headroom remaining. */
  remaining: number;
  /** Plan limit in GB as declared in config. */
  limitGb: number;
  reason?: string;
}

/**
 * Enforce the tenant's storage quota for an incoming upload. Returns ok=true
 * while the incoming bytes fit within the remaining headroom; ok=false with a
 * human-readable reason when the upload would exceed the plan limit.
 */
export async function enforceStorageLimit(params: {
  tenantId: string;
  incomingBytes: number;
  used?: number;
}): Promise<StorageLimitDecision> {
  const { tenantId, incomingBytes } = params;
  const used = params.used ?? (await countStorageUsage(tenantId));

  const plan = await resolveActivePlan(undefined, tenantId);
  const planCode = plan.code ?? DEFAULT_PLAN_CODE;
  const limitGb = capabilityService.limit(planCode, "storage_gb");
  const limit = limitGb === -1 ? Infinity : limitGb * BYTES_PER_GB;
  const remaining = Math.max(0, limit - used);

  if (incomingBytes <= remaining) {
    return { ok: true, used, limit, remaining, limitGb };
  }

  const projectedGb = (used + incomingBytes) / BYTES_PER_GB;
  const reason =
    limitGb === 0
      ? "Storage is not available on your current plan."
      : `Storage limit reached (${projectedGb.toFixed(1)} / ${limitGb} GB).`;

  return { ok: false, used, limit, remaining, limitGb, reason };
}
