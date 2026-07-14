"use server";

import { StorageService } from "@/services/storage.service";
import { supabaseAdmin } from "@/lib/supabase";

export type UploadResult = {
  success: true;
  path: string;
  publicUrl: string;
} | {
  success: false;
  error: string;
};

export async function uploadFile(formData: FormData): Promise<UploadResult> {
  console.log("📤 uploadFile called");
  console.log("🔑 supabaseAdmin exists:", !!supabaseAdmin);
  try {
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string;

    console.log("📁 File:", file?.name, "type:", file?.type, "size:", file?.size, "folder:", folder);

    if (!file || !folder) {
      console.log("📤 uploadFile — missing file or folder");
      return { success: false, error: "Missing file or folder" };
    }

    const result = await StorageService.upload(file, folder);
    console.log("📤 uploadFile success — url:", result.publicUrl);
    return { success: true, path: result.path, publicUrl: result.publicUrl };
  } catch (error) {
    console.error("📤 uploadFile error:", error);
    return { success: false, error: String(error) };
  }
}
