"use server";

import { GalleryService } from "@/lib/gallery/service";
import { BulkActionEngine, type BulkExecutor } from "@/lib/bulk/BulkActionEngine";
import type { FetchGalleryParams } from "@/lib/gallery/types";

const bulkExecutor: BulkExecutor = {
  publish: (ids, tenantId) => GalleryService.bulkPublish(ids, tenantId),
  archive: (ids, tenantId) => GalleryService.bulkArchive(ids, tenantId),
  delete: (ids, tenantId) => GalleryService.bulkDelete(ids, tenantId),
};

export const bulkEngine = new BulkActionEngine(bulkExecutor, "Gallery", "/admin/gallery");

export type GalleryItemData = import("@/lib/gallery/types").GalleryItemData;

export async function fetchGalleryItems(params: FetchGalleryParams) {
  try { const data = await GalleryService.fetch(params); return { success: true as const, data }; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to fetch gallery" }; }
}

export async function createGalleryItem(tenantId: string, data: Record<string, unknown>) {
  try { return await GalleryService.create(tenantId, data); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to create item" }; }
}

export async function updateExistingGalleryItem(tenantId: string, data: { id: string } & Record<string, unknown>) {
  try { return await GalleryService.update(tenantId, data); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to update item" }; }
}

export async function removeGalleryItem(id: string, tenantId: string) {
  try { return await GalleryService.delete(id, tenantId); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to delete item" }; }
}

export async function updateGalleryOrder(tenantId: string, updates: { id: string; order: number }[]) {
  try { return await GalleryService.reorder(tenantId, updates); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to reorder" }; }
}

export async function publishGalleryItem(id: string, tenantId: string) {
  try { return await GalleryService.publish(id, tenantId); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to publish" }; }
}

export async function unpublishGalleryItem(id: string, tenantId: string) {
  try { return await GalleryService.unpublish(id, tenantId); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to unpublish" }; }
}

export async function archiveGalleryItem(id: string, tenantId: string) {
  try { return await GalleryService.archive(id, tenantId); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to archive" }; }
}

export async function restoreGalleryItem(id: string, tenantId: string) {
  try { return await GalleryService.restore(id, tenantId); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to restore" }; }
}

export async function toggleFeatured(id: string, tenantId: string, isFeatured: boolean) {
  try { return await GalleryService.toggleFeatured(id, tenantId, isFeatured); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to toggle featured" }; }
}

export async function bulkPublishGallery(ids: string[], tenantId: string) {
  try { return await bulkEngine.execute("publish", ids, tenantId); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Bulk publish failed" }; }
}

export async function bulkArchiveGallery(ids: string[], tenantId: string) {
  try { return await bulkEngine.execute("archive", ids, tenantId); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Bulk archive failed" }; }
}

export async function bulkDeleteGallery(ids: string[], tenantId: string) {
  try { return await bulkEngine.execute("delete", ids, tenantId); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Bulk delete failed" }; }
}

export async function bulkFeatureGallery(ids: string[], tenantId: string, isFeatured: boolean) {
  try { return await GalleryService.bulkFeature(ids, tenantId, isFeatured); }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Bulk feature failed" }; }
}
