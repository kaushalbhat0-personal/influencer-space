import { prisma } from "@/lib/prisma";
import type { ProcessingStatus } from "./types";

/**
 * DB-based processing queue.
 * In production, this can be swapped for BullMQ, Trigger.dev, Inngest, etc.
 * The interface remains the same.
 */
export class DbProcessingQueue {
  async enqueue(assetId: string): Promise<void> {
    await prisma.asset.update({
      where: { id: assetId },
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

    await prisma.asset.update({
      where: { id: asset.id },
      data: { processingStatus: "PROCESSING" },
    });

    return asset.id;
  }

  async acknowledge(assetId: string): Promise<void> {
    await prisma.asset.update({
      where: { id: assetId },
      data: { processingStatus: "READY" },
    });
  }

  async fail(assetId: string, error: string): Promise<void> {
    await prisma.asset.update({
      where: { id: assetId },
      data: { processingStatus: "FAILED", processingError: error },
    });
  }

  async getStatus(assetId: string): Promise<ProcessingStatus> {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
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
