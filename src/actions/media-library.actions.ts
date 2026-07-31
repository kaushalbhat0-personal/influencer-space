"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assetRepository } from "@/lib/media/repositories/asset-repository";
import { mediaService } from "@/lib/media/service";
import { uploadAsset } from "./media.actions";
import { afterContentChange } from "@/lib/publishing/content-change";

async function requireTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}

export async function listAssets(params?: {
  search?: string;
  mimeType?: string;
  status?: string;
  sortBy?: "createdAt" | "updatedAt" | "filename" | "size";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}) {
  try {
    const tenantId = await requireTenant();
    const result = await assetRepository.findByTenant(tenantId, {
      search: params?.search,
      mimeType: params?.mimeType,
      status: params?.status ?? "ACTIVE",
      sortBy: params?.sortBy ?? "createdAt",
      sortOrder: params?.sortOrder ?? "desc",
      limit: params?.limit ?? 50,
      offset: params?.offset ?? 0,
    });
    return { success: true, ...result };
  } catch (error) {
    return { success: false, assets: [], total: 0, error: error instanceof Error ? error.message : "Failed to list assets" };
  }
}

export async function getAsset(assetId: string) {
  try {
    await requireTenant();
    const asset = await assetRepository.findById(assetId);
    return { success: true, asset };
  } catch (error) {
    return { success: false, asset: null, error: error instanceof Error ? error.message : "Failed to get asset" };
  }
}

export async function deleteAssetFromLibrary(assetId: string) {
  try {
    const tenantId = await requireTenant();
    await mediaService.delete(assetId);
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Delete failed" };
  }
}

export async function purgeAsset(assetId: string) {
  try {
    const tenantId = await requireTenant();
    await mediaService.purge(assetId);
    await afterContentChange(tenantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Purge failed" };
  }
}

export async function replaceAsset(assetId: string, formData: FormData) {
  try {
    const tenantId = await requireTenant();
    const file = formData.get("file") as File | null;
    if (!file) return { success: false, error: "No file provided" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mediaService.replace({
      assetId,
      file: { filename: file.name, mimeType: file.type, size: file.size, buffer },
    });
    await afterContentChange(tenantId);

    return { success: true, url: result.url };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Replace failed" };
  }
}

export { uploadAsset as uploadToLibrary };
