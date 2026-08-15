import { prisma } from "@/lib/prisma";
import { DEFAULT_PRODUCT_TYPE } from "@/modules/product-types";
import { DEFAULT_COMMERCE_MODE, normalizeCommerceMode } from "@/config/commerce/commerce-mode";
import type { ProductData, ProductFormInput } from "./types";

function mapProduct(row: Record<string, unknown>): ProductData {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    price: row.price as number,
    imageUrl: (row.imageUrl as string) ?? null,
    images: Array.isArray(row.images) ? row.images as string[] : [],
    slug: (row.slug as string) ?? null,
    status: (row.status as ProductData["status"]) ?? "DRAFT",
    // RCCF-IMPLEMENTATION-74: persist the standardized commerce type.
    type: (row.type as ProductData["type"]) ?? DEFAULT_PRODUCT_TYPE,
    // RCCF-66.2: normalize so legacy rows without the field stay ONLINE.
    commerceMode: normalizeCommerceMode(row.commerceMode),
    isActive: (row.isActive as boolean) ?? true,
    isFeatured: (row.isFeatured as boolean) ?? false,
    seoTitle: (row.seoTitle as string) ?? null,
    seoDescription: (row.seoDescription as string) ?? null,
    order: (row.order as number) ?? 0,
    createdAt: row.createdAt as Date,
    updatedAt: row.updatedAt as Date,
  };
}

export const productService = {
  async list(tenantId: string): Promise<ProductData[]> {
    const rows = await prisma.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapProduct);
  },

  async getById(id: string, tenantId: string): Promise<ProductData | null> {
    // VALIDATION-01 V-035: scope product reads to the session tenant.
    const row = await prisma.product.findFirst({ where: { id, tenantId } });
    return row ? mapProduct(row as Record<string, unknown>) : null;
  },

  async create(tenantId: string, input: ProductFormInput): Promise<ProductData> {
    const row = await prisma.product.create({
      data: {
        tenantId,
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        imageUrl: input.imageUrl ?? null,
        images: input.images ?? [],
        slug: input.slug ?? input.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        type: input.type ?? DEFAULT_PRODUCT_TYPE,
        status: input.status ?? "PUBLISHED",
        commerceMode: input.commerceMode ?? DEFAULT_COMMERCE_MODE,
        isActive: input.isActive ?? true,
        isFeatured: input.isFeatured ?? false,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
      },
    });
    return mapProduct(row as Record<string, unknown>);
  },

  async update(id: string, tenantId: string, input: Partial<ProductFormInput>): Promise<ProductData> {
    // VALIDATION-01 V-035: scope product updates to the session tenant.
    const existing = await prisma.product.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) throw new Error("Product not found");
    const row = await prisma.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.images !== undefined && { images: input.images }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.commerceMode !== undefined && { commerceMode: normalizeCommerceMode(input.commerceMode) }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.isFeatured !== undefined && { isFeatured: input.isFeatured }),
        ...(input.seoTitle !== undefined && { seoTitle: input.seoTitle }),
        ...(input.seoDescription !== undefined && { seoDescription: input.seoDescription }),
      },
    });
    return mapProduct(row as Record<string, unknown>);
  },

  async delete(id: string, tenantId: string): Promise<void> {
    // VALIDATION-01 V-035: scope product deletes to the session tenant.
    const existing = await prisma.product.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) throw new Error("Product not found");
    await prisma.product.delete({ where: { id } });
  },
};
