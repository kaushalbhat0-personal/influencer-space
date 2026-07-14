"use server";

import { StorageService } from "@/services/storage.service";

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
  try {
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string;

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
