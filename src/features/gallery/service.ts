import { prisma } from "@/lib/prisma";
import type { GalleryItemData, GalleryFormInput } from "./types";

export const galleryService = {
  async list(tenantId: string): Promise<GalleryItemData[]> {
    const rows = await prisma.galleryImage.findMany({
      where: { tenantId },
      orderBy: { order: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      imageUrl: r.imageUrl,
      mediaType: r.mediaType as "image" | "video",
      videoUrl: r.videoUrl,
      altText: r.altText,
      category: r.category,
      tags: r.tags ? r.tags.split(",").filter(Boolean) : [],
      isFeatured: r.isFeatured,
      order: r.order,
      isActive: r.isActive,
      createdAt: r.createdAt,
    }));
  },

  async create(tenantId: string, input: GalleryFormInput): Promise<GalleryItemData> {
    const row = await prisma.galleryImage.create({
      data: {
        tenantId,
        title: input.title,
        description: input.description ?? null,
        imageUrl: input.imageUrl,
        mediaType: input.mediaType ?? "image",
        videoUrl: input.videoUrl ?? null,
        altText: input.altText ?? null,
        category: input.category ?? "general",
        tags: (input.tags ?? []).join(","),
        isFeatured: input.isFeatured ?? false,
      },
    });
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      mediaType: row.mediaType as "image" | "video",
      videoUrl: row.videoUrl,
      altText: row.altText,
      category: row.category,
      tags: (row.tags ?? "").split(",").filter(Boolean),
      isFeatured: row.isFeatured,
      order: row.order,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  },

  async delete(id: string): Promise<void> {
    await prisma.galleryImage.delete({ where: { id } });
  },
};
