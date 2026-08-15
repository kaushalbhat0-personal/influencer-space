/**
 * Server-side storage quota enforcement — RCCF-09 Scope 3 + RCCF-59.
 *
 * RCCF-59: Creator storage is canonicalized to MB (storage_mb: 20/100/300,
 * Enterprise configurable via storage_gb). Enforcement resolves the plan's
 * storage limit in BYTES from `storage_mb` when present (Creators), falling
 * back to `storage_gb` (Partners — OUT OF SCOPE, unchanged). Usage is the SUM
 * of ACTIVE Asset.size scoped to the tenant; soft-deleted assets no longer
 * count so deletion reclaims capacity.
 */
import { prisma } from "@/lib/prisma";
import { capabilityService } from "@/lib/capabilities";
import { DEFAULT_PLAN_CODE, FEATURE_IDS } from "@/lib/capabilities/constants";
import { resolveActivePlan } from "./plan-source";
import type { Prisma } from "@/generated/prisma/client";

export const BYTES_PER_GB = 1024 * 1024 * 1024;
export const BYTES_PER_MB = 1024 * 1024;

/** Convert bytes to GB with one decimal place (Partner/legacy displays). */
export function storageBytesToGb(bytes: number): number {
  return Math.round((bytes / BYTES_PER_GB) * 10) / 10;
}

/** Convert bytes to MB with one decimal place (Creator displays). */
export function storageBytesToMb(bytes: number): number {
  return Math.round((bytes / BYTES_PER_MB) * 10) / 10;
}

/**
 * Total bytes currently stored for the tenant (sum of ACTIVE Asset.size).
 * DELETED assets are excluded so deletion reclaims quota. Transaction-aware.
 */
export async function countStorageUsage(tenantId: string, tx?: Prisma.TransactionClient | typeof prisma): Promise<number> {
  const client = tx ?? prisma;
  const agg = await client.asset.aggregate({
    where: { tenantId, status: { not: "DELETED" } },
    _sum: { size: true },
  });
  return agg._sum.size ?? 0;
}

/**
 * Resolve a plan's storage limit in bytes from the canonical capability.
 * `storage_mb` is the Creator authority (RCCF-59); `storage_gb` is the legacy
 * compatibility fallback used by Creator Enterprise and legacy configs.
 *
 * RCCF-60.3: Partner (agency-family) plans have NO storage capability — a
 * family guard returns null regardless of any historical `storage_gb` override
 * that may exist in BillingPlan.runtimeConfig, so those values are permanently
 * inert. -1 = unlimited (Infinity).
 */
export function resolveStorageLimitBytes(planCode: string): number | null {
  const plan = capabilityService.getPlan(planCode);
  if (plan?.family === "agency") return null; // Partner/Agency: no storage capability
  const mb = capabilityService.limit(planCode, FEATURE_IDS.STORAGE_MB);
  if (mb > 0) return mb * BYTES_PER_MB;
  const gb = capabilityService.limit(planCode, FEATURE_IDS.STORAGE_GB);
  if (gb === -1) return Infinity;
  if (gb > 0) return gb * BYTES_PER_GB;
  return null; // no storage capability
}

export interface HeroVideoCapability {
  enabled: boolean;
  maxSizeBytes: number;
  maxDurationSec: number;
}

/** Resolve the hero-video capability for a plan (RCCF-59). */
export function resolveHeroVideoCapability(planCode: string): HeroVideoCapability {
  const enabled = capabilityService.can(planCode, FEATURE_IDS.HERO_VIDEO_ENABLED).allowed;
  const maxSizeMb = capabilityService.limit(planCode, FEATURE_IDS.HERO_VIDEO_MAX_SIZE_MB);
  const maxDurationSec = capabilityService.limit(planCode, FEATURE_IDS.HERO_VIDEO_MAX_DURATION_SEC);
  return {
    enabled,
    maxSizeBytes: (maxSizeMb > 0 ? maxSizeMb : 12) * BYTES_PER_MB,
    maxDurationSec: maxDurationSec > 0 ? maxDurationSec : 15,
  };
}

export interface StorageCapability {
  /** Storage limit in bytes, or null when the plan has no storage capability. */
  limitBytes: number | null;
  limitMb: number | null;
  limitGb: number | null;
  hero: HeroVideoCapability;
}

/** Everything a consumer needs from the canonical storage capability. */
export function resolveStorageCapability(planCode: string): StorageCapability {
  const limitBytes = resolveStorageLimitBytes(planCode);
  const mb = capabilityService.limit(planCode, FEATURE_IDS.STORAGE_MB);
  return {
    limitBytes,
    limitMb: mb > 0 ? mb : null,
    limitGb: mb > 0 ? null : capabilityService.limit(planCode, FEATURE_IDS.STORAGE_GB),
    hero: resolveHeroVideoCapability(planCode),
  };
}

export interface StorageLimitDecision {
  ok: boolean;
  /** Bytes currently stored (ACTIVE assets). */
  used: number;
  /** Plan limit in bytes (Infinity when unlimited). */
  limit: number;
  /** Bytes of headroom remaining. */
  remaining: number;
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
  tx?: Prisma.TransactionClient | typeof prisma;
}): Promise<StorageLimitDecision> {
  const { tenantId, incomingBytes } = params;
  const used = params.used ?? (await countStorageUsage(tenantId, params.tx));

  const plan = await resolveActivePlan(undefined, tenantId);
  const planCode = plan.code ?? DEFAULT_PLAN_CODE;
  const limit = resolveStorageLimitBytes(planCode);
  const remaining = limit === null ? 0 : Math.max(0, limit - used);

  if (limit === null) {
    // RCCF-60.3: the plan has no storage capability (Partner plans never hit
    // this path — enforcement is Creator-tenant-only; defensive for Creators
    // whose storage feature was removed by a Super Admin override).
    return { ok: false, used, limit: 0, remaining: 0, reason: "Storage is not available on your current plan." };
  }

  if (incomingBytes <= remaining) {
    return { ok: true, used, limit, remaining };
  }

  const reason = !Number.isFinite(limit)
    ? "Storage limit reached."
    : `Storage quota exceeded (${storageBytesToMb(used + incomingBytes).toFixed(1)} / ${storageBytesToMb(limit).toFixed(0)} MB).`;

  return { ok: false, used, limit, remaining, reason };
}
