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
      },
    });

    return { id: asset.id, url: result.publicUrl };
  }

  async getById(id: string): Promise<{ id: string; publicUrl: string | null; thumbnailUrl: string | null; altText: string | null; mimeType: string } | null> {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return null;
    return {
      id: asset.id,
      publicUrl: asset.publicUrl,
      thumbnailUrl: asset.thumbnailUrl,
      altText: asset.altText,
      mimeType: asset.mimeType,
    };
  }

  async listByTenant(tenantId: string): Promise<{ id: string; filename: string; mimeType: string; size: number; publicUrl: string | null; createdAt: Date }[]> {
    const assets = await prisma.asset.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { id: true, filename: true, mimeType: true, size: true, publicUrl: true, createdAt: true },
    });
    return assets;
  }

  async delete(id: string): Promise<boolean> {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) return false;
    if ((asset.referenceCount ?? 0) > 0) {
      throw new Error(`Asset ${id} has ${asset.referenceCount} references. Remove references before deleting.`);
    }
    await this.provider.delete(asset.storageKey);
    await prisma.asset.delete({ where: { id } });
    return true;
  }

  async resolveUrl(assetId: string): Promise<string | null> {
    const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { publicUrl: true } });
    return asset?.publicUrl || null;
  }

  async getByChecksum(tenantId: string, checksum: string): Promise<{ id: string; publicUrl: string | null } | null> {
    const asset = await prisma.asset.findFirst({
      where: { tenantId, checksum },
      select: { id: true, publicUrl: true },
    });
    return asset;
  }
}

export const assetRegistry = new AssetRegistry();
