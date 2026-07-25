import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { FetchGalleryParams, FetchGalleryResult, GalleryItemData } from "./types";
import { GALLERY_LIMIT_DEFAULT } from "./constants";

export const GALLERY_LIST_SELECT = {
  id: true, title: true, description: true, altText: true,
  imageUrl: true, mediaType: true, videoUrl: true,
  width: true, height: true, fileSize: true,
  category: true, tags: true, status: true, isFeatured: true,
  order: true, isActive: true, archivedAt: true, createdAt: true, updatedAt: true,
} as const;

export function buildGalleryWhere(tenantId: string, search?: string, status?: string, mediaType?: string): Prisma.GalleryImageWhereInput {
  const where: Prisma.GalleryImageWhereInput = { tenantId };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { altText: { contains: search, mode: "insensitive" } },
      { tags: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status === "ARCHIVED") {
    where.archivedAt = { not: null };
  } else if (status === "DRAFT") {
    where.status = "DRAFT";
    where.archivedAt = null;
  } else if (status === "PUBLISHED") {
    where.status = "PUBLISHED";
    where.archivedAt = null;
  }

  if (mediaType) {
    where.mediaType = mediaType;
  }

  return where;
}

export function buildGalleryOrderBy(sort?: string): Prisma.GalleryImageOrderByWithRelationInput[] {
  switch (sort) {
    case "newest": return [{ createdAt: "desc" }];
    case "oldest": return [{ createdAt: "asc" }];
    case "title_asc": return [{ title: "asc" }];
    case "title_desc": return [{ title: "desc" }];
    default: return [{ order: "asc" }, { createdAt: "desc" }];
  }
}

function toItemData(row: Record<string, unknown>): GalleryItemData {
  return {
    id: row.id as string,
    url: row.mediaType === "video" && row.videoUrl ? row.videoUrl as string : row.imageUrl as string,
    caption: (row.description as string) || (row.title as string),
    altText: row.altText as string | null,
    isVideo: row.mediaType === "video",
    status: row.status as string,
    isFeatured: row.isFeatured as boolean,
    isActive: row.isActive as boolean,
    category: row.category as string | null,
    tags: row.tags as string | null,
    width: row.width as number | null,
    height: row.height as number | null,
    fileSize: row.fileSize as number | null,
    order: row.order as number,
    archivedAt: row.archivedAt as Date | null,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export async function findGalleryItems(params: FetchGalleryParams): Promise<FetchGalleryResult> {
  const { tenantId, search, status, mediaType, sort, page = 1, limit = GALLERY_LIMIT_DEFAULT } = params;
  const where = buildGalleryWhere(tenantId, search, status, mediaType);
  const orderBy = buildGalleryOrderBy(sort);

  const [rows, total] = await Promise.all([
    prisma.galleryImage.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, select: GALLERY_LIST_SELECT }),
    prisma.galleryImage.count({ where }),
  ]);

  return {
    items: rows.map((r) => toItemData(r as unknown as Record<string, unknown>)),
    total, page, totalPages: Math.ceil(total / limit),
  };
}

export async function findGalleryItemById(id: string, tenantId: string) {
  return prisma.galleryImage.findFirst({ where: { id, tenantId } });
}

export async function findStorefrontGallery(tenantId: string) {
  return prisma.galleryImage.findMany({
    where: { tenantId, status: "PUBLISHED", archivedAt: null, isActive: true },
    orderBy: [{ isFeatured: "desc" }, { order: "asc" }, { createdAt: "desc" }],
    select: GALLERY_LIST_SELECT,
  });
}
