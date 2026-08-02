import { createClient } from "@supabase/supabase-js";
import type { StorageProvider, UploadInput, UploadResult, SignedUploadUrl } from "./interface";

const BUCKET = "influencer-images";

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase";
  readonly supportsSignedUpload = true;
  private client: ReturnType<typeof createClient>;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async createSignedUploadUrl(storageKey: string): Promise<SignedUploadUrl> {
    const { data, error } = await this.client.storage.from(BUCKET).createSignedUploadUrl(storageKey);
    if (error || !data) {
      throw new Error(`Supabase signed-upload URL failed: ${error?.message ?? "unknown"}`);
    }
    const { data: urlData } = this.client.storage.from(BUCKET).getPublicUrl(data.path);
    return {
      uploadUrl: data.signedUrl,
      storageKey: data.path,
      publicUrl: urlData.publicUrl,
    };
  }

  async upload(storageKey: string, input: UploadInput): Promise<UploadResult> {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .upload(storageKey, input.buffer, {
        contentType: input.mimeType,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const { data: urlData } = this.client.storage.from(BUCKET).getPublicUrl(data.path);

    return {
      storageKey: data.path,
      publicUrl: urlData.publicUrl,
      size: input.buffer.length,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const { error } = await this.client.storage.from(BUCKET).remove([storageKey]);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  }

  async deleteMany(storageKeys: string[]): Promise<{ removed: number; failed: string[] }> {
    if (storageKeys.length === 0) return { removed: 0, failed: [] };
    // Supabase remove() accepts up to 1000 keys per call; chunk for safety.
    const failed: string[] = [];
    let removed = 0;
    for (let i = 0; i < storageKeys.length; i += 900) {
      const chunk = storageKeys.slice(i, i + 900);
      const { data, error } = await this.client.storage.from(BUCKET).remove(chunk);
      if (error) {
        failed.push(...chunk);
      } else {
        removed += (data ?? []).length;
        // Keys Supabase did not return were already absent — still removed (404 state).
      }
    }
    return { removed, failed };
  }

  async getPublicUrl(storageKey: string): Promise<string> {
    const { data } = this.client.storage.from(BUCKET).getPublicUrl(storageKey);
    return data.publicUrl;
  }

  async list(prefix: string): Promise<string[]> {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .list(prefix, { limit: 100 });

    if (error) throw new Error(`Supabase list failed: ${error.message}`);
    return data.map((f) => `${prefix}/${f.name}`);
  }

  async exists(storageKey: string): Promise<boolean> {
    const { data, error } = await this.client.storage
      .from(BUCKET)
      .list(storageKey.split("/").slice(0, -1).join("/"), {
        limit: 1,
        search: storageKey.split("/").pop(),
      });

    if (error) return false;
    return data.length > 0;
  }
}
