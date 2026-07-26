"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { galleryService } from "./service";
import { galleryFormSchema } from "./validators";
import type { GalleryFormInput } from "./types";

export async function listGallery() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return galleryService.list(tenantId);
}

export async function createGalleryItem(input: GalleryFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const parsed = galleryFormSchema.parse(input);
  const result = await galleryService.create(tenantId, parsed as GalleryFormInput);
  revalidatePath("/admin/gallery");
  return result;
}

export async function deleteGalleryItem(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");

  await galleryService.delete(id);
  revalidatePath("/admin/gallery");
}
