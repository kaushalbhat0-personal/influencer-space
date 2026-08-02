import { writeFile, unlink, mkdir, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { StorageProvider, UploadInput, UploadResult } from "./interface";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  readonly supportsSignedUpload = false;

  async upload(storageKey: string, input: UploadInput): Promise<UploadResult> {
    const fullPath = path.join(UPLOAD_DIR, storageKey);
    const dir = path.dirname(fullPath);

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    await writeFile(fullPath, input.buffer);

    return {
      storageKey,
      publicUrl: `/uploads/${storageKey}`,
      size: input.buffer.length,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const fullPath = path.join(UPLOAD_DIR, storageKey);
    try {
      await unlink(fullPath);
    } catch {
      // File already deleted or not found
    }
  }

  async getPublicUrl(storageKey: string): Promise<string> {
    return `/uploads/${storageKey}`;
  }

  async list(prefix: string): Promise<string[]> {
    const dirPath = path.join(UPLOAD_DIR, prefix);
    if (!existsSync(dirPath)) return [];
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => path.join(prefix, e.name));
  }

  async exists(storageKey: string): Promise<boolean> {
    return existsSync(path.join(UPLOAD_DIR, storageKey));
  }
}
