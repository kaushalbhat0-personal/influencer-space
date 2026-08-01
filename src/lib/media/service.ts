import { randomUUID, createHash } from "crypto";
import { assetRepository } from "./repositories/asset-repository";
import { storageProviderFactory } from "./providers/factory";
import { mediaValidator, type FileInfo } from "./validator";
import { platformEventBus } from "@/lib/events";
import { processingQueue } from "./processing/queue";
import { filterValidAssetIds, normalizeAssetId } from "./resolve";

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

    // Queue async processing
    processingQueue.enqueue(asset.id).catch(() => {
      // Fire-and-forget — processing is non-critical for upload response
    });

    this.emit("AssetUploaded", { assetId: asset.id, tenantId: options.tenantId, deduplicated: false });

    return { assetId: asset.id, url: result.publicUrl, deduplicated: false };
  }

  async replace(options: ReplaceOptions): Promise<UploadResult> {
    const existing = await assetRepository.findById(options.assetId);
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
