import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

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
    return prisma.asset.update({
      where: { id },
      data: data as Prisma.AssetUpdateInput,
    });
  }

  async softDelete(id: string) {
    return prisma.asset.update({
      where: { id },
      data: { status: "DELETED" },
    });
  }

  async restore(id: string) {
    return prisma.asset.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
  }

  async hardDelete(id: string) {
    return prisma.asset.delete({ where: { id } });
  }
}

export const assetCommands = new AssetCommands();
