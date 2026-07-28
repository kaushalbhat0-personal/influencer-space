import type { ImageProcessor, ProcessedMetadata } from "./types";

function createPixelHash(buffer: Buffer): string {
  // Extract a sampling of pixel-like data from the buffer to create a color.
  // This is a simplified approach — in production this would use Sharp + BlurHash.
  const sampleSize = Math.min(buffer.length, 1024);
  let r = 0, g = 0, b = 0, count = 0;

  for (let i = 0; i < sampleSize - 3; i += 4) {
    r += buffer[i] ?? 0;
    g += buffer[i + 1] ?? 0;
    b += buffer[i + 2] ?? 0;
    count++;
  }

  if (count === 0) return "#18181b";

  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function createSvgBlurHash(color: string): string {
  // Generate an inline SVG blur placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="${color}"/></svg>`;
  const encoded = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

export class BasicImageProcessor implements ImageProcessor {
  async extractMetadata(buffer: Buffer, mimeType: string): Promise<ProcessedMetadata> {
    const metadata: ProcessedMetadata = {};

    // Extract dimensions from image headers (JPEG, PNG, WebP, GIF)
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
      const dims = this.parseJpegDimensions(buffer);
      if (dims) { metadata.width = dims.width; metadata.height = dims.height; }
    } else if (mimeType === "image/png") {
      const dims = this.parsePngDimensions(buffer);
      if (dims) { metadata.width = dims.width; metadata.height = dims.height; }
    } else if (mimeType === "image/webp") {
      const dims = this.parseWebpDimensions(buffer);
      if (dims) { metadata.width = dims.width; metadata.height = dims.height; }
    } else if (mimeType === "image/gif") {
      const dims = this.parseGifDimensions(buffer);
      if (dims) { metadata.width = dims.width; metadata.height = dims.height; }
    }

    return metadata;
  }

  async generateBlurHash(buffer: Buffer): Promise<string> {
    const color = createPixelHash(buffer);
    return createSvgBlurHash(color);
  }

  async generateDominantColor(buffer: Buffer): Promise<string> {
    return createPixelHash(buffer);
  }

  async generateVariant(_buffer: Buffer, _variant: string, _width: number, _height: number): Promise<Buffer> {
    // In production, this would resize using Sharp.
    // For now, return the original buffer — variants will be generated
    // when a Sharp-based processor is configured.
    return _buffer;
  }

  async optimize(_buffer: Buffer, _format: "webp" | "avif" | "jpeg"): Promise<Buffer> {
    // In production, this would optimize using Sharp.
    // For now, return the original buffer.
    return _buffer;
  }

  private parseJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
    // JPEG dimensions are in SOF markers (start of frame)
    let offset = 2; // Skip SOI marker
    while (offset < buffer.length - 1) {
      if (buffer[offset] !== 0xFF) { offset++; continue; }
      const marker = buffer[offset + 1];
      if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
        if (offset + 9 <= buffer.length) {
          return {
            height: (buffer[offset + 5] << 8) | buffer[offset + 6],
            width: (buffer[offset + 7] << 8) | buffer[offset + 8],
          };
        }
      }
      const length = ((buffer[offset + 2] & 0xFF) << 8) | (buffer[offset + 3] & 0xFF);
      offset += 2 + length;
    }
    return null;
  }

  private parsePngDimensions(buffer: Buffer): { width: number; height: number } | null {
    // PNG IHDR chunk is at offset 16
    if (buffer.length < 24) return null;
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  private parseGifDimensions(buffer: Buffer): { width: number; height: number } | null {
    if (buffer.length < 10) return null;
    return {
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    };
  }

  private parseWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
    // WebP VP8/VP8L chunk
    if (buffer.length < 30) return null;
    const riff = buffer.toString("ascii", 0, 4);
    if (riff !== "RIFF") return null;
    const webp = buffer.toString("ascii", 8, 12);
    if (webp !== "WEBP") return null;

    const chunkType = buffer.toString("ascii", 12, 16);
    if (chunkType === "VP8 " && buffer.length >= 30) {
      // VP8 key frame header
      const w = ((buffer[26] & 0x3F) << 8) | (buffer[27] & 0xFF);
      const h = ((buffer[28] & 0x3F) << 8) | (buffer[29] & 0xFF);
      return { width: w, height: h };
    }
    if (chunkType === "VP8L" && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3FFF) + 1, height: ((bits >> 14) & 0x3FFF) + 1 };
    }
    return null;
  }
}

export const imageProcessor = new BasicImageProcessor();
