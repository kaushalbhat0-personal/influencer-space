"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GalleryService } from "@/services/gallery.service";
import { GALLERY_ROUTE } from "@/lib/constants";

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

export async function createGalleryImage(
  _prevState: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const parsed = gallerySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await GalleryService.create({
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      imageUrl: parsed.data.imageUrl,
      category: parsed.data.category,
    });
    revalidatePath(GALLERY_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to create gallery image" };
  }
}

export async function updateGalleryImage(
  _prevState: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const id = formData.get("id") as string;
  if (!id) {
    return { success: false, error: "Image ID is required" };
  }

  const parsed = gallerySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await GalleryService.update(id, {
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      imageUrl: parsed.data.imageUrl,
      category: parsed.data.category,
    });
    revalidatePath(GALLERY_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update gallery image" };
  }
}

export async function deleteGalleryImage(
  id: string,
): Promise<GalleryActionState> {
  try {
    await GalleryService.delete(id);
    revalidatePath(GALLERY_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete gallery image" };
  }
}
