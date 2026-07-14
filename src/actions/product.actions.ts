"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProductService } from "@/services/product.service";
import { StorageService } from "@/services/storage.service";
import { PRODUCTS_ROUTE } from "@/lib/constants";

const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional().default(""),
  price: z.coerce.number().positive("Price must be positive"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export type ProductActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    imageUrl: formData.get("imageUrl"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await ProductService.create({
      name: parsed.data.name,
      description: parsed.data.description || undefined,
      price: parsed.data.price,
      imageUrl: parsed.data.imageUrl || undefined,
    });
    revalidatePath(PRODUCTS_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to create product" };
  }
}

export async function updateProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const id = formData.get("id") as string;
  if (!id) {
    return { success: false, error: "Product ID is required" };
  }

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    imageUrl: formData.get("imageUrl"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await ProductService.update(id, {
      name: parsed.data.name,
      description: parsed.data.description || undefined,
      price: parsed.data.price,
      imageUrl: parsed.data.imageUrl || undefined,
    });
    revalidatePath(PRODUCTS_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update product" };
  }
}

export async function deleteProduct(
  id: string,
): Promise<ProductActionState> {
  try {
    const product = await ProductService.findById(id);
    if (product?.imageUrl) {
      const path = StorageService.extractPathFromUrl(product.imageUrl);
      if (path) {
        await StorageService.delete(path);
      }
    }
    await ProductService.delete(id);
    revalidatePath(PRODUCTS_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete product" };
  }
}

export async function toggleProductActive(
  id: string,
): Promise<ProductActionState> {
  try {
    await ProductService.toggleActive(id);
    revalidatePath(PRODUCTS_ROUTE);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to toggle product status" };
  }
}
