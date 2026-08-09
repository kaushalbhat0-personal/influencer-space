import { prisma } from "@/lib/prisma";
import type { Prisma, GalleryImage } from "@/generated/prisma/client";

export interface CreateGalleryData {
  tenantId: string;
  title: string;
  description?: string | null;
  altText?: string | null;
  imageUrl: string;
  mediaType?: string;
  videoUrl?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  category?: string;
  tags?: string | null;
  status?: string;
  isFeatured?: boolean;
  order?: number;
}

export class GalleryRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async create(data: CreateGalleryData, tx?: Prisma.TransactionClient): Promise<GalleryImage> {
    return this.client(tx).galleryImage.create({
      data: {
        tenantId: data.tenantId,
        title: data.title,
        description: data.description ?? null,
        altText: data.altText ?? null,
        imageUrl: data.imageUrl,
        mediaType: data.mediaType ?? "image",
        videoUrl: data.videoUrl ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        fileSize: data.fileSize ?? null,
        category: data.category ?? "general",
        tags: data.tags ?? null,
        status: data.status ?? "PUBLISHED",
        isFeatured: data.isFeatured ?? false,
        order: data.order ?? 0,
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<GalleryImage | null> {
    return this.client(tx).galleryImage.findUnique({ where: { id } });
  }

  async findMany(tenantId: string, params?: { category?: string; status?: string; limit?: number; offset?: number }, tx?: Prisma.TransactionClient): Promise<GalleryImage[]> {
    const where: Record<string, unknown> = { tenantId };
    if (params?.category) where.category = params.category;
    if (params?.status) where.status = params.status;
    return this.client(tx).galleryImage.findMany({
      where,
      orderBy: { order: "asc" },
      take: params?.limit,
      skip: params?.offset,
    });
  }

  async update(id: string, data: Partial<CreateGalleryData>, tx?: Prisma.TransactionClient): Promise<GalleryImage> {
    return this.client(tx).galleryImage.update({ where: { id }, data });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.client(tx).galleryImage.delete({ where: { id } });
  }

  async count(tenantId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return this.client(tx).galleryImage.count({ where: { tenantId } });
  }

  async deleteMany(tenantId: string, ids?: string[], tx?: Prisma.TransactionClient): Promise<number> {
    const where: Record<string, unknown> = { tenantId };
    if (ids) where.id = { in: ids };
    const r = await this.client(tx).galleryImage.deleteMany({ where });
    return r.count;
  }

  async maxOrder(tenantId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const result = await this.client(tx).galleryImage.aggregate({
      where: { tenantId },
      _max: { order: true },
    });
    return result._max.order ?? 0;
  }

  async findPublished(tenantId: string, params?: { limit?: number }, tx?: Prisma.TransactionClient): Promise<GalleryImage[]> {
    return this.client(tx).galleryImage.findMany({
      where: { tenantId, status: "PUBLISHED", isActive: true, archivedAt: null },
      orderBy: { order: "asc" },
      take: params?.limit,
    });
  }

  /** RCCF-IMPLEMENTATION-09B (Phase 6): featured published images (capped) —
   *  homepage curation source. */
  async findFeatured(tenantId: string, params?: { limit?: number }, tx?: Prisma.TransactionClient): Promise<GalleryImage[]> {
    return this.client(tx).galleryImage.findMany({
      where: { tenantId, isFeatured: true, status: "PUBLISHED", isActive: true, archivedAt: null },
      orderBy: { order: "asc" },
      take: params?.limit,
    });
  }

  /** RCCF-IMPLEMENTATION-09B (Phase 6): non-featured published images (capped) —
   *  tops up the homepage curation when fewer than the cap are featured. */
  async findNonFeatured(tenantId: string, params?: { limit?: number }, tx?: Prisma.TransactionClient): Promise<GalleryImage[]> {
    return this.client(tx).galleryImage.findMany({
      where: { tenantId, isFeatured: false, status: "PUBLISHED", isActive: true, archivedAt: null },
      orderBy: { order: "asc" },
      take: params?.limit,
    });
  }
}

export const galleryRepository = new GalleryRepository();
