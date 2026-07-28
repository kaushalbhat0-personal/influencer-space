import { supabaseAdmin } from "@/lib/supabase";

const BUCKET_NAME = "influencer-images";

function getClient() {
  if (!supabaseAdmin) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for storage operations");
  }
  return supabaseAdmin;
}

/**
 * Legacy storage service — only used by affiliate delete cleanup.
 * Will be removed when affiliates are migrated to MediaService.
 * @deprecated Use MediaService instead.
 */
export class StorageService {
  static async delete(path: string): Promise<void> {
    const client = getClient();
    const { error } = await client.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error("StorageService.delete error:", error.message);
      throw new Error(error.message);
    }
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
