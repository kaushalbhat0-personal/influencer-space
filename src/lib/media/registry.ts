import { prisma } from "@/lib/prisma";
import { LocalStorageProvider } from "./providers/local";
import type { StorageProvider } from "./providers/interface";

export type { StorageProvider, UploadInput } from "./providers/interface";

export class AssetRegistry {
  private provider: StorageProvider;

  constructor(provider?: StorageProvider) {
    this.provider = provider || new LocalStorageProvider();
  }

  async upload(tenantId: string, input: { filename: string; mimeType: string; buffer: Buffer; altText?: string }): Promise<{ id: string; url: string }> {
    const result = await this.provider.upload({
      filename: input.filename,
      mimeType: input.mimeType,
      buffer: input.buffer,
    });

    const asset = await prisma.asset.create({
      data: {
        tenantId,
        filename: result.storageKey.split("/").pop() || input.filename,
        originalFilename: input.filename,
        mimeType: input.mimeType,
        size: result.size,
        width: result.width,
        height: result.height,
        storageProvider: this.provider.name,
        storageKey: result.storageKey,
        publicUrl: result.publicUrl,
        thumbnailUrl: result.thumbnailUrl,
        altText: input.altText || null,
        status: "ACTIVE",
      },
    });

    return { id: asset.id, url: result.publicUrl };
  }

  async getById(id: string): Promise<{ id: string; publicUrl: string | null; thumbnailUrl: string | null; altText: string | null; mimeType: string; status: string } | null> {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return null;
    return {
      id: asset.id,
      publicUrl: asset.publicUrl,
      thumbnailUrl: asset.thumbnailUrl,
      altText: asset.altText,
      mimeType: asset.mimeType,
      status: asset.status,
    };
  }

  async listByTenant(tenantId: string) {
    return prisma.asset.findMany({
      where: { tenantId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true, mimeType: true, size: true, publicUrl: true, status: true, createdAt: true, referenceCount: true },
    });
  }

  /** Soft-delete: mark as DELETED instead of physical removal. */
  async delete(id: string): Promise<boolean> {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return false;
    if ((asset.referenceCount ?? 0) > 0) {
      throw new Error(`Asset ${id} has ${asset.referenceCount} references. Remove references before deleting.`);
    }
    await prisma.asset.update({
      where: { id },
      data: { status: "DELETED" },
    });
    return true;
  }

  /** Physical delete — called by cleanup job for assets in DELETED status with 0 references. */
  async purge(id: string): Promise<boolean> {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return false;
    if (asset.status !== "DELETED") {
      throw new Error(`Asset ${id} is not in DELETED status. Use delete() first.`);
    }
    await this.provider.delete(asset.storageKey);
    await prisma.assetReference.deleteMany({ where: { assetId: id } });
    await prisma.asset.delete({ where: { id } });
    return true;
  }

  /** Track a reference from a block/section/page to an asset. */
  async addReference(params: { assetId: string; tenantId: string; pageId?: string; sectionId?: string; blockId?: string; field?: string }): Promise<void> {
    await prisma.assetReference.create({
      data: {
        assetId: params.assetId,
        tenantId: params.tenantId,
        pageId: params.pageId || null,
        sectionId: params.sectionId || null,
        blockId: params.blockId || null,
        field: params.field || null,
      },
    });
    await prisma.asset.update({
      where: { id: params.assetId },
      data: { referenceCount: { increment: 1 } },
    });
  }

  /** Remove a reference. */
  async removeReference(referenceId: string): Promise<void> {
    const ref = await prisma.assetReference.findUnique({ where: { id: referenceId } });
    if (!ref) return;
    await prisma.assetReference.delete({ where: { id: referenceId } });
    await prisma.asset.update({
      where: { id: ref.assetId },
      data: { referenceCount: { decrement: 1 } },
    });
  }

  /** Get all references for an asset. */
  async getReferences(assetId: string) {
    return prisma.assetReference.findMany({
      where: { assetId },
      select: { id: true, pageId: true, sectionId: true, blockId: true, field: true, createdAt: true },
    });
  }

  /** Check if an asset is referenced. */
  async isReferenced(assetId: string): Promise<boolean> {
    const count = await prisma.assetReference.count({ where: { assetId } });
    return count > 0;
  }

  async resolveUrl(assetId: string): Promise<string | null> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId, status: "ACTIVE" },
      select: { publicUrl: true },
    });
    return asset?.publicUrl || null;
  }

  async getByChecksum(tenantId: string, checksum: string): Promise<{ id: string; publicUrl: string | null } | null> {
    const asset = await prisma.asset.findFirst({
      where: { tenantId, checksum },
      select: { id: true, publicUrl: true },
    });
    return asset;
  }

  /** List assets ready for physical cleanup. */
  async listDeletedAssets(before: Date = new Date()): Promise<{ id: string; storageKey: string }[]> {
    return prisma.asset.findMany({
      where: { status: "DELETED", updatedAt: { lte: before }, referenceCount: 0 },
      select: { id: true, storageKey: true },
    });
  }
}

export const assetRegistry = new AssetRegistry();
