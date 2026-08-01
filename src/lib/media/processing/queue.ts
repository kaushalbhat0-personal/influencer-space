import { prisma } from "@/lib/prisma";
import type { ProcessingStatus } from "./types";
import { requireAssetId } from "@/lib/media/resolve";

/**
 * DB-based processing queue.
 * In production, this can be swapped for BullMQ, Trigger.dev, Inngest, etc.
 * The interface remains the same.
 */
export class DbProcessingQueue {
  async enqueue(assetId: string): Promise<void> {
    const safeId = requireAssetId(assetId, { module: "media-queue", field: "enqueue" });
    await prisma.asset.update({
      where: { id: safeId },
      data: { processingStatus: "QUEUED" },
    });
  }

  async dequeue(): Promise<string | null> {
    // Find next pending/queued asset and atomically claim it
    const asset = await prisma.asset.findFirst({
      where: { processingStatus: { in: ["PENDING", "QUEUED"] } },
      orderBy: { createdAt: "asc" },
    });

    if (!asset) return null;

    const safeId = requireAssetId(asset.id, { module: "media-queue", field: "dequeue" });
    await prisma.asset.update({
      where: { id: safeId },
      data: { processingStatus: "PROCESSING" },
    });

    return asset.id;
  }

  async acknowledge(assetId: string): Promise<void> {
    const safeId = requireAssetId(assetId, { module: "media-queue", field: "acknowledge" });
    await prisma.asset.update({
      where: { id: safeId },
      data: { processingStatus: "READY" },
    });
  }

  async fail(assetId: string, error: string): Promise<void> {
    const safeId = requireAssetId(assetId, { module: "media-queue", field: "fail" });
    await prisma.asset.update({
      where: { id: safeId },
      data: { processingStatus: "FAILED", processingError: error },
    });
  }

  async getStatus(assetId: string): Promise<ProcessingStatus> {
    const safeId = requireAssetId(assetId, { module: "media-queue", field: "getStatus" });
    const asset = await prisma.asset.findUnique({
      where: { id: safeId },
      select: { processingStatus: true },
    });
    return (asset?.processingStatus as ProcessingStatus) ?? "PENDING";
  }

  async getStats(tenantId: string): Promise<{
    pending: number;
    processing: number;
    ready: number;
    failed: number;
    total: number;
  }> {
    const [pending, processing, ready, failed, total] = await Promise.all([
      prisma.asset.count({ where: { tenantId, processingStatus: { in: ["PENDING", "QUEUED"] } } }),
      prisma.asset.count({ where: { tenantId, processingStatus: "PROCESSING" } }),
      prisma.asset.count({ where: { tenantId, processingStatus: "READY" } }),
      prisma.asset.count({ where: { tenantId, processingStatus: "FAILED" } }),
      prisma.asset.count({ where: { tenantId } }),
    ]);
    return { pending, processing, ready, failed, total };
  }
}

export const processingQueue = new DbProcessingQueue();
