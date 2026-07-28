export type ProcessingStatus = "PENDING" | "QUEUED" | "PROCESSING" | "READY" | "FAILED";

export interface ProcessedMetadata {
  width?: number;
  height?: number;
  duration?: number;
  blurHash?: string;
  dominantColor?: string;
  orientation?: number;
  hasAlpha?: boolean;
  isAnimated?: boolean;
}

export interface ImageProcessor {
  extractMetadata(buffer: Buffer, mimeType: string): Promise<ProcessedMetadata>;
  generateBlurHash(buffer: Buffer): Promise<string>;
  generateDominantColor(buffer: Buffer): Promise<string>;
  generateVariant(buffer: Buffer, variant: string, width: number, height: number): Promise<Buffer>;
  optimize(buffer: Buffer, format: "webp" | "avif" | "jpeg"): Promise<Buffer>;
}

export interface VideoProcessor {
  extractMetadata(buffer: Buffer, mimeType: string): Promise<ProcessedMetadata>;
  generateThumbnail(buffer: Buffer, atSeconds: number): Promise<Buffer>;
  generateBlurHash(buffer: Buffer): Promise<string>;
}

export interface AssetProcessingQueue {
  enqueue(assetId: string): Promise<void>;
  dequeue(): Promise<string | null>;
  acknowledge(assetId: string): Promise<void>;
  fail(assetId: string, error: string): Promise<void>;
  getStatus(assetId: string): Promise<ProcessingStatus>;
}
