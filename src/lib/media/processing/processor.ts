import { prisma } from "@/lib/prisma";
import { storageProviderFactory } from "@/lib/media/providers/factory";
import { imageProcessor } from "./image-processor";
import { processingQueue } from "./queue";
import { requireAssetId } from "@/lib/media/resolve";
import type { ImageProcessor as ImageProcessorInterface } from "./types";

export class AssetProcessor {
  private imageProc: ImageProcessorInterface;
  private running = false;

  constructor(imageProc?: ImageProcessorInterface) {
    this.imageProc = imageProc ?? imageProcessor;
  }

  async processAsset(assetId: string): Promise<void> {
    const safeId = requireAssetId(assetId, { module: "media-processor", field: "processAsset" });
    const asset = await prisma.asset.findUnique({ where: { id: safeId } });
    if (!asset) throw new Error(`Asset not found: ${assetId}`);

    const isImage = asset.mimeType.startsWith("image/");
    const isVideo = asset.mimeType.startsWith("video/");
    const isProcessable = isImage || isVideo;

    if (!isProcessable) {
      await processingQueue.acknowledge(assetId);
      return;
    }

    try {
      const provider = storageProviderFactory.getProvider();
      const storageKey = asset.storageKey;

      // For local provider, read from filesystem
      // For Supabase, we'd need to download the file
      // For now, extract metadata from the buffer if available, or skip
      let imgWidth: number | undefined;
      let imgHeight: number | undefined;
      let blurHash: string | undefined;
      let dominantColor: string | undefined;

      if (isImage) {
        // Try to read from local storage
        if (provider.name === "local") {
          const fs = await import("fs/promises");
          const pathModule = await import("path");
          const uploadDir = pathModule.join(process.cwd(), "public", "uploads");
          const filePath = pathModule.join(uploadDir, storageKey);

          try {
            const buffer = await fs.readFile(filePath);
            const extracted = await this.imageProc.extractMetadata(buffer, asset.mimeType);
            imgWidth = extracted.width;
            imgHeight = extracted.height;

            if (imgWidth && imgHeight) {
              blurHash = await this.imageProc.generateBlurHash(buffer);
              dominantColor = await this.imageProc.generateDominantColor(buffer);
            }
          } catch {
            // Can't read file — skip metadata extraction
          }
        } else {
          // For Supabase, metadata may have been set during upload
        }
      }

      await prisma.asset.update({
        where: { id: safeId },
        data: {
          width: imgWidth ?? asset.width ?? null,
          height: imgHeight ?? asset.height ?? null,
          blurHash: blurHash ?? null,
          dominantColor: dominantColor ?? null,
          processingStatus: "READY",
          processingError: null,
        },
      });
    } catch (error) {
      await processingQueue.fail(
        assetId,
        error instanceof Error ? error.message : "Processing failed",
      );
    }
  }

  async processNext(): Promise<boolean> {
    const assetId = await processingQueue.dequeue();
    if (!assetId) return false;

    await this.processAsset(assetId);
    return true;
  }

  async processAllPending(): Promise<number> {
    let processed = 0;
    while (await this.processNext()) {
      processed++;
    }
    return processed;
  }

  startPolling(intervalMs = 5000): void {
    if (this.running) return;
    this.running = true;

    const poll = async () => {
      if (!this.running) return;
      try {
        await this.processNext();
      } catch {
        // Log and continue
      }
      setTimeout(poll, intervalMs);
    };

    poll();
  }

  stop(): void {
    this.running = false;
  }
}

export const assetProcessor = new AssetProcessor();
