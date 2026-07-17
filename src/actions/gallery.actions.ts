"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";

export type GalleryItemData = {
  id: string;
  url: string;
  caption: string | null;
  isVideo: boolean;
  order: number;
  createdAt: Date;
};

async function requireAuth(tenantId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN" && session.user.tenantId !== tenantId) {
    throw new Error("Forbidden");
  }
}

function toItem(row: {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  mediaType: string;
  videoUrl: string | null;
  order: number;
  createdAt: Date;
}): GalleryItemData {
  return {
    id: row.id,
    url: row.mediaType === "video" && row.videoUrl ? row.videoUrl : row.imageUrl,
    caption: row.description || row.title,
    isVideo: row.mediaType === "video",
    order: row.order,
    createdAt: row.createdAt,
  };
}

export async function fetchGalleryItems(
  tenantId: string,
): Promise<{ success: boolean; data?: GalleryItemData[]; error?: string }> {
  try {
    await requireAuth(tenantId);

    const rows = await prisma.galleryImage.findMany({
      where: { tenantId },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: rows.map(toItem) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch gallery items",
    };
  }
}

export async function createGalleryItem(
  tenantId: string,
  data: { url: string; caption?: string; isVideo: boolean },
): Promise<{ success: boolean; data?: GalleryItemData; error?: string }> {
  try {
    await requireAuth(tenantId);

    if (!data.url) {
      return { success: false, error: "URL is required" };
    }

    const maxOrder = await prisma.galleryImage.aggregate({
      where: { tenantId },
      _max: { order: true },
    });

    const row = await prisma.galleryImage.create({
      data: {
        tenantId,
        title: data.caption || "Untitled",
        description: data.caption || null,
        imageUrl: data.isVideo ? "" : data.url,
        mediaType: data.isVideo ? "video" : "image",
        videoUrl: data.isVideo ? data.url : null,
        category: "general",
        order: (maxOrder._max.order ?? 0) + 1,
      },
    });

    await logAction(tenantId, "createGalleryItem", { itemId: row.id, caption: data.caption ?? null });
    revalidatePath("/admin/gallery");
    return { success: true, data: toItem(row) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create gallery item",
    };
  }
}

export async function removeGalleryItem(
  id: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth(tenantId);

    const existing = await prisma.galleryImage.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return { success: false, error: "Gallery item not found" };
    }

    await prisma.galleryImage.delete({ where: { id } });

    await logAction(tenantId, "deleteGalleryItem", { itemId: id });
    revalidatePath("/admin/gallery");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete gallery item",
    };
  }
}

export async function updateGalleryOrder(
  tenantId: string,
  updates: { id: string; order: number }[],
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuth(tenantId);

    await prisma.$transaction(
      updates.map((u) =>
        prisma.galleryImage.update({
          where: { id: u.id },
          data: { order: u.order },
        }),
      ),
    );

    await logAction(tenantId, "reorderGallery", { count: updates.length });
    revalidatePath("/admin/gallery");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder gallery items",
    };
  }
}


