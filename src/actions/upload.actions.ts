"use server";

import { StorageService } from "@/services/storage.service";
import { getTenantContext } from "@/lib/tenant";

export type UploadResult =
  | { success: true; path: string; publicUrl: string }
  | { success: false; error: string };

async function requireTenant(): Promise<string> {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized — no tenant context");
  return tenant.id;
}

export async function uploadFile(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string;

    if (!file || !folder) {
      return { success: false, error: "Missing file or folder" };
    }

    const tenantId = await requireTenant();
    const result = await StorageService.upload(tenantId, file, folder);
    return { success: true, path: result.path, publicUrl: result.publicUrl };
  } catch (error) {
    console.error("uploadFile error:", error);
    return { success: false, error: String(error) };
  }
}
