"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export type GalleryItemData = {
  id: string;
  url: string;
  caption: string | null;
  isVideo: boolean;
  order: number;
  createdAt: Date;
};

async function requireAdminAccess(tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized — Admin access required");
  }

  const tenant = await getTenantContext();
  if (!tenant || tenant.id !== tenantId) {
    throw new Error("Unauthorized — tenant mismatch");
  }

  return tenant;
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
    await requireAdminAccess(tenantId);

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
    await requireAdminAccess(tenantId);

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
    await requireAdminAccess(tenantId);

    const existing = await prisma.galleryImage.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return { success: false, error: "Gallery item not found" };
    }

    await prisma.galleryImage.delete({ where: { id } });

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
    await requireAdminAccess(tenantId);

    await prisma.$transaction(
      updates.map((u) =>
        prisma.galleryImage.update({
          where: { id: u.id },
          data: { order: u.order },
        }),
      ),
    );

    revalidatePath("/admin/gallery");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder gallery items",
    };
  }
}

// ── Backward-compatible wrappers (old form) ─────────────

import { z } from "zod";

export type GalleryActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const legacySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(500).optional().default(""),
  imageUrl: z.string().optional().or(z.literal("")),
  mediaType: z.enum(["image", "video"]).optional().default("image"),
  videoUrl: z.string().optional().or(z.literal("")),
  category: z.string().min(1, "Category is required"),
});

export async function createGalleryImage(
  _prevState: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const tenant = await getTenantContext();
  if (!tenant) return { success: false, error: "No tenant configured" };

  const parsed = legacySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    mediaType: formData.get("mediaType") || "image",
    videoUrl: formData.get("videoUrl"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (parsed.data.mediaType === "image" && !parsed.data.imageUrl) {
    return { success: false, error: "Image URL is required for image type." };
  }
  if (parsed.data.mediaType === "video" && !parsed.data.videoUrl) {
    return { success: false, error: "Video URL is required for video type." };
  }

  const result = await createGalleryItem(tenant.id, {
    url: parsed.data.mediaType === "video" ? parsed.data.videoUrl! : parsed.data.imageUrl!,
    caption: parsed.data.title || parsed.data.description,
    isVideo: parsed.data.mediaType === "video",
  });

  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}

export async function updateGalleryImage(
  _prevState: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const tenant = await getTenantContext();
  if (!tenant) return { success: false, error: "No tenant configured" };

  const id = formData.get("id") as string;
  if (!id) return { success: false, error: "Image ID is required" };

  const parsed = legacySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    mediaType: formData.get("mediaType") || "image",
    videoUrl: formData.get("videoUrl"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.galleryImage.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      imageUrl: parsed.data.imageUrl || "",
      mediaType: parsed.data.mediaType,
      videoUrl: parsed.data.videoUrl || null,
      category: parsed.data.category,
    },
  });

  revalidatePath("/admin/gallery");
  return { success: true };
}

export async function deleteGalleryImage(
  id: string,
): Promise<GalleryActionState> {
  const tenant = await getTenantContext();
  if (!tenant) return { success: false, error: "No tenant configured" };
  const result = await removeGalleryItem(id, tenant.id);
  return result;
}
