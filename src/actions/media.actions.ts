"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mediaService } from "@/lib/media/service";
import { assetQueries } from "@/lib/media/repositories/asset-queries";
import { afterContentChange } from "@/lib/publishing/content-change";

async function requireTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}

export async function uploadAsset(formData: FormData): Promise<{
  success: boolean;
  assetId?: string;
  url?: string;
  error?: string;
}> {
  try {
    const tenantId = await requireTenant();

    const file = formData.get("file") as File | null;
    if (!file) return { success: false, error: "No file provided" };

    const folder = (formData.get("folder") as string) || "general";
    const entityType = (formData.get("entityType") as string) || undefined;
    const entityId = (formData.get("entityId") as string) || undefined;
    const entityField = (formData.get("entityField") as string) || undefined;
    const altText = (formData.get("altText") as string) || undefined;

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await mediaService.upload({
      tenantId,
      file: {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        buffer,
      },
      folder,
      entityType,
      entityId,
      entityField,
      altText,
    });

    // 01G-01F-A: same tenant-aggregate contract as all creator CMS writes
    await afterContentChange(tenantId);

    return { success: true, assetId: result.assetId, url: result.url };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Upload failed" };
  }
}

export async function deleteAsset(assetId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tenantId = await requireTenant();
    // VALIDATION-03: never delete another tenant's asset.
    const owned = await assetQueries.findOwnedById(assetId, tenantId);
    if (!owned) return { success: false, error: "Asset not found" };
    await mediaService.delete(assetId);
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Delete failed" };
  }
}
