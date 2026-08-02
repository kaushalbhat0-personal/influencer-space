import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireAssetId } from "@/lib/media/resolve";

export interface CreateAssetData {
  tenantId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  checksum?: string;
  storageProvider: string;
  storageKey: string;
  publicUrl?: string;
  altText?: string;
  width?: number;
  height?: number;
  processingStatus?: string;
}

export interface UpdateAssetData {
  filename?: string;
  altText?: string;
  width?: number;
  height?: number;
  publicUrl?: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
  storageKey?: string;
  checksum?: string;
  blurHash?: string;
  dominantColor?: string;
  processingStatus?: string;
  processingError?: string | null;
}

export class AssetCommands {
  async create(data: CreateAssetData) {
    return prisma.asset.create({
      data: {
        tenantId: data.tenantId,
        filename: data.filename,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        size: data.size,
        checksum: data.checksum ?? null,
        storageProvider: data.storageProvider,
        storageKey: data.storageKey,
        publicUrl: data.publicUrl ?? null,
        altText: data.altText ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
      },
    });
  }

  async update(id: string, data: UpdateAssetData) {
    const safeId = requireAssetId(id, { module: "asset-commands", field: "update" });
    return prisma.asset.update({
      where: { id: safeId },
      data: data as Prisma.AssetUpdateInput,
    });
  }

  async softDelete(id: string) {
    const safeId = requireAssetId(id, { module: "asset-commands", field: "softDelete" });
    return prisma.asset.update({
      where: { id: safeId },
      data: { status: "DELETED" },
    });
  }

  async restore(id: string) {
    const safeId = requireAssetId(id, { module: "asset-commands", field: "restore" });
    return prisma.asset.update({
      where: { id: safeId },
      data: { status: "ACTIVE" },
    });
  }

  async hardDelete(id: string) {
    const safeId = requireAssetId(id, { module: "asset-commands", field: "hardDelete" });
    return prisma.asset.delete({ where: { id: safeId } });
  }
}

export const assetCommands = new AssetCommands();
