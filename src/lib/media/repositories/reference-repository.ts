import { prisma } from "@/lib/prisma";
import { requireAssetId, normalizeAssetId } from "@/lib/media/resolve";

export class ReferenceRepository {
  async create(assetId: string, tenantId: string, entityType: string, entityId: string, field?: string) {
    const safeId = requireAssetId(assetId, { module: "reference-repository", field: "create" });
    const existing = await prisma.assetReference.findUnique({
      where: { assetId_entityType_entityId_field: { assetId: safeId, entityType, entityId, field: field ?? "" } },
    });

    if (existing) return existing;

    const reference = await prisma.assetReference.create({
      data: { assetId: safeId, tenantId, entityType, entityId, field: field ?? null },
    });

    await prisma.asset.update({
      where: { id: safeId },
      data: { referenceCount: { increment: 1 } },
    });

    return reference;
  }

  async remove(assetId: string, entityType: string, entityId: string, field?: string) {
    const safeId = requireAssetId(assetId, { module: "reference-repository", field: "remove" });
    await prisma.assetReference.deleteMany({
      where: { assetId: safeId, entityType, entityId, ...(field ? { field } : {}) },
    });

    const remaining = await prisma.assetReference.count({ where: { assetId: safeId } });
    await prisma.asset.update({
      where: { id: safeId },
      data: { referenceCount: remaining },
    });
  }

  async removeAll(assetId: string) {
    const safeId = requireAssetId(assetId, { module: "reference-repository", field: "removeAll" });
    await prisma.assetReference.deleteMany({ where: { assetId: safeId } });
    await prisma.asset.update({
      where: { id: safeId },
      data: { referenceCount: 0 },
    });
  }

  async findByAsset(assetId: string) {
    const safeId = normalizeAssetId(assetId, { module: "reference-repository", field: "findByAsset" });
    if (!safeId) return [];
    return prisma.assetReference.findMany({ where: { assetId: safeId } });
  }

  async findByEntity(entityType: string, entityId: string) {
    return prisma.assetReference.findMany({ where: { entityType, entityId } });
  }

  async countByAsset(assetId: string): Promise<number> {
    const safeId = normalizeAssetId(assetId, { module: "reference-repository", field: "countByAsset" });
    if (!safeId) return 0;
    return prisma.assetReference.count({ where: { assetId: safeId } });
  }
}

export const referenceRepository = new ReferenceRepository();
