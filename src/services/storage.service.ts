import { supabaseClient } from "@/lib/supabase";

const BUCKET_NAME = "influencer-images";

export class StorageService {
  static async upload(file: File, path: string): Promise<string> {
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

    return urlData.publicUrl;
  }

  static async delete(path: string): Promise<void> {
    const { error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) throw new Error(error.message);
  }

  static async deleteMultiple(paths: string[]): Promise<void> {
    const { error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove(paths);

    if (error) throw new Error(error.message);
  }

  static getPublicUrl(path: string): string {
    const { data } = supabaseClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);
    return data.publicUrl;
  }
}
