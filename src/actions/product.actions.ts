"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(1000).optional().default(""),
  price: z.coerce.number().positive("Price must be greater than 0"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export type ProductData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export async function fetchProducts(
  tenantId: string,
): Promise<{ success: boolean; data?: ProductData[]; error?: string }> {
  try {
    await requireAdminAccess(tenantId);

    const products = await prisma.product.findMany({
      where: { tenantId },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });

    return { success: true, data: products };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch products",
    };
  }
}

export async function createNewProduct(
  tenantId: string,
  formData: FormData,
): Promise<{ success: boolean; data?: ProductData; error?: string }> {
  try {
    await requireAdminAccess(tenantId);

    const parsed = createProductSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
      price: formData.get("price"),
      imageUrl: formData.get("imageUrl"),
    });

    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      const first = fields.name?.[0] || fields.price?.[0] || fields.imageUrl?.[0] || "Invalid input";
      return { success: false, error: first };
    }

    const product = await prisma.product.create({
      data: {
        tenantId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        price: parsed.data.price,
        imageUrl: parsed.data.imageUrl || null,
      },
    });

    revalidatePath("/admin/products");
    return { success: true, data: product };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create product",
    };
  }
}

export async function toggleProductStatus(
  id: string,
  tenantId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAccess(tenantId);

    const existing = await prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return { success: false, error: "Product not found" };
    }

    await prisma.product.update({
      where: { id },
      data: { isActive },
    });

    revalidatePath("/admin/products");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle product",
    };
  }
}

export async function updateExistingProduct(
  tenantId: string,
  formData: FormData,
): Promise<{ success: boolean; data?: ProductData; error?: string }> {
  try {
    await requireAdminAccess(tenantId);

    const id = formData.get("id");
    if (!id || typeof id !== "string") {
      return { success: false, error: "Product ID is required" };
    }

    const parsed = createProductSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
      price: formData.get("price"),
      imageUrl: formData.get("imageUrl"),
    });

    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      const first = fields.name?.[0] || fields.price?.[0] || "Invalid input";
      return { success: false, error: first };
    }

    const existing = await prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return { success: false, error: "Product not found" };
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        price: parsed.data.price,
        imageUrl: parsed.data.imageUrl || null,
      },
    });

    revalidatePath("/admin/products");
    return { success: true, data: product };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update product",
    };
  }
}

export async function removeProduct(
  id: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAccess(tenantId);

    const existing = await prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      return { success: false, error: "Product not found" };
    }

    await prisma.product.delete({ where: { id } });

    revalidatePath("/admin/products");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete product",
    };
  }
}

export async function updateProductOrder(
  tenantId: string,
  updates: { id: string; order: number }[],
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminAccess(tenantId);

    await prisma.$transaction(
      updates.map((u) =>
        prisma.product.update({
          where: { id: u.id },
          data: { order: u.order },
        }),
      ),
    );

    revalidatePath("/admin/products");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reorder products",
    };
  }
}

// ── Backward-compatible wrappers (old API) ─────────────

export type ProductActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const tenant = await getTenantContext();
  if (!tenant) return { success: false, error: "No tenant configured" };
  const result = await createNewProduct(tenant.id, formData);
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}

export async function updateProduct(
  _prevState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const tenant = await getTenantContext();
  if (!tenant) return { success: false, error: "No tenant configured" };
  const result = await updateExistingProduct(tenant.id, formData);
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}

export async function deleteProduct(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const tenant = await getTenantContext();
  if (!tenant) return { success: false, error: "No tenant configured" };
  return removeProduct(id, tenant.id);
}

export async function toggleProductActive(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const tenant = await getTenantContext();
  if (!tenant) return { success: false, error: "No tenant configured" };
  return toggleProductStatus(id, tenant.id, !(await getCurrentActive(id, tenant.id)));
}

async function getCurrentActive(id: string, tenantId: string): Promise<boolean> {
  const product = await prisma.product.findFirst({ where: { id, tenantId } });
  return product?.isActive ?? false;
}
