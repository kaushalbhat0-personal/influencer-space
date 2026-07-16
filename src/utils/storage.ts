import { supabaseClient } from "@/lib/supabase";

const BUCKET_NAME = "influencer-images";

export function extractSupabaseFilePath(url: string, bucket: string = BUCKET_NAME): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    const bucketIndex = pathParts.indexOf(bucket);
    if (bucketIndex !== -1) {
      return pathParts.slice(bucketIndex + 1).join("/");
    }
    return null;
  } catch {
    return null;
  }
}

export async function deleteSupabaseFile(path: string): Promise<boolean> {
  try {
    const { error } = await supabaseClient.storage.from(BUCKET_NAME).remove([path]);
    return !error;
  } catch {
    return false;
  }
}
