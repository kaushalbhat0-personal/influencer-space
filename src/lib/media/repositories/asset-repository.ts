import { assetQueries, type AssetFilters, type AssetWithReferences } from "./asset-queries";
import { assetCommands, type CreateAssetData, type UpdateAssetData } from "./asset-commands";
import { referenceRepository } from "./reference-repository";
import type { Prisma } from "@/generated/prisma/client";

export class AssetRepository {
  // ── Queries ───────────────────────────────────────────────

  async findById(id: string): Promise<AssetWithReferences | null> {
    return assetQueries.findById(id);
  }

  async findByTenant(tenantId: string, filters?: AssetFilters) {
    return assetQueries.findByTenant(tenantId, filters);
  }

  async findDuplicates(tenantId: string, checksum: string): Promise<AssetWithReferences[]> {
    return assetQueries.findDuplicates(tenantId, checksum);
  }

  async findUnreferenced(tenantId: string): Promise<AssetWithReferences[]> {
    return assetQueries.findUnreferenced(tenantId);
  }

  async findByEntity(entityType: string, entityId: string): Promise<AssetWithReferences[]> {
    return assetQueries.findByEntity(entityType, entityId);
  }

  async getReferenceCount(assetId: string): Promise<number> {
    return assetQueries.getReferenceCount(assetId);
  }

  // ── Commands ──────────────────────────────────────────────

async create(data: CreateAssetData, tx?: Prisma.TransactionClient) {
  return assetCommands.create(data, tx);
}

  async update(id: string, data: UpdateAssetData) {
    return assetCommands.update(id, data);
  }

  async softDelete(id: string) {
    return assetCommands.softDelete(id);
  }

  async restore(id: string) {
    return assetCommands.restore(id);
  }

  async hardDelete(id: string) {
    return assetCommands.hardDelete(id);
  }

  // ── References ────────────────────────────────────────────

  async createReference(assetId: string, tenantId: string, entityType: string, entityId: string, field?: string) {
    return referenceRepository.create(assetId, tenantId, entityType, entityId, field);
  }

  async removeReference(assetId: string, entityType: string, entityId: string, field?: string) {
    return referenceRepository.remove(assetId, entityType, entityId, field);
  }

  async removeAllReferences(assetId: string) {
    return referenceRepository.removeAll(assetId);
  }
}

export const assetRepository = new AssetRepository();
