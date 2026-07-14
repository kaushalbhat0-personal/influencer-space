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
  imageUrl: z.string().min(1, "Image URL is required"),
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
    category: formData.get("category"),
  });

  if (!parsed.success) {
    console.log("📸 createGalleryImage validation failed:", parsed.error.flatten().fieldErrors);
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tenantId = await requireTenant();
    const result = await GalleryService.create(tenantId, {
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      imageUrl: parsed.data.imageUrl,
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
      imageUrl: parsed.data.imageUrl,
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
