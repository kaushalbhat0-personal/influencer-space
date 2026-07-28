import { prisma } from "@/lib/prisma";
import type { Asset, AssetReference } from "@/generated/prisma/client";

export interface AssetFilters {
  mimeType?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "updatedAt" | "filename" | "size";
  sortOrder?: "asc" | "desc";
}

export interface AssetWithReferences extends Asset {
  references: AssetReference[];
}

export class AssetQueries {
  async findById(id: string): Promise<AssetWithReferences | null> {
    return prisma.asset.findUnique({
      where: { id },
      include: { references: true },
    }) as Promise<AssetWithReferences | null>;
  }

  async findByTenant(tenantId: string, filters?: AssetFilters): Promise<{ assets: AssetWithReferences[]; total: number }> {
    const where: Record<string, unknown> = { tenantId };

    if (filters?.mimeType) {
      where.mimeType = { startsWith: filters.mimeType };
    }
    if (filters?.status) {
      where.status = filters.status;
    } else {
      where.status = "ACTIVE";
    }
    if (filters?.search) {
      where.OR = [
        { originalFilename: { contains: filters.search, mode: "insensitive" } },
        { filename: { contains: filters.search, mode: "insensitive" } },
        { altText: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const orderBy: Record<string, string> = {};
    orderBy[filters?.sortBy ?? "createdAt"] = filters?.sortOrder ?? "desc";

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: { references: true },
        orderBy,
        take: filters?.limit ?? 50,
        skip: filters?.offset ?? 0,
      }),
      prisma.asset.count({ where }),
    ]);

    return { assets: assets as AssetWithReferences[], total };
  }

  async findDuplicates(tenantId: string, checksum: string): Promise<AssetWithReferences[]> {
    return prisma.asset.findMany({
      where: { tenantId, checksum, status: "ACTIVE" },
      include: { references: true },
    }) as Promise<AssetWithReferences[]>;
  }

  async findUnreferenced(tenantId: string): Promise<AssetWithReferences[]> {
    return prisma.asset.findMany({
      where: { tenantId, referenceCount: 0, status: "ACTIVE" },
      include: { references: true },
    }) as Promise<AssetWithReferences[]>;
  }

  async findByEntity(entityType: string, entityId: string): Promise<AssetWithReferences[]> {
    return prisma.asset.findMany({
      where: {
        references: {
          some: { entityType, entityId },
        },
        status: "ACTIVE",
      },
      include: { references: true },
    }) as Promise<AssetWithReferences[]>;
  }

  async getReferenceCount(assetId: string): Promise<number> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { referenceCount: true },
    });
    return asset?.referenceCount ?? 0;
  }
}

export const assetQueries = new AssetQueries();
