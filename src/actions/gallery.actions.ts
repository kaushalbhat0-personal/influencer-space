"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GalleryService } from "@/services/gallery.service";
import { StorageService } from "@/services/storage.service";
import { GALLERY_ROUTE } from "@/lib/constants";
import { getTenantContext } from "@/lib/tenant";

const gallerySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(500).optional().default(""),
  imageUrl: z.string().optional().or(z.literal("")),
  mediaType: z.enum(["image", "video"]).optional().default("image"),
  videoUrl: z.string().optional().or(z.literal("")),
  category: z.string().min(1, "Category is required"),
});

export type GalleryActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function requireTenant(): Promise<string> {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized — no tenant context");
  return tenant.id;
}

export async function createGalleryImage(
  _prevState: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const raw = Object.fromEntries(formData);
  console.log("📸 createGalleryImage called with:", raw);

  const parsed = gallerySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    mediaType: formData.get("mediaType") || "image",
    videoUrl: formData.get("videoUrl"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    console.log("📸 createGalleryImage validation failed:", parsed.error.flatten().fieldErrors);
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (parsed.data.mediaType === "image" && !parsed.data.imageUrl) {
    return { success: false, error: "Image URL is required for image type." };
  }
  if (parsed.data.mediaType === "video" && !parsed.data.videoUrl) {
    return { success: false, error: "Video URL is required for video type." };
  }

  try {
    const tenantId = await requireTenant();
    const result = await GalleryService.create(tenantId, {
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      imageUrl: parsed.data.imageUrl || "",
      mediaType: parsed.data.mediaType,
      videoUrl: parsed.data.videoUrl || undefined,
      category: parsed.data.category,
    });
    console.log("📸 createGalleryImage success:", result.id);
    revalidatePath(GALLERY_ROUTE);
    return { success: true };
  } catch (error) {
    console.error("📸 createGalleryImage error:", error);
    return { success: false, error: "Failed to create gallery image" };
  }
}

export async function updateGalleryImage(
  _prevState: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const id = formData.get("id") as string;
  const raw = Object.fromEntries(formData);
  console.log("📸 updateGalleryImage called — id:", id, "data:", raw);

  if (!id) {
    console.log("📸 updateGalleryImage missing id");
    return { success: false, error: "Image ID is required" };
  }

  const parsed = gallerySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    mediaType: formData.get("mediaType") || "image",
    videoUrl: formData.get("videoUrl"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    console.log("📸 updateGalleryImage validation failed:", parsed.error.flatten().fieldErrors);
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tenantId = await requireTenant();
    await GalleryService.update(id, tenantId, {
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      imageUrl: parsed.data.imageUrl || undefined,
      mediaType: parsed.data.mediaType,
      videoUrl: parsed.data.videoUrl || undefined,
      category: parsed.data.category,
    });
    console.log("📸 updateGalleryImage success — id:", id);
    revalidatePath(GALLERY_ROUTE);
    return { success: true };
  } catch (error) {
    console.error("📸 updateGalleryImage error:", error);
    return { success: false, error: "Failed to update gallery image" };
  }
}

export async function deleteGalleryImage(
  id: string,
): Promise<GalleryActionState> {
  console.log("📸 deleteGalleryImage called — id:", id);
  try {
    const tenantId = await requireTenant();
    const image = await GalleryService.findById(id, tenantId);
    console.log("📸 deleteGalleryImage found image:", image?.id);
    if (image?.imageUrl) {
      const path = StorageService.extractPathFromUrl(image.imageUrl);
      console.log("📸 deleteGalleryImage extracting storage path:", path);
      if (path) {
        await StorageService.delete(path);
        console.log("📸 deleteGalleryImage storage file deleted:", path);
      }
    }
    await GalleryService.delete(id, tenantId);
    console.log("📸 deleteGalleryImage success — id:", id);
    revalidatePath(GALLERY_ROUTE);
    return { success: true };
  } catch (error) {
    console.error("📸 deleteGalleryImage error:", error);
    return { success: false, error: "Failed to delete gallery image" };
  }
}
