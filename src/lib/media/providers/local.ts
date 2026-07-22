import type { StorageProvider, UploadInput, UploadResult, DeleteResult } from "./interface";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";

  async upload(input: UploadInput): Promise<UploadResult> {
    const ext = path.extname(input.filename) || ".bin";
    const storageKey = `${input.folder || "general"}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const fullPath = path.join(UPLOAD_DIR, storageKey);

    if (!existsSync(path.dirname(fullPath))) {
      await mkdir(path.dirname(fullPath), { recursive: true });
    }

    await writeFile(fullPath, input.buffer);

    return {
      storageKey,
      publicUrl: `/uploads/${storageKey}`,
      size: input.buffer.length,
    };
  }

  async delete(storageKey: string): Promise<DeleteResult> {
    const fullPath = path.join(UPLOAD_DIR, storageKey);
    try {
      await unlink(fullPath);
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  getPublicUrl(storageKey: string): string {
    return `/uploads/${storageKey}`;
  }
}
