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
    const ext = input.filename.split(".").pop() || "bin";
    const storageKey = `${tenantId}/general/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const result = await this.provider.upload(storageKey, {
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
        storageProvider: this.provider.name,
        storageKey: result.storageKey,
        publicUrl: result.publicUrl,
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

  /** Track a reference from a business entity to an asset. */
  async addReference(params: { assetId: string; tenantId: string; entityType: string; entityId: string; field?: string }): Promise<void> {
    await prisma.assetReference.upsert({
      where: { assetId_entityType_entityId_field: { assetId: params.assetId, entityType: params.entityType, entityId: params.entityId, field: params.field ?? "" } },
      create: {
        assetId: params.assetId,
        tenantId: params.tenantId,
        entityType: params.entityType,
        entityId: params.entityId,
        field: params.field ?? null,
      },
      update: {},
    });
    await prisma.asset.update({
      where: { id: params.assetId },
      data: { referenceCount: { increment: 1 } },
    });
  }

  /** Remove a reference. */
  async removeReference(assetId: string, entityType: string, entityId: string): Promise<void> {
    await prisma.assetReference.deleteMany({
      where: { assetId, entityType, entityId },
    });
    const remaining = await prisma.assetReference.count({ where: { assetId } });
    await prisma.asset.update({
      where: { id: assetId },
      data: { referenceCount: remaining },
    });
  }

  /** Get all references for an asset. */
  async getReferences(assetId: string) {
    return prisma.assetReference.findMany({
      where: { assetId },
      select: { id: true, entityType: true, entityId: true, field: true, createdAt: true },
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
