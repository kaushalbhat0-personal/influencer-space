import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { FetchGalleryParams } from "./types";
import { findGalleryItems, findGalleryItemById } from "./queries";
import { requireAuth, requireFound } from "@/modules/workspace/application/workspace-permissions";
import { galleryCreateSchema } from "./validation";
import { getFirstValidationError } from "./validation";
import { enforceContentLimit } from "@/modules/billing/application/content-limit.enforcement";
import { FEATURE_IDS } from "@/lib/capabilities/constants";

export class GalleryService {
  static async fetch(params: FetchGalleryParams) {
    await requireAuth(params.tenantId);
    return findGalleryItems(params);
  }

  static async create(tenantId: string, data: Record<string, unknown>) {
    await requireAuth(tenantId);

    const parsed = galleryCreateSchema.safeParse(data);
    if (!parsed.success) return { success: false as const, error: getFirstValidationError(parsed.error) };

    const limit = await enforceContentLimit({ tenantId, featureKey: FEATURE_IDS.GALLERY });
    if (!limit.ok) return { success: false as const, error: limit.reason };

    const maxOrder = await prisma.galleryImage.aggregate({ where: { tenantId }, _max: { order: true } });

    const row = await prisma.$transaction(async (tx) => {
      const r = await tx.galleryImage.create({
        data: {
          tenantId,
          title: parsed.data.caption || parsed.data.altText || "Untitled",
          description: parsed.data.caption || null,
          altText: parsed.data.altText || null,
          imageUrl: parsed.data.isVideo ? "" : parsed.data.url,
          mediaType: parsed.data.isVideo ? "video" : "image",
          videoUrl: parsed.data.isVideo ? parsed.data.url : null,
          category: parsed.data.category || "general",
          tags: parsed.data.tags || null,
          status: parsed.data.status,
          isFeatured: parsed.data.isFeatured,
          order: (maxOrder._max.order ?? 0) + 1,
        },
      });
      await logAction(tenantId, "createGalleryItem", { itemId: r.id }, tx);
      return r;
    });

    revalidatePath("/admin/gallery");
    return { success: true as const, data: row };
  }

  static async update(tenantId: string, data: { id: string } & Record<string, unknown>) {
    await requireAuth(tenantId);
    const existing = await findGalleryItemById(data.id, tenantId);
    requireFound(existing);

    const row = await prisma.$transaction(async (tx) => {
      const r = await tx.galleryImage.update({
        where: { id: data.id },
        data: {
          title: (data.caption as string) ?? existing.title,
          description: (data.caption as string) ?? existing.description,
          altText: data.altText !== undefined ? (data.altText as string) : existing.altText,
          imageUrl: data.isVideo ? existing.imageUrl : ((data.url as string) ?? existing.imageUrl),
          videoUrl: data.isVideo ? ((data.url as string) ?? existing.videoUrl) : existing.videoUrl,
          mediaType: data.isVideo !== undefined ? (data.isVideo ? "video" : "image") : existing.mediaType,
          status: (data.status as string) ?? existing.status,
          isFeatured: data.isFeatured !== undefined ? Boolean(data.isFeatured) : existing.isFeatured,
          category: (data.category as string) ?? existing.category,
          tags: data.tags !== undefined ? (data.tags as string) : existing.tags,
          isActive: data.status === "PUBLISHED",
          archivedAt: data.status === "ARCHIVED" ? new Date() : data.status === "PUBLISHED" ? null : existing.archivedAt,
        },
      });
      await logAction(tenantId, "updateGalleryItem", { itemId: data.id }, tx);
      return r;
    });

    revalidatePath("/admin/gallery");
    return { success: true as const, data: row };
  }

  static async delete(id: string, tenantId: string) {
    await requireAuth(tenantId);
    const existing = await findGalleryItemById(id, tenantId);
    requireFound(existing);

    await prisma.$transaction(async (tx) => {
      await tx.galleryImage.delete({ where: { id } });
      await logAction(tenantId, "deleteGalleryItem", { itemId: id }, tx);
    });

    revalidatePath("/admin/gallery");
    return { success: true as const };
  }

  static async reorder(tenantId: string, updates: { id: string; order: number }[]) {
    await requireAuth(tenantId);
    await prisma.$transaction(updates.map((u) => prisma.galleryImage.update({ where: { id: u.id }, data: { order: u.order } })));
    await logAction(tenantId, "reorderGallery", { count: updates.length });
    revalidatePath("/admin/gallery");
    return { success: true as const };
  }

  static async publish(id: string, tenantId: string) {
    await requireAuth(tenantId);
    const existing = await findGalleryItemById(id, tenantId);
    requireFound(existing);
    await prisma.galleryImage.update({ where: { id }, data: { status: "PUBLISHED", isActive: true, archivedAt: null } });
    await logAction(tenantId, "publishGalleryItem", { itemId: id });
    revalidatePath("/admin/gallery");
    return { success: true as const };
  }

  static async unpublish(id: string, tenantId: string) {
    await requireAuth(tenantId);
    const existing = await findGalleryItemById(id, tenantId);
    requireFound(existing);
    await prisma.galleryImage.update({ where: { id }, data: { status: "DRAFT", isActive: false } });
    await logAction(tenantId, "unpublishGalleryItem", { itemId: id });
    revalidatePath("/admin/gallery");
    return { success: true as const };
  }

  static async archive(id: string, tenantId: string) {
    await requireAuth(tenantId);
    const existing = await findGalleryItemById(id, tenantId);
    requireFound(existing);
    await prisma.galleryImage.update({ where: { id }, data: { archivedAt: new Date(), status: "ARCHIVED", isActive: false } });
    await logAction(tenantId, "archiveGalleryItem", { itemId: id });
    revalidatePath("/admin/gallery");
    return { success: true as const };
  }

  static async restore(id: string, tenantId: string) {
    await requireAuth(tenantId);
    const existing = await findGalleryItemById(id, tenantId);
    requireFound(existing);
    await prisma.galleryImage.update({ where: { id }, data: { archivedAt: null, status: "DRAFT", isActive: false } });
    await logAction(tenantId, "restoreGalleryItem", { itemId: id });
    revalidatePath("/admin/gallery");
    return { success: true as const };
  }

  static async toggleFeatured(id: string, tenantId: string, isFeatured: boolean) {
    await requireAuth(tenantId);
    const existing = await findGalleryItemById(id, tenantId);
    requireFound(existing);
    await prisma.galleryImage.update({ where: { id }, data: { isFeatured } });
    await logAction(tenantId, "toggleFeatured", { itemId: id, isFeatured });
    revalidatePath("/admin/gallery");
    return { success: true as const };
  }

  static async bulkPublish(ids: string[], tenantId: string) {
    await requireAuth(tenantId);
    const result = await prisma.galleryImage.updateMany({ where: { id: { in: ids }, tenantId }, data: { status: "PUBLISHED", isActive: true, archivedAt: null } });
    await logAction(tenantId, "bulkPublishGallery", { count: result.count });
    revalidatePath("/admin/gallery");
    return { success: true as const, count: result.count };
  }

  static async bulkArchive(ids: string[], tenantId: string) {
    await requireAuth(tenantId);
    const result = await prisma.galleryImage.updateMany({ where: { id: { in: ids }, tenantId }, data: { archivedAt: new Date(), status: "ARCHIVED", isActive: false } });
    await logAction(tenantId, "bulkArchiveGallery", { count: result.count });
    revalidatePath("/admin/gallery");
    return { success: true as const, count: result.count };
  }

  static async bulkDelete(ids: string[], tenantId: string) {
    await requireAuth(tenantId);
    const result = await prisma.galleryImage.deleteMany({ where: { id: { in: ids }, tenantId } });
    await logAction(tenantId, "bulkDeleteGallery", { count: result.count });
    revalidatePath("/admin/gallery");
    return { success: true as const, count: result.count };
  }

  static async bulkFeature(ids: string[], tenantId: string, isFeatured: boolean) {
    await requireAuth(tenantId);
    const result = await prisma.galleryImage.updateMany({ where: { id: { in: ids }, tenantId }, data: { isFeatured } });
    await logAction(tenantId, isFeatured ? "bulkFeature" : "bulkUnfeature", { count: result.count });
    revalidatePath("/admin/gallery");
    return { success: true as const, count: result.count };
  }
}
