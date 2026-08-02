import { randomUUID, createHash } from "crypto";
import { assetRepository } from "./repositories/asset-repository";
import { storageProviderFactory } from "./providers/factory";
import { mediaValidator, type FileInfo } from "./validator";
import { platformEventBus } from "@/lib/events";
import { imageProcessor } from "./processing/image-processor";
import { filterValidAssetIds, normalizeAssetId, requireAssetId } from "./resolve";

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

    const ext = options.file.filename.split(".").pop() || "bin";
    const storageKey = `${options.tenantId}/${folder}/${randomUUID()}.${ext}`;

    const provider = storageProviderFactory.getProvider();
    const result = await provider.upload(storageKey, {
      filename: options.file.filename,
      mimeType: options.file.mimeType,
      buffer: options.file.buffer!,
    });

    const asset = await assetRepository.create({
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

    // Verify the object actually landed in storage before registering it.
    const exists = await provider.exists(options.storageKey).catch(() => false);
    if (!exists) throw new Error("Uploaded file not found in storage; upload did not complete");

    const asset = await assetRepository.create({
      tenantId: options.tenantId,
      filename: options.storageKey.split("/").pop() ?? options.filename,
      originalFilename: options.originalFilename,
      mimeType: options.mimeType,
      size: options.size,
      checksum: options.checksum,
      storageProvider: provider.name,
      storageKey: options.storageKey,
      publicUrl: options.publicUrl,
      altText: options.altText,
      width: options.width,
      height: options.height,
    });

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

    return { assetId: asset.id, url: options.publicUrl, deduplicated: false };
  }

  async replace(options: ReplaceOptions): Promise<UploadResult> {    const existing = await assetRepository.findById(options.assetId);
    if (!existing) throw new Error(`Asset not found: ${options.assetId}`);
    if (existing.status === "DELETED") throw new Error(`Cannot replace deleted asset: ${options.assetId}`);

    const validation = mediaValidator.validateReplacement(existing.mimeType, options.file);
    if (!validation.valid) {
      throw new MediaValidationError(validation.errors.join("; "), validation.errors);
    }

    const ext = options.file.filename.split(".").pop() || "bin";
    const storageKey = `${existing.tenantId}/replace/${randomUUID()}.${ext}`;

    const provider = storageProviderFactory.getProvider();
    await provider.delete(existing.storageKey);
    const result = await provider.upload(storageKey, {
      filename: options.file.filename,
      mimeType: options.file.mimeType,
      buffer: options.file.buffer!,
    });

    const checksum = this.computeChecksum(options.file);
    await assetRepository.update(options.assetId, {
      filename: `${randomUUID()}.${ext}`,
      storageKey: result.storageKey,
      publicUrl: result.publicUrl,
      checksum,
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

  async copy(assetId: string): Promise<UploadResult> {
    const original = await assetRepository.findById(assetId);
    if (!original) throw new Error(`Asset not found: ${assetId}`);
    if (original.status === "DELETED") throw new Error(`Cannot copy deleted asset: ${assetId}`);

    const ext = original.storageKey.split(".").pop() || "bin";
    const storageKey = `${original.tenantId}/copies/${randomUUID()}.${ext}`;

    const provider = storageProviderFactory.getProvider();
    const publicUrl = await provider.getPublicUrl(original.storageKey);

    const asset = await assetRepository.create({
      tenantId: original.tenantId,
      filename: `${randomUUID()}.${ext}`,
      originalFilename: `copy-of-${original.originalFilename}`,
      mimeType: original.mimeType,
      size: original.size,
      checksum: original.checksum ?? undefined,
      storageProvider: provider.name,
      storageKey,
      publicUrl: original.publicUrl ?? undefined,
      altText: original.altText ?? undefined,
      width: original.width ?? undefined,
      height: original.height ?? undefined,
    });

    this.emit("AssetCopied", { assetId: asset.id, originalId: assetId, tenantId: original.tenantId });

    return { assetId: asset.id, url: publicUrl, deduplicated: false };
  }

  async duplicate(assetId: string): Promise<UploadResult> {
    return this.copy(assetId);
  }

  async move(assetId: string, newFolder: string): Promise<void> {
    const folderError = mediaValidator.validateFolder(newFolder);
    if (folderError) throw new MediaValidationError(folderError);

    const asset = await assetRepository.findById(assetId);
    if (!asset) throw new Error(`Asset not found: ${assetId}`);

    const filename = asset.storageKey.split("/").pop()!;
    const newStorageKey = `${asset.tenantId}/${newFolder}/${filename}`;

    // Copy to new location, delete old
    const provider = storageProviderFactory.getProvider();
    const publicUrl = await provider.getPublicUrl(asset.storageKey);
    await provider.delete(asset.storageKey);

    await assetRepository.update(assetId, {
      storageKey: newStorageKey,
      publicUrl,
    });

    this.emit("AssetMoved", { assetId, tenantId: asset.tenantId, newFolder });
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
   * Synchronous, best-effort asset processing run at upload/replace time.
   * Extracts image dimensions/color from the in-memory buffer so the asset is
   * immediately READY with metadata. Videos are marked READY directly (the
   * pipeline renders them; duration extraction is left to a worker).
   */
  private async processAssetNow(assetId: string, file: FileInfo, _storedSize: number): Promise<void> {
    const safeId = requireAssetId(assetId, { module: "media-service", field: "processAssetNow" });
    const mimeType = file.mimeType || "";
    const isImage = mimeType.startsWith("image/");
    const isVideo = mimeType.startsWith("video/");

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
