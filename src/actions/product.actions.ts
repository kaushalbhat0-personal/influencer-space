"use server";

import { ProductService } from "@/lib/products/service";
import { BulkActionEngine } from "@/lib/bulk/BulkActionEngine";
import type { BulkExecutor } from "@/lib/bulk/BulkActionEngine";
import type { FetchProductsParams } from "@/lib/products/types";

const bulkExecutor: BulkExecutor = {
  publish: (ids, tenantId) => ProductService.bulkPublish(ids, tenantId).then((r) => ({ ...r, count: r.count ?? 0 })),
  archive: (ids, tenantId) => ProductService.bulkArchive(ids, tenantId).then((r) => ({ ...r, count: r.count ?? 0 })),
  delete: (ids, tenantId) => ProductService.bulkDelete(ids, tenantId).then((r) => ({ ...r, count: r.count ?? 0 })),
};

export const bulkEngine = new BulkActionEngine(bulkExecutor, "Product", "/admin/products");

export type ProductData = import("@/lib/products/types").ProductData;

export async function fetchProducts(params: FetchProductsParams) {
  try {
    const data = await ProductService.fetch(params);
    return { success: true as const, data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to fetch products" };
  }
}

export async function createNewProduct(tenantId: string, formData: FormData) {
  try {
    return await ProductService.create(tenantId, formData);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to create product" };
  }
}

export async function updateExistingProduct(tenantId: string, formData: FormData) {
  try {
    return await ProductService.update(tenantId, formData);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to update product" };
  }
}

export async function duplicateProduct(productId: string, tenantId: string) {
  try {
    return await ProductService.duplicate(productId, tenantId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to duplicate product" };
  }
}

export async function archiveProduct(productId: string, tenantId: string) {
  try {
    return await ProductService.archive(productId, tenantId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to archive product" };
  }
}

export async function restoreProduct(productId: string, tenantId: string) {
  try {
    return await ProductService.restore(productId, tenantId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to restore product" };
  }
}

export async function publishProduct(productId: string, tenantId: string) {
  try {
    return await ProductService.publish(productId, tenantId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to publish product" };
  }
}

export async function unpublishProduct(productId: string, tenantId: string) {
  try {
    return await ProductService.unpublish(productId, tenantId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to unpublish product" };
  }
}

export async function removeProduct(id: string, tenantId: string) {
  try {
    return await ProductService.delete(id, tenantId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to delete product" };
  }
}

export async function updateProductOrder(tenantId: string, updates: { id: string; order: number }[]) {
  try {
    return await ProductService.reorder(tenantId, updates);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to reorder products" };
  }
}

export async function toggleProductStatus(id: string, tenantId: string, isActive: boolean) {
  try {
    return await ProductService.toggleStatus(id, tenantId, isActive);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to toggle product" };
  }
}

export async function bulkPublish(ids: string[], tenantId: string) {
  try {
    return await bulkEngine.execute("publish", ids, tenantId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Bulk publish failed" };
  }
}

export async function bulkArchive(ids: string[], tenantId: string) {
  try {
    return await bulkEngine.execute("archive", ids, tenantId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Bulk archive failed" };
  }
}

export async function bulkDelete(ids: string[], tenantId: string) {
  try {
    return await bulkEngine.execute("delete", ids, tenantId);
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Bulk delete failed" };
  }
}

export async function uploadProductImage(tenantId: string, formData: FormData) {
  try {
    const file = formData.get("file") as File | null;
    if (!file) return { success: false as const, error: "No file provided" };

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const path = `${tenantId}/products/${timestamp}-${random}.${ext}`;

    const { supabaseClient } = await import("@/lib/supabase");
    const { data, error } = await supabaseClient.storage
      .from("influencer-space")
      .upload(path, buffer, { contentType: file.type, cacheControl: "3600", upsert: true });

    if (error) throw new Error(error.message);

    const { data: urlData } = supabaseClient.storage.from("influencer-space").getPublicUrl(data.path);
    return { success: true as const, url: urlData.publicUrl };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed to upload image" };
  }
}
