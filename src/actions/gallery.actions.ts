"use server";

import { GalleryService } from "@/lib/gallery/service";
import { galleryBulkEngine } from "@/lib/gallery/bulk";
import type { FetchGalleryParams } from "@/lib/gallery/types";
import { afterContentChange } from "@/lib/publishing/content-change";

export async function fetchGalleryItems(params: FetchGalleryParams) {
  try { const data = await GalleryService.fetch(params); return { success: true as const, data }; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to fetch gallery" }; }
}

export async function createGalleryItem(tenantId: string, data: Record<string, unknown>) {
  try { const result = await GalleryService.create(tenantId, data); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to create item" }; }
}

export async function updateExistingGalleryItem(tenantId: string, data: { id: string } & Record<string, unknown>) {
  try { const result = await GalleryService.update(tenantId, data); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to update item" }; }
}

export async function removeGalleryItem(id: string, tenantId: string) {
  try { const result = await GalleryService.delete(id, tenantId); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to delete item" }; }
}

export async function updateGalleryOrder(tenantId: string, updates: { id: string; order: number }[]) {
  try { const result = await GalleryService.reorder(tenantId, updates); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to reorder" }; }
}

export async function publishGalleryItem(id: string, tenantId: string) {
  try { const result = await GalleryService.publish(id, tenantId); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to publish" }; }
}

export async function unpublishGalleryItem(id: string, tenantId: string) {
  try { const result = await GalleryService.unpublish(id, tenantId); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to unpublish" }; }
}

export async function archiveGalleryItem(id: string, tenantId: string) {
  try { const result = await GalleryService.archive(id, tenantId); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to archive" }; }
}

export async function restoreGalleryItem(id: string, tenantId: string) {
  try { const result = await GalleryService.restore(id, tenantId); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to restore" }; }
}

export async function toggleFeatured(id: string, tenantId: string, isFeatured: boolean) {
  try { const result = await GalleryService.toggleFeatured(id, tenantId, isFeatured); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Failed to toggle featured" }; }
}

export async function bulkPublishGallery(ids: string[], tenantId: string) {
  try { const result = await galleryBulkEngine.execute("publish", ids, tenantId); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Bulk publish failed" }; }
}

export async function bulkArchiveGallery(ids: string[], tenantId: string) {
  try { const result = await galleryBulkEngine.execute("archive", ids, tenantId); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Bulk archive failed" }; }
}

export async function bulkDeleteGallery(ids: string[], tenantId: string) {
  try { const result = await galleryBulkEngine.execute("delete", ids, tenantId); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Bulk delete failed" }; }
}

export async function bulkFeatureGallery(ids: string[], tenantId: string, isFeatured: boolean) {
  try { const result = await GalleryService.bulkFeature(ids, tenantId, isFeatured); await afterContentChange(tenantId); return result; }
  catch (error) { return { success: false as const, error: error instanceof Error ? error.message : "Bulk feature failed" }; }
}
