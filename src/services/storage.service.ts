import { supabaseClient, supabaseAdmin } from "@/lib/supabase";

const BUCKET_NAME = "influencer-images";

export interface UploadResult {
  path: string;
  publicUrl: string;
}

function getClient() {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for storage operations");
  }
  return supabaseAdmin;
}

export class StorageService {
  static async upload(file: File, folder: string, filename?: string): Promise<UploadResult> {
    console.log("☁️ StorageService.upload — file:", file.name, "size:", file.size, "folder:", folder);
    const client = getClient();
    const ext = file.name.split(".").pop();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const name = filename || `${timestamp}-${random}`;
    const path = `${folder}/${name}.${ext}`;

    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("☁️ StorageService.upload error:", error.message);
      throw new Error(error.message);
    }

    const { data: urlData } = supabaseClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log("☁️ StorageService.upload success — path:", data.path, "url:", urlData.publicUrl);
    return { path: data.path, publicUrl: urlData.publicUrl };
  }

  static async delete(path: string): Promise<void> {
    console.log("☁️ StorageService.delete — path:", path);
    const client = getClient();
    const { error } = await client.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error("☁️ StorageService.delete error:", error.message);
      throw new Error(error.message);
    }
    console.log("☁️ StorageService.delete success");
  }

  static async deleteMultiple(paths: string[]): Promise<void> {
    if (paths.length === 0) {
      console.log("☁️ StorageService.deleteMultiple — no paths, skipping");
      return;
    }
    console.log("☁️ StorageService.deleteMultiple — paths:", paths);
    const client = getClient();
    const { error } = await client.storage
      .from(BUCKET_NAME)
      .remove(paths);

    if (error) {
      console.error("☁️ StorageService.deleteMultiple error:", error.message);
      throw new Error(error.message);
    }
    console.log("☁️ StorageService.deleteMultiple success");
  }

  static async deleteFolder(folder: string): Promise<void> {
    console.log("☁️ StorageService.deleteFolder — folder:", folder);
    const client = getClient();
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .list(folder);

    if (error) {
      console.error("☁️ StorageService.deleteFolder list error:", error.message);
      throw new Error(error.message);
    }

    if (data && data.length > 0) {
      const paths = data.map((file) => `${folder}/${file.name}`);
      console.log("☁️ StorageService.deleteFolder — deleting", paths.length, "files");
      await this.deleteMultiple(paths);
    } else {
      console.log("☁️ StorageService.deleteFolder — folder empty or not found");
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
