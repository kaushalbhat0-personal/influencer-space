import { randomUUID, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { assetRepository } from "./repositories/asset-repository";
import { storageProviderFactory } from "./providers/factory";
import { mediaValidator, type FileInfo } from "./validator";
import { platformEventBus } from "@/lib/events";
import { imageProcessor } from "./processing/image-processor";
import { filterValidAssetIds, normalizeAssetId, requireAssetId } from "./resolve";
import { enforceStorageLimit, resolveHeroVideoCapability, resolveStorageLimitBytes, storageBytesToMb, countStorageUsage } from "@/modules/billing/application/storage.enforcement";
import { validateHeroVideo } from "./hero-validation";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { DEFAULT_PLAN_CODE } from "@/lib/capabilities/constants";
import { logger } from "@/lib/observability/logger";
import type { Prisma } from "@/generated/prisma/client";
import type { StorageProvider } from "./providers/interface";

export interface UploadOptions {
  tenantId: string;
  file: FileInfo;
  folder?: string;
  entityType?: string;
  entityId?: string;
  entityField?: string;
  altText?: string;
}

export interface UploadResult {
  assetId: string;
  url: string;
  deduplicated: boolean;
}

export interface ReplaceOptions {
  assetId: string;
  file: FileInfo;
}

export class MediaService {
  async upload(options: UploadOptions): Promise<UploadResult> {
    const validation = mediaValidator.validateUpload(options.file, options.folder);
    if (!validation.valid) {
      throw new MediaValidationError(validation.errors.join("; "), validation.errors);
    }

    const checksum = this.computeChecksum(options.file);
    const folder = options.folder ?? "general";

    const duplicates = await assetRepository.findDuplicates(options.tenantId, checksum);
    if (duplicates.length > 0) {
      const existing = duplicates[0];

      if (options.entityType && options.entityId) {
        await assetRepository.createReference(
          existing.id,
          options.tenantId,
          options.entityType,
          options.entityId,
          options.entityField,
        );
      }

      // Deduplicated asset may predate sync processing — make it READY now.
      await this.processAssetNow(existing.id, options.file, options.file.size);

      this.emit("AssetUploaded", { assetId: existing.id, tenantId: options.tenantId, deduplicated: true });

      return { assetId: existing.id, url: existing.publicUrl ?? "", deduplicated: true };
    }

    // RCCF-09: enforce the tenant's declared storage quota before adding bytes.
    await this.assertStorageQuota(options.tenantId, options.file.size);
    // RCCF-59: hero videos have their own server-side constraints. RCCF-70.5.3 —
    // the hero folder also holds poster/background images, so only video payloads
    // are subject to the hero-video contract.
    if (folder === "hero" && this.isVideoMime(options.file.mimeType)) {
      await this.assertHeroVideo(options.tenantId, options.file);
    }

    const ext = options.file.filename.split(".").pop() || "bin";
    const storageKey = `${options.tenantId}/${folder}/${randomUUID()}.${ext}`;

    const provider = storageProviderFactory.getProvider();
    const result = await provider.upload(storageKey, {
      filename: options.file.filename,
      mimeType: options.file.mimeType,
      buffer: options.file.buffer!,
    });

    // RCCF-59: the AUTHORITATIVE quota gate + asset row are committed atomically
    // under a tenant row lock so concurrent uploads cannot exceed the limit.
    const asset = await this.commitAssetQuota(options.tenantId, result.size, (tx) =>
      assetRepository.create({
        tenantId: options.tenantId,
        filename: `${randomUUID()}.${ext}`,
        originalFilename: options.file.filename,
        mimeType: options.file.mimeType,
        size: result.size,
        checksum,
        storageProvider: provider.name,
        storageKey: result.storageKey,
        publicUrl: result.publicUrl,
        altText: options.altText,
      }, tx),
    ).catch(async (error: unknown) => {
      // A rejected/quota-failed upload must not leave bytes behind.
      if (error instanceof MediaValidationError) {
        await provider.delete(storageKey).catch(() => {});
      }
      throw error;
    });

    if (options.entityType && options.entityId) {
      await assetRepository.createReference(
        asset.id,
        options.tenantId,
        options.entityType,
        options.entityId,
        options.entityField,
      );
    }

    // IMPLEMENTATION-19 (Phase C): process synchronously so the asset is READY
    // immediately — no more assets stuck at QUEUED forever (the background
    // processor is not wired to a worker). Dimensions are extracted from the
    // buffer we already hold, so the client sees Ready + metadata instantly.
    await this.processAssetNow(asset.id, options.file, result.size);

    this.emit("AssetUploaded", { assetId: asset.id, tenantId: options.tenantId, deduplicated: false });

    return { assetId: asset.id, url: result.publicUrl, deduplicated: false };
  }

  /**
   * Step 1 of the two-step signed upload (IMPLEMENTATION-20 Phase A):
   * validate metadata, dedupe by checksum, and return a signed upload URL so
   * the file body goes DIRECTLY to the storage provider — never through the
   * app server's request-body limit (Vercel 413).
   *
   * Returns either a deduped existing asset or a signed upload payload.
   * When the provider does not support signed uploads, `signed: null` is
   * returned and the client falls back to the direct multipart route.
   */
  async prepareSignedUpload(options: {
    tenantId: string;
    filename: string;
    mimeType: string;
    size: number;
    checksum: string;
    folder?: string;
    entityType?: string;
    entityId?: string;
    entityField?: string;
  }): Promise<
    | { deduplicated: true; assetId: string; url: string }
    | { deduplicated: false; signed: import("./providers/interface").SignedUploadUrl | null; storageKey: string }
  > {
    const folder = options.folder ?? "general";
    const validation = mediaValidator.validateUpload(
      { filename: options.filename, mimeType: options.mimeType, size: options.size },
      folder,
    );
    if (!validation.valid) {
      throw new MediaValidationError(validation.errors.join("; "), validation.errors);
    }

    const duplicates = await assetRepository.findDuplicates(options.tenantId, options.checksum);
    if (duplicates.length > 0) {
      const existing = duplicates[0];
      if (options.entityType && options.entityId) {
        await assetRepository.createReference(
          existing.id,
          options.tenantId,
          options.entityType,
          options.entityId,
          options.entityField,
        );
      }
      this.emit("AssetUploaded", { assetId: existing.id, tenantId: options.tenantId, deduplicated: true });
      return { deduplicated: true, assetId: existing.id, url: existing.publicUrl ?? "" };
    }

    // RCCF-09: enforce the declared storage quota before issuing a signed URL
    // so an over-quota tenant never lands bytes in storage.
    await this.assertStorageQuota(options.tenantId, options.size);

    // RCCF-59: fast-fail hero constraints (client-declared size is a UX pre-check
    // only — the authoritative check runs at completion against actual bytes).
    // RCCF-70.5.3 — poster/background images in the hero folder are not subject
    // to the hero-video pre-check.
    if (folder === "hero" && this.isVideoMime(options.mimeType)) {
      await this.assertHeroVideoPrecheck(options.tenantId, options.mimeType, options.size);
    }

    const ext = options.filename.split(".").pop() || "bin";
    const storageKey = `${options.tenantId}/${folder}/${randomUUID()}.${ext}`;
    const provider = storageProviderFactory.getProvider();

    if (!provider.supportsSignedUpload || !provider.createSignedUploadUrl) {
      return { deduplicated: false, signed: null, storageKey };
    }

    const signed = await provider.createSignedUploadUrl(storageKey);
    return { deduplicated: false, signed, storageKey };
  }

  /**
   * Step 2 of the two-step signed upload: register the Asset row + reference
   * for a file the client already uploaded directly to storage.
   */
  async completeSignedUpload(options: {
    tenantId: string;
    storageKey: string;
    publicUrl: string;
    filename: string;
    originalFilename: string;
    mimeType: string;
    size: number;
    checksum: string;
    folder?: string;
    entityType?: string;
    entityId?: string;
    entityField?: string;
    width?: number;
    height?: number;
    duration?: number;
    altText?: string;
  }): Promise<UploadResult> {
    const provider = storageProviderFactory.getProvider();

    // RCCF-70.5.1 — the client-supplied storageKey is never trusted as the
    // tenant boundary. The server-side session tenantId is the authority: the
    // key MUST begin with `${tenantId}/`. Foreign/malformed/traversal keys are
    // rejected BEFORE any provider access, so nothing is ever deleted on this
    // path (we can never prove ownership of a foreign key).
    assertOwnedStorageKey(options.tenantId, options.storageKey);

    // RCCF-19 P1-S: verify the object actually landed in storage before
    // registering it.
    const exists = await provider.exists(options.storageKey).catch(() => false);
    if (!exists) throw new Error("Uploaded file not found in storage; upload did not complete");

    // RCCF-70.5.1 — the object is this tenant's (ownership was established by
    // the prefix invariant above), so a failure AFTER the physical upload can
    // safely clean up the orphan instead of silently leaking bytes. Cleanup is
    // best-effort and never masks the original error. Once the Asset row is
    // committed the object becomes referenced, so it is not deleted anymore.
    let assetCommitted = false;
    try {
      // RCCF-19 P1-S: the client-declared `size` is never trusted for quota or
      // limit enforcement. Obtain the authoritative stored byte size from the
      // provider and fail closed when it cannot be verified.
      if (!provider.getObjectMetadata) {
        throw new Error("Storage provider does not support object verification");
      }
      const metadata = await provider.getObjectMetadata(options.storageKey);
      const actualSize = metadata.size;
      if (typeof actualSize !== "number" || actualSize <= 0) {
        throw new Error("Uploaded file size could not be verified");
      }

      // Enforce per-category/file limits against the ACTUAL stored size.
      const validation = mediaValidator.validateUpload(
        { filename: options.originalFilename, mimeType: options.mimeType, size: actualSize },
        options.folder,
      );
      if (!validation.valid) {
        throw new MediaValidationError(validation.errors.join("; "), validation.errors);
      }

      // RCCF-19 P1-S: dedupe before registering so a duplicate never
      // double-counts storage (mirrors the multipart upload path).
      const duplicates = await assetRepository.findDuplicates(options.tenantId, options.checksum);
      if (duplicates.length > 0) {
        const existing = duplicates[0];
        if (options.entityType && options.entityId) {
          await assetRepository.createReference(
            existing.id,
            options.tenantId,
            options.entityType,
            options.entityId,
            options.entityField,
          );
        }
        // RCCF-70.5.1 — the freshly PUT object duplicates an existing asset that
        // references a DIFFERENT key, so it is an orphan. Ownership is already
        // established; delete it safely. Never delete when the existing asset
        // references this exact key (a re-registration of a committed object).
        if (existing.storageKey !== options.storageKey) {
          await provider.delete(options.storageKey).catch(() => {});
        }
        this.emit("AssetUploaded", { assetId: existing.id, tenantId: options.tenantId, deduplicated: true });
        return { assetId: existing.id, url: existing.publicUrl ?? "", deduplicated: true };
      }

      // RCCF-09/RCCF-19: enforce the tenant storage quota against the ACTUAL bytes.
      await this.assertStorageQuota(options.tenantId, actualSize);

      // RCCF-59: hero videos are validated server-side — the object bytes are
      // read from the provider (never the client-declared duration) to enforce
      // the 15-second / 12 MB hero contract. RCCF-70.5.3 — the hero folder also
      // holds poster/background images; the strict video contract only applies
      // when the object is actually a video (any video signal fails closed).
      if (options.folder === "hero" && await this.isVideoLike(metadata.mimeType, options.mimeType, options.originalFilename)) {
        await this.assertHeroVideoObject(options.tenantId, options.storageKey, options.originalFilename, actualSize, provider);
      }

      // RCCF-70.5.1 — the public URL is derived server-side from the storageKey
      // via the existing provider abstraction. The client-supplied publicUrl is
      // never authoritative.
      const canonicalPublicUrl = await provider.getPublicUrl(options.storageKey);
      if (!canonicalPublicUrl) {
        throw new Error("Could not derive a public URL for the uploaded file");
      }

      // RCCF-59: authoritative quota gate + asset row committed atomically under a
      // tenant row lock (concurrent signed completions cannot exceed the limit).
      const asset = await this.commitAssetQuota(options.tenantId, actualSize, (tx) =>
        assetRepository.create({
          tenantId: options.tenantId,
          filename: options.storageKey.split("/").pop() ?? options.filename,
          originalFilename: options.originalFilename,
          mimeType: options.mimeType,
          size: actualSize,
          checksum: options.checksum,
          storageProvider: provider.name,
          storageKey: options.storageKey,
          publicUrl: canonicalPublicUrl,
          altText: options.altText,
          width: options.width,
          height: options.height,
        }, tx),
      );
      assetCommitted = true;

      await assetRepository.update(asset.id, {
        processingStatus: "READY",
        processingError: null,
      });

      if (options.entityType && options.entityId) {
        await assetRepository.createReference(
          asset.id,
          options.tenantId,
          options.entityType,
          options.entityId,
          options.entityField,
        );
      }

      this.emit("AssetUploaded", { assetId: asset.id, tenantId: options.tenantId, deduplicated: false });

      return { assetId: asset.id, url: canonicalPublicUrl, deduplicated: false };
    } catch (error) {
      // RCCF-70.5.1 — a registration failure that would leave an unreferenced
      // object behind is cleaned up here (ownership already established).
      // Cleanup must never mask the original error or expose storage internals.
      if (!assetCommitted) {
        await provider.delete(options.storageKey).catch(() => {
          logger.warn("Signed-upload registration cleanup failed", "media", {
            metadata: { tenantId: options.tenantId, storageKey: options.storageKey },
          });
        });
      }
      throw error;
    }
  }

  async replace(options: ReplaceOptions): Promise<UploadResult> {    const existing = await assetRepository.findById(options.assetId);
    if (!existing) throw new Error(`Asset not found: ${options.assetId}`);
    if (existing.status === "DELETED") throw new Error(`Cannot replace deleted asset: ${options.assetId}`);

    const validation = mediaValidator.validateReplacement(existing.mimeType, options.file);
    if (!validation.valid) {
      throw new MediaValidationError(validation.errors.join("; "), validation.errors);
    }

    // RCCF-59: hero replacements keep the same server-side constraints. RCCF-70.5.3
    // — only video payloads are subject to the hero-video contract; replacing a
    // poster/background image must not trigger video validation.
    if (existing.storageKey.includes("/hero/") && this.isVideoMime(options.file.mimeType)) {
      await this.assertHeroVideo(existing.tenantId, options.file);
    }

    const ext = options.file.filename.split(".").pop() || "bin";
    const storageKey = `${existing.tenantId}/replace/${randomUUID()}.${ext}`;

    // RCCF-35: replacement consumes quota for the net bytes added over the
    // existing asset. The Asset row keeps the prior size until reprocessing,
    // so only the delta above the replaced size needs headroom — and the check
    // must run BEFORE the old object is deleted, so an over-quota replace
    // leaves the original untouched.
    const netDelta = Math.max(0, (options.file.size ?? 0) - (existing.size ?? 0));
    await this.assertStorageQuota(existing.tenantId, netDelta);

    const provider = storageProviderFactory.getProvider();
    await provider.delete(existing.storageKey);
    const result = await provider.upload(storageKey, {
      filename: options.file.filename,
      mimeType: options.file.mimeType,
      buffer: options.file.buffer!,
    });

    const checksum = this.computeChecksum(options.file);
    // RCCF-59: record the ACTUAL stored size so replacement accounting stays
    // accurate (usage follows the new bytes, not the stale old size).
    await assetRepository.update(options.assetId, {
      filename: `${randomUUID()}.${ext}`,
      storageKey: result.storageKey,
      publicUrl: result.publicUrl,
      checksum,
      size: result.size,
      mimeType: options.file.mimeType,
    });

    // Re-process after replace so metadata + status stay fresh.
    await this.processAssetNow(options.assetId, options.file, result.size);

    this.emit("AssetReplaced", { assetId: options.assetId, tenantId: existing.tenantId });

    return { assetId: options.assetId, url: result.publicUrl, deduplicated: false };
  }

  async delete(assetId: string): Promise<void> {
    const asset = await assetRepository.findById(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);

    if (asset.referenceCount > 0) {
      throw new MediaReferenceError(
        `Cannot delete asset ${assetId}: ${asset.referenceCount} reference(s) exist`,
      );
    }

    await assetRepository.softDelete(assetId);
    this.emit("AssetDeleted", { assetId, tenantId: asset.tenantId });
  }

  async restore(assetId: string): Promise<void> {
    const asset = await assetRepository.findById(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);

    await assetRepository.restore(assetId);
    this.emit("AssetRestored", { assetId, tenantId: asset.tenantId });
  }

  async purge(assetId: string): Promise<void> {
    const asset = await assetRepository.findById(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);
    if (asset.status !== "DELETED") {
      throw new Error(`Asset ${assetId} must be soft-deleted before purge`);
    }

    const provider = storageProviderFactory.getProvider();
    await provider.delete(asset.storageKey);
    await assetRepository.removeAllReferences(assetId);
    await assetRepository.hardDelete(assetId);
    this.emit("AssetPurged", { assetId, tenantId: asset.tenantId });
  }

  /**
   * RCCF-67.3 — copy is tenant-scoped and quota-aware. The provider object is
   * ACTUALLY duplicated (new bytes), the new Asset row records its own size,
   * and `commitAssetQuota` reserves headroom atomically BEFORE the row/bytes
   * are created. A rejected copy throws before creating any row, so it never
   * leaves an orphaned provider object or consumes quota.
   */
  async copy(tenantId: string, assetId: string): Promise<UploadResult> {
    const original = await assetRepository.findById(assetId);
    if (!original || original.tenantId !== tenantId) throw new Error(`Asset not found: ${assetId}`);
    if (original.status === "DELETED") throw new Error(`Cannot copy deleted asset: ${assetId}`);

    const ext = original.storageKey.split(".").pop() || "bin";
    const storageKey = `${tenantId}/copies/${randomUUID()}.${ext}`;

    const provider = storageProviderFactory.getProvider();
    if (!provider.readRange) throw new MediaValidationError("Copy is not supported by this storage provider.");
    const bytes = await provider.readRange(original.storageKey, Number.MAX_SAFE_INTEGER);
    const mimeType = original.mimeType || "application/octet-stream";

    // Quota reserve BEFORE bytes/row exist — a rejected copy throws with no
    // orphan and no usage consumed.
    const asset = await this.commitAssetQuota(tenantId, bytes.length, (tx) =>
      assetRepository.create({
        tenantId,
        filename: `${randomUUID()}.${ext}`,
        originalFilename: `copy-of-${original.originalFilename}`,
        mimeType,
        size: bytes.length,
        checksum: original.checksum ?? undefined,
        storageProvider: provider.name,
        storageKey,
        publicUrl: original.publicUrl ?? undefined,
        altText: original.altText ?? undefined,
        width: original.width ?? undefined,
        height: original.height ?? undefined,
      }, tx),
    );

    const result = await provider.upload(storageKey, {
      filename: asset.filename,
      mimeType,
      buffer: bytes,
    });

    // Keep the row's size/url in sync with the actually-stored object.
    await assetRepository.update(asset.id, {
      publicUrl: result.publicUrl,
      size: result.size,
    });

    this.emit("AssetCopied", { assetId: asset.id, originalId: assetId, tenantId });

    return { assetId: asset.id, url: result.publicUrl, deduplicated: false };
  }

  async duplicate(tenantId: string, assetId: string): Promise<UploadResult> {
    return this.copy(tenantId, assetId);
  }

  /**
   * RCCF-67.3 — move is tenant-scoped and preserves quota (no new bytes, so no
   * duplicate charge). Moving an object into the `hero` folder re-runs the
   * canonical hero validation against the stored object, so a video can never
   * become a hero asset without satisfying 12MB / 15s / MP4 constraints.
   */
  async move(tenantId: string, assetId: string, newFolder: string): Promise<void> {
    const folderError = mediaValidator.validateFolder(newFolder);
    if (folderError) throw new MediaValidationError(folderError);

    const asset = await assetRepository.findById(assetId);
    if (!asset || asset.tenantId !== tenantId) throw new Error(`Asset not found: ${assetId}`);

    // RCCF-70.5.3 — moving an IMAGE into the hero folder is allowed; only video
    // assets are subject to the canonical hero-video validation.
    if (newFolder === "hero" && this.isVideoMime(asset.mimeType ?? "")) {
      await this.assertHeroVideoAsset(tenantId, assetId);
    }

    const filename = asset.storageKey.split("/").pop()!;
    const newStorageKey = `${tenantId}/${newFolder}/${filename}`;

    // Copy to new location, delete old — only after validation passes.
    const provider = storageProviderFactory.getProvider();
    const publicUrl = await provider.getPublicUrl(newStorageKey);
    if (!provider.readRange) throw new MediaValidationError("Move is not supported by this storage provider.");
    const bytes = await provider.readRange(asset.storageKey, Number.MAX_SAFE_INTEGER);
    await provider.upload(newStorageKey, {
      filename,
      mimeType: asset.mimeType,
      buffer: bytes,
    });
    await provider.delete(asset.storageKey);

    await assetRepository.update(assetId, {
      storageKey: newStorageKey,
      publicUrl,
    });

    this.emit("AssetMoved", { assetId, tenantId, newFolder });
  }

  async findUnused(tenantId: string) {
    return assetRepository.findUnreferenced(tenantId);
  }

  async cleanup(tenantId: string): Promise<number> {
    const unreferenced = await assetRepository.findUnreferenced(tenantId);
    let purged = 0;

    for (const asset of unreferenced) {
      try {
        await assetRepository.softDelete(asset.id);
        const provider = storageProviderFactory.getProvider();
        await provider.delete(asset.storageKey);
        await assetRepository.removeAllReferences(asset.id);
        await assetRepository.hardDelete(asset.id);
        purged++;
      } catch {
        // Skip assets that fail cleanup
      }
    }

    return purged;
  }

  async findDuplicates(tenantId: string, checksum: string) {
    return assetRepository.findDuplicates(tenantId, checksum);
  }

  async createReference(assetId: string, tenantId: string, entityType: string, entityId: string, field?: string) {
    const ref = await assetRepository.createReference(assetId, tenantId, entityType, entityId, field);
    this.emit("AssetReferenced", { assetId, tenantId, entityType, entityId });
    return ref;
  }

  async removeReference(assetId: string, entityType: string, entityId: string, field?: string) {
    await assetRepository.removeReference(assetId, entityType, entityId, field);
    this.emit("AssetDereferenced", { assetId, entityType, entityId });
  }

  async getPublicUrl(assetId: string): Promise<string | null> {
    const id = normalizeAssetId(assetId);
    if (!id) return null;

    const asset = await assetRepository.findById(id);
    if (!asset || asset.status === "DELETED") return null;

    if (asset.publicUrl) return asset.publicUrl;

    const provider = storageProviderFactory.getProvider();
    return provider.getPublicUrl(asset.storageKey);
  }

  async resolveUrls(assetIds: (string | null | undefined)[]): Promise<Record<string, string>> {
    // Never query Prisma with "", "null", "undefined", or a malformed id.
    const ids = filterValidAssetIds(assetIds);
    if (ids.length === 0) return {};

    const result: Record<string, string> = {};
    await Promise.all(ids.map(async (id) => {
      const url = await this.getPublicUrl(id);
      if (url) result[id] = url;
    }));
    return result;
  }

  async getById(assetId: string) {
    return assetRepository.findById(assetId);
  }

  async getVariants(assetId: string) {
    const asset = await assetRepository.findById(assetId);
    if (!asset) return null;

    return {
      original: asset.publicUrl,
      thumbnail: asset.thumbnailUrl,
      medium: asset.mediumUrl,
      large: asset.largeUrl,
    };
  }

  async generateVariants(_assetId: string): Promise<void> {
    // Reserved for future background worker implementation.
    // MEDIA-02 will implement variant generation via workers.
  }

  private computeChecksum(file: FileInfo): string {
    if (!file.buffer) return "";
    return createHash("sha256").update(file.buffer).digest("hex");
  }

  /**
   * RCCF-09: reject uploads that would exceed the tenant's declared storage
   * quota. Placed AFTER the dedupe check so a duplicate upload (which consumes
   * no new bytes) is never blocked for an over-quota tenant. This is a
   * fast-fail pre-check; the authoritative gate is commitAssetQuota.
   */
  private async assertStorageQuota(tenantId: string, incomingBytes: number): Promise<void> {
    const decision = await enforceStorageLimit({ tenantId, incomingBytes });
    if (!decision.ok) {
      throw new MediaValidationError(decision.reason ?? "Storage limit reached");
    }
  }

  /** Resolve the tenant's active plan code (server-authoritative). */
  private async resolvePlanCode(tenantId: string): Promise<string> {
    const plan = await resolveActivePlan(undefined, tenantId);
    return plan.code ?? DEFAULT_PLAN_CODE;
  }

  /**
   * RCCF-59 — authoritative atomic quota gate. Locks the tenant row so
   * concurrent uploads serialize, re-computes ACTIVE usage under the lock, and
   * runs `work` (which must create the asset row) only when the incoming bytes
   * fit. Throws MediaValidationError when the quota would be exceeded.
   */
  private async commitAssetQuota<T>(tenantId: string, incomingBytes: number, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "tenant" WHERE id = ${tenantId} FOR UPDATE`;
      const planCode = await this.resolvePlanCode(tenantId);
      const limit = resolveStorageLimitBytes(planCode);
      const used = await countStorageUsage(tenantId, tx);
      if (limit === null) {
        throw new MediaValidationError("Storage is not available on your current plan.");
      }
      if (!Number.isFinite(limit) || used + incomingBytes > limit) {
        throw new MediaValidationError(`Storage quota exceeded (${storageBytesToMb(used + incomingBytes).toFixed(1)} / ${storageBytesToMb(limit).toFixed(0)} MB).`);
      }
      return work(tx);
    });
  }

  /** RCCF-59 — hero video enforcement from an in-memory buffer (multipart). */
  private async assertHeroVideo(tenantId: string, file: FileInfo): Promise<void> {
    const planCode = await this.resolvePlanCode(tenantId);
    const rules = resolveHeroVideoCapability(planCode);
    if (!file.buffer) throw new MediaValidationError("Hero video requires a readable file buffer");
    const error = validateHeroVideo({ mimeType: file.mimeType, size: file.size, buffer: file.buffer, rules });
    if (error) throw new MediaValidationError(error);
  }

  /** RCCF-59 — hero video enforcement from the stored object (signed upload). */
  private async assertHeroVideoObject(tenantId: string, storageKey: string, originalFilename: string, size: number, provider: StorageProvider): Promise<void> {
    const planCode = await this.resolvePlanCode(tenantId);
    const rules = resolveHeroVideoCapability(planCode);
    if (!provider.readRange) {
      throw new MediaValidationError("Hero video validation is not available for this storage provider.");
    }
    const bytes = await provider.readRange(storageKey, rules.maxSizeBytes + 1);
    const error = validateHeroVideo({ mimeType: await this.probeMime(originalFilename), size, buffer: bytes, rules });
    if (error) throw new MediaValidationError(error);
  }

  /** RCCF-59 — fast-fail hero pre-check at signed-URL issuance (client-declared size only). */
  private async assertHeroVideoPrecheck(tenantId: string, mimeType: string, size: number): Promise<void> {
    const planCode = await this.resolvePlanCode(tenantId);
    const rules = resolveHeroVideoCapability(planCode);
    if (!rules.enabled) throw new MediaValidationError("Hero video is not available on your current plan.");
    if (size > rules.maxSizeBytes) {
      throw new MediaValidationError(`Hero video too large: ${(size / 1024 / 1024).toFixed(1)} MB. Maximum: ${(rules.maxSizeBytes / 1024 / 1024).toFixed(0)} MB.`);
    }
    void mimeType;
  }

  /**
   * RCCF-67.3 — authoritative hero-video validation of an EXISTING stored asset
   * (used by the hero write path + move-to-hero). Tenant ownership is enforced
   * here (findOwnedById), and the stored object bytes are re-read via the
   * provider so size/duration/format are server-verified — never client-trusted.
   * A raw external URL can never satisfy this, so hero video references must be
   * asset-backed.
   */
  async assertHeroVideoAsset(tenantId: string, assetId: string): Promise<void> {
    const asset = await assetRepository.findById(assetId);
    if (!asset || asset.tenantId !== tenantId) throw new MediaValidationError("Hero video asset not found");
    if (asset.status === "DELETED") throw new MediaValidationError("Hero video asset is not available");

    const planCode = await this.resolvePlanCode(tenantId);
    const rules = resolveHeroVideoCapability(planCode);
    const provider = storageProviderFactory.getProvider();
    if (!provider.readRange) {
      throw new MediaValidationError("Hero video validation is not available for this storage provider.");
    }
    const bytes = await provider.readRange(asset.storageKey, rules.maxSizeBytes + 1);
    const error = validateHeroVideo({
      mimeType: asset.mimeType,
      size: asset.size,
      buffer: bytes,
      rules,
    });
    if (error) throw new MediaValidationError(error);
  }

  /** Best-effort MIME from the filename (signed uploads only send metadata). */
  private async probeMime(filename: string): Promise<string> {
    const ext = (filename.split(".").pop() ?? "").toLowerCase();
    if (ext === "mov") return "video/quicktime";
    if (ext === "mp4") return "video/mp4";
    if (ext === "webm") return "video/webm";
    if (ext === "ogg") return "video/ogg";
    return "";
  }

  /** RCCF-70.5.3 — true when the mime declares a video payload. */
  private isVideoMime(mimeType: string): boolean {
    return mimeType.startsWith("video/");
  }

  /**
   * RCCF-70.5.3 — hero-folder classification. Any video signal (authoritative
   * provider content-type, client-declared mime, or video filename extension)
   * fails CLOSED toward hero-video validation, so a masqueraded payload can
   * never silently register as a poster/background image.
   */
  private async isVideoLike(providerMime: string | undefined, clientMime: string, filename: string): Promise<boolean> {
    if (this.isVideoMime(providerMime ?? "") || this.isVideoMime(clientMime)) return true;
    return this.isVideoMime(await this.probeMime(filename));
  }

  /**
   * Synchronous, best-effort asset processing run at upload/replace time.
   * Extracts image dimensions/color from the in-memory buffer so the asset is
   * immediately READY with metadata. Videos are marked READY directly (the
   * pipeline renders them; duration extraction is left to a worker).
   */
  private async processAssetNow(assetId: string, file: FileInfo, _storedSize: number): Promise<void> {
    const safeId = requireAssetId(assetId, { module: "media-service", field: "processAssetNow" });
    const mimeType = file.mimeType || "";
    const isImage = mimeType.startsWith("image/");

    let width: number | undefined;
    let height: number | undefined;
    let blurHash: string | undefined;
    let dominantColor: string | undefined;

    try {
      if (isImage && file.buffer) {
        const extracted = await imageProcessor.extractMetadata(file.buffer, mimeType);
        width = extracted.width;
        height = extracted.height;
        if (width && height) {
          blurHash = await imageProcessor.generateBlurHash(file.buffer);
          dominantColor = await imageProcessor.generateDominantColor(file.buffer);
        }
      }

      await assetRepository.update(safeId, {
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
        ...(blurHash ? { blurHash } : {}),
        ...(dominantColor ? { dominantColor } : {}),
        processingStatus: "READY",
        processingError: null,
      });
    } catch (error) {
      // Processing must never fail the upload — mark READY so the asset is usable.
      await assetRepository
        .update(safeId, {
          processingStatus: "READY",
          processingError: error instanceof Error ? error.message : "Processing failed",
        })
        .catch(() => {
          // noop — asset remains usable via publicUrl regardless
        });
    }
  }

  private emit(event: string, payload: Record<string, unknown>): void {
    try {
      (platformEventBus as unknown as { publish: (e: string, p: unknown) => void }).publish(event, payload);
    } catch {
      // Event emission is fire-and-forget
    }
  }
}

/**
 * RCCF-70.5.1 — the storageKey ownership boundary. The tenantId comes from the
 * server-side session authority (never the client); a storageKey is only ever
 * accepted when it is explicitly scoped under that tenant's prefix. Rejects
 * foreign, empty, malformed, and traversal-style keys before any provider
 * access, so an attacker can never reach another tenant's object or trigger a
 * cross-tenant deletion.
 */
function assertOwnedStorageKey(tenantId: string, storageKey: string): void {
  if (!tenantId || typeof storageKey !== "string" || storageKey.length === 0) {
    throw new MediaValidationError("Invalid storage key");
  }
  if (!storageKey.startsWith(`${tenantId}/`)) {
    throw new MediaValidationError("Storage key does not belong to the current tenant");
  }
  if (storageKey.includes("..") || storageKey.includes("\\") || storageKey.includes("\0")) {
    throw new MediaValidationError("Malformed storage key");
  }
}

export class MediaValidationError extends Error {
  readonly errors: string[];
  constructor(message: string, errors?: string[]) {
    super(message);
    this.name = "MediaValidationError";
    this.errors = errors ?? [];
  }
}

export class MediaReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaReferenceError";
  }
}

export const mediaService = new MediaService();
