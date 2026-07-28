import { prisma } from "@/lib/prisma";

export class ReferenceRepository {
  async create(assetId: string, tenantId: string, entityType: string, entityId: string, field?: string) {
    const existing = await prisma.assetReference.findUnique({
      where: { assetId_entityType_entityId_field: { assetId, entityType, entityId, field: field ?? "" } },
    });

    if (existing) return existing;

    const reference = await prisma.assetReference.create({
      data: { assetId, tenantId, entityType, entityId, field: field ?? null },
    });

    await prisma.asset.update({
      where: { id: assetId },
      data: { referenceCount: { increment: 1 } },
    });

    return reference;
  }

  async remove(assetId: string, entityType: string, entityId: string, field?: string) {
    await prisma.assetReference.deleteMany({
      where: { assetId, entityType, entityId, ...(field ? { field } : {}) },
    });

    const remaining = await prisma.assetReference.count({ where: { assetId } });
    await prisma.asset.update({
      where: { id: assetId },
      data: { referenceCount: remaining },
    });
  }

  async removeAll(assetId: string) {
    await prisma.assetReference.deleteMany({ where: { assetId } });
    await prisma.asset.update({
      where: { id: assetId },
      data: { referenceCount: 0 },
    });
  }

  async findByAsset(assetId: string) {
    return prisma.assetReference.findMany({ where: { assetId } });
  }

  async findByEntity(entityType: string, entityId: string) {
    return prisma.assetReference.findMany({ where: { entityType, entityId } });
  }

  async countByAsset(assetId: string): Promise<number> {
    return prisma.assetReference.count({ where: { assetId } });
  }
}

export const referenceRepository = new ReferenceRepository();
