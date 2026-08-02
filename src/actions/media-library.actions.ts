"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assetRepository } from "@/lib/media/repositories/asset-repository";
import { mediaService } from "@/lib/media/service";
import { prisma } from "@/lib/prisma";
import { uploadAsset } from "./media.actions";
import { afterContentChange } from "@/lib/publishing/content-change";
import { resolveAssetUsage } from "@/lib/media/usage-resolver";
import { storageProviderFactory } from "@/lib/media/providers/factory";
import { logger } from "@/lib/observability/logger";
import { logAction } from "@/lib/audit";

async function requireTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}

async function requireUser(): Promise<{ tenantId: string; userId: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return { tenantId: session.user.tenantId, userId: session.user.id ?? "system" };
}

/**
 * Attach live usage (used + usages) from the SINGLE resolver to a list of
 * assets. Used by listAssets / getAsset so the badge, details panel and delete
 * protection all read the same source.
 */
async function attachUsage<T extends { id: string; publicUrl: string | null }>(
  tenantId: string,
  assets: T[],
): Promise<(T & { used: boolean; usages: import("@/lib/media/usage-resolver").AssetUsage[] })[]> {
  const usage = await resolveAssetUsage({
    tenantId,
    assets: assets.map((a) => ({ id: a.id, publicUrl: a.publicUrl })),
  });
  return assets.map((a) => {
    const r = usage[a.id];
    return { ...a, used: r?.used ?? false, usages: r?.usages ?? [] };
  });
}

export async function listAssets(params?: {
  search?: string;
  mimeType?: string;
  status?: string;
  sortBy?: "createdAt" | "updatedAt" | "filename" | "size";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}) {
  try {
    const tenantId = await requireTenant();
    const result = await assetRepository.findByTenant(tenantId, {
      search: params?.search,
      mimeType: params?.mimeType,
      status: params?.status ?? "ACTIVE",
      sortBy: params?.sortBy ?? "createdAt",
      sortOrder: params?.sortOrder ?? "desc",
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    });
    const assets = await attachUsage(tenantId, result.assets);
    return { success: true, assets, total: result.total };
  } catch (error) {
    return { success: false, assets: [], total: 0, error: error instanceof Error ? error.message : "Failed to list assets" };
  }
}

export async function getAsset(assetId: string) {
  try {
    const tenantId = await requireTenant();
    const asset = await assetRepository.findById(assetId);
    if (!asset) return { success: true, asset: null };
    const [enriched] = await attachUsage(tenantId, [asset]);
    return { success: true, asset: enriched ?? asset };
  } catch (error) {
    return { success: false, asset: null, error: error instanceof Error ? error.message : "Failed to get asset" };
  }
}

/** Human label + admin navigation for a single asset (single source resolver). */
export async function resolveAssetReferences(assetId: string) {
  try {
    const tenantId = await requireTenant();
    const asset = await prisma.asset.findUnique({
      where: { id: assetId, tenantId },
      select: { id: true, publicUrl: true },
    });
    if (!asset) return { success: false, usages: [], error: "Asset not found" };
    const usage = await resolveAssetUsage({ tenantId, assets: [{ id: asset.id, publicUrl: asset.publicUrl }] });
    return { success: true, usages: usage[asset.id]?.usages ?? [] };
  } catch (error) {
    return { success: false, usages: [], error: error instanceof Error ? error.message : "Failed to resolve references" };
  }
}

export async function deleteAssetFromLibrary(assetId: string) {
  try {
    const tenantId = await requireTenant();
    await mediaService.delete(assetId);
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Delete failed" };
  }
}

export interface BulkDeleteBlockedAsset {
  assetId: string;
  filename: string;
  usages: import("@/lib/media/usage-resolver").AssetUsage[];
}

export async function deleteAssetsBulk(assetIds: string[]) {
  const started = Date.now();
  const t0 = performance.now();
  const uniqueIds = [...Array.from(new Set(assetIds.filter(Boolean)))];
  if (uniqueIds.length === 0) return { success: false, error: "No assets selected" };

  let user: { tenantId: string; userId: string };
  try {
    user = await requireUser();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unauthorized" };
  }
  const { tenantId, userId } = user;

  try {
    // Fetch all assets in one query (no N+1).
    const assets = await prisma.asset.findMany({
      where: { id: { in: uniqueIds }, tenantId },
      select: { id: true, filename: true, publicUrl: true, storageKey: true, size: true, mimeType: true },
    });
    if (assets.length === 0) return { success: true, deleted: [], blocked: [], failures: [], totalBytes: 0, durationMs: 0 };

    // ── Reference safety: block any asset still used (single resolver). ──
    const usage = await resolveAssetUsage({
      tenantId,
      assets: assets.map((a) => ({ id: a.id, publicUrl: a.publicUrl })),
    });
    const blocked: BulkDeleteBlockedAsset[] = assets
      .filter((a) => usage[a.id]?.used)
      .map((a) => ({ assetId: a.id, filename: a.filename, usages: usage[a.id]?.usages ?? [] }));

    const deletable = assets.filter((a) => !usage[a.id]?.used);
    if (deletable.length === 0) {
      return { success: false, blocked, deleted: [], failures: [], totalBytes: 0, durationMs: 0, error: "All selected assets are in use" };
    }

    const deletableIds = deletable.map((a) => a.id);
    const deletableKeys = deletable.filter((a) => a.storageKey).map((a) => a.storageKey);
    const totalBytes = deletable.reduce((sum, a) => sum + (a.size ?? 0), 0);

    // ── Transactional DB cleanup: references first, then asset rows. ──
    let removedRefs = 0;
    let removedAssets = 0;
    const failures: string[] = [];
    await prisma.$transaction(async (tx) => {
      const refs = await tx.assetReference.deleteMany({ where: { assetId: { in: deletableIds } } });
      removedRefs = refs.count;
      const assetsRes = await tx.asset.deleteMany({ where: { id: { in: deletableIds } } });
      removedAssets = assetsRes.count;
    });

    // ── Bulk storage removal (verify after). ──
    let storageRemoved = 0;
    let storageFailed: string[] = [];
    const stillExist: string[] = [];
    try {
      const provider = storageProviderFactory.getProvider();
      if (provider.deleteMany) {
        const res = await provider.deleteMany(deletableKeys);
        storageRemoved = res.removed;
        storageFailed = res.failed;
      } else {
        for (const key of deletableKeys) {
          try { await provider.delete(key); storageRemoved++; } catch { storageFailed.push(key); }
        }
      }
      // Storage verification (origin, bypasses CDN): objects must be gone.
      for (const key of deletableKeys) {
        const exists = await provider.exists(key).catch(() => true);
        if (exists) stillExist.push(key);
      }
    } catch (error) {
      storageFailed = deletableKeys;
      logger.warn("bulk storage removal failed", "media", { metadata: { tenantId, count: deletableKeys.length }, error: error instanceof Error ? error : undefined });
    }

    // ── Audit trail ──
    try {
      await logAction(tenantId, "MEDIA_BULK_DELETE", {
        userId,
        assetsDeleted: removedAssets,
        bytesReclaimed: totalBytes,
        referencesRemoved: removedRefs,
        storageObjectsRemoved: storageRemoved,
        storageFailed,
        failures,
        blocked: blocked.length,
        durationMs: Math.round(performance.now() - t0),
      });
    } catch (error) {
      logger.warn("audit log write failed", "media", { metadata: { tenantId }, error: error instanceof Error ? error : undefined });
    }

    await afterContentChange(tenantId);
    logger.info("media bulk delete complete", "media", {
      metadata: { tenantId, deleted: removedAssets, bytes: totalBytes, durationMs: Math.round(performance.now() - t0), blocked: blocked.length },
    });

    return {
      success: true,
      deleted: deletable.map((a) => ({ assetId: a.id, bytes: a.size ?? 0 })),
      blocked,
      failures,
      removedRefs,
      storageRemoved,
      storageFailed,
      storageVerifiedRemoved: deletableKeys.length - stillExist.length,
      totalBytes,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    return { success: false, deleted: [], blocked: [], failures: [error instanceof Error ? error.message : "Delete failed"], totalBytes: 0, durationMs: Date.now() - started, error: error instanceof Error ? error.message : "Batch delete failed" };
  }
}

/**
 * Storage verification (IMPLEMENTATION-23 PART 6): check whether the given
 * storage keys still exist at the ORIGIN (bypasses CDN caches). Returns the
 * keys that still exist.
 */
export async function verifyStorageObjects(storageKeys: string[]) {
  try {
    await requireTenant();
    const provider = storageProviderFactory.getProvider();
    const stillExist: string[] = [];
    for (const key of storageKeys.filter(Boolean)) {
      const exists = await provider.exists(key).catch(() => true);
      if (exists) stillExist.push(key);
    }
    return { success: true, stillExist };
  } catch (error) {
    return { success: false, stillExist: [], error: error instanceof Error ? error.message : "Verification failed" };
  }
}

export async function purgeAsset(assetId: string) {  try {
    const tenantId = await requireTenant();
    await mediaService.purge(assetId);
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Purge failed" };
  }
}

export async function replaceAsset(assetId: string, formData: FormData) {
  try {
    const tenantId = await requireTenant();
    const file = formData.get("file") as File | null;
    if (!file) return { success: false, error: "No file provided" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mediaService.replace({
      assetId,
      file: { filename: file.name, mimeType: file.type, size: file.size, buffer },
    });
    await afterContentChange(tenantId);

    return { success: true, url: result.url };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Replace failed" };
  }
}

export async function removeAssetReference(
  assetId: string,
  entityType: string,
  entityId: string,
  entityField?: string,
) {
  try {
    await requireTenant();
    await mediaService.removeReference(assetId, entityType, entityId, entityField);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to remove reference" };
  }
}

export async function createAssetReference(
  assetId: string,
  entityType: string,
  entityId: string,
  entityField?: string,
) {
  try {
    const tenantId = await requireTenant();
    await mediaService.createReference(assetId, tenantId, entityType, entityId, entityField);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create reference" };
  }
}

export { uploadAsset as uploadToLibrary };
