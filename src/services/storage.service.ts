import { supabaseClient } from "@/lib/supabase";

const BUCKET_NAME = "influencer-images";

export interface UploadResult {
  path: string;
  publicUrl: string;
}

export class StorageService {
  static async upload(file: File, folder: string, filename?: string): Promise<UploadResult> {
    const ext = file.name.split(".").pop();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const name = filename || `${timestamp}-${random}`;
    const path = `${folder}/${name}.${ext}`;

    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw new Error(error.message);

    const { data: urlData } = supabaseClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return { path: data.path, publicUrl: urlData.publicUrl };
  }

  static async delete(path: string): Promise<void> {
    const { error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) throw new Error(error.message);
  }

  static async deleteMultiple(paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove(paths);

    if (error) throw new Error(error.message);
  }

  static async deleteFolder(folder: string): Promise<void> {
    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .list(folder);

    if (error) throw new Error(error.message);

    if (data && data.length > 0) {
      const paths = data.map((file) => `${folder}/${file.name}`);
      await this.deleteMultiple(paths);
    }
  }

  static getPublicUrl(path: string): string {
    const { data } = supabaseClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);
    return data.publicUrl;
  }

  static extractPathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const bucketIndex = pathParts.indexOf(BUCKET_NAME);
      if (bucketIndex !== -1) {
        return pathParts.slice(bucketIndex + 1).join("/");
      }
      return null;
    } catch {
      return null;
    }
  }
}
