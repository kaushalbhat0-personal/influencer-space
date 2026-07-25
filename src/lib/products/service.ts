import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { entitlement } from "@/modules/billing/application/entitlements";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type { ProductData, FetchProductsParams } from "./types";
import { findProducts, findProductById, countProducts } from "./queries";
import { requireAuth, requireProductFound } from "./permissions";
import { productCreateSchema, productUpdateSchema, getFirstValidationError } from "./validation";
import { resolveSlug, duplicateName, duplicateSlug } from "./mapper";

export class ProductService {
  static async fetch(params: FetchProductsParams) {
    await requireAuth(params.tenantId);
    return findProducts(params);
  }

  static async create(tenantId: string, formData: FormData) {
    await requireAuth(tenantId);

    const parsed = productCreateSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
      price: formData.get("price"),
      imageUrl: formData.get("imageUrl"),
      images: formData.get("images"),
      status: formData.get("status"),
      isFeatured: formData.get("isFeatured"),
      slug: formData.get("slug"),
      seoTitle: formData.get("seoTitle"),
      seoDescription: formData.get("seoDescription"),
    });

    if (!parsed.success) {
      return { success: false as const, error: getFirstValidationError(parsed.error) };
    }

    const productCount = await countProducts(tenantId);
    const planCode = "creator_free";
    const productLimit = entitlement.limit(planCode, "max_products");
    if (productLimit !== -1 && productLimit > 0 && productCount >= productLimit) {
      return { success: false as const, error: `You've reached the ${productLimit} product limit. Upgrade to add more.` };
    }

    const slug = resolveSlug(parsed.data.name, parsed.data.slug);

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          tenantId,
          name: parsed.data.name,
          description: parsed.data.description || null,
          price: parsed.data.price,
          imageUrl: parsed.data.imageUrl || null,
          images: JSON.parse(parsed.data.images),
          slug,
          status: parsed.data.status,
          isFeatured: parsed.data.isFeatured,
          isActive: parsed.data.status === "PUBLISHED",
        },
      });
      await logAction(tenantId, "createProduct", { productId: p.id, name: p.name }, tx);
      return p;
    });

    revalidatePath("/admin/products");
    return { success: true as const, data: product as unknown as ProductData };
  }

  static async update(tenantId: string, formData: FormData) {
    await requireAuth(tenantId);

    const id = formData.get("id");
    if (!id || typeof id !== "string") {
      return { success: false as const, error: "Product ID is required" };
    }

    const parsed = productUpdateSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
      price: formData.get("price"),
      imageUrl: formData.get("imageUrl"),
      images: formData.get("images"),
      status: formData.get("status"),
      isFeatured: formData.get("isFeatured"),
      slug: formData.get("slug"),
      seoTitle: formData.get("seoTitle"),
      seoDescription: formData.get("seoDescription"),
    });

    if (!parsed.success) {
      return { success: false as const, error: getFirstValidationError(parsed.error) };
    }

    const existing = await findProductById(id, tenantId);
    requireProductFound(existing);

    const slug = resolveSlug(parsed.data.name, parsed.data.slug);

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description || null,
          price: parsed.data.price,
          imageUrl: parsed.data.imageUrl || null,
          images: JSON.parse(parsed.data.images || "[]"),
          slug,
          status: parsed.data.status,
          isFeatured: parsed.data.isFeatured,
          isActive: parsed.data.status === "PUBLISHED",
        },
      });
      await logAction(tenantId, "updateProduct", { productId: id }, tx);
      return p;
    });

    revalidatePath("/admin/products");
    return { success: true as const, data: product as unknown as ProductData };
  }

  static async duplicate(productId: string, tenantId: string) {
    await requireAuth(tenantId);

    const original = await findProductById(productId, tenantId);
    requireProductFound(original);

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          tenantId,
          name: duplicateName(original.name),
          description: original.description,
          price: original.price,
          imageUrl: original.imageUrl,
          images: original.images as Prisma.InputJsonValue,
          slug: duplicateSlug(original.slug, original.name),
          status: "DRAFT",
          isActive: false,
          order: original.order + 1,
        },
      });
      await logAction(tenantId, "duplicateProduct", { productId: p.id, originalId: productId }, tx);
      return p;
    });

    revalidatePath("/admin/products");
    return { success: true as const, data: product as unknown as ProductData };
  }

  static async archive(productId: string, tenantId: string) {
    await requireAuth(tenantId);
    await prisma.product.update({
      where: { id: productId, tenantId },
      data: { archivedAt: new Date(), status: "ARCHIVED", isActive: false },
    });
    await logAction(tenantId, "archiveProduct", { productId });
    revalidatePath("/admin/products");
    return { success: true as const };
  }

  static async restore(productId: string, tenantId: string) {
    await requireAuth(tenantId);
    await prisma.product.update({
      where: { id: productId, tenantId },
      data: { archivedAt: null, status: "DRAFT", isActive: false },
    });
    await logAction(tenantId, "restoreProduct", { productId });
    revalidatePath("/admin/products");
    return { success: true as const };
  }

  static async publish(productId: string, tenantId: string) {
    await requireAuth(tenantId);
    await prisma.product.update({
      where: { id: productId, tenantId },
      data: { status: "PUBLISHED", isActive: true, archivedAt: null },
    });
    await logAction(tenantId, "publishProduct", { productId });
    revalidatePath("/admin/products");
    return { success: true as const };
  }

  static async unpublish(productId: string, tenantId: string) {
    await requireAuth(tenantId);
    await prisma.product.update({
      where: { id: productId, tenantId },
      data: { status: "DRAFT", isActive: false },
    });
    await logAction(tenantId, "unpublishProduct", { productId });
    revalidatePath("/admin/products");
    return { success: true as const };
  }

  static async delete(id: string, tenantId: string) {
    await requireAuth(tenantId);

    const existing = await findProductById(id, tenantId);
    requireProductFound(existing);

    await prisma.$transaction(async (tx) => {
      await tx.product.delete({ where: { id } });
      await logAction(tenantId, "deleteProduct", { productId: id, name: existing.name }, tx);
    });

    revalidatePath("/admin/products");
    return { success: true as const };
  }

  static async reorder(tenantId: string, updates: { id: string; order: number }[]) {
    await requireAuth(tenantId);

    await prisma.$transaction(
      updates.map((u) =>
        prisma.product.update({
          where: { id: u.id },
          data: { order: u.order },
        }),
      ),
    );

    await logAction(tenantId, "reorderProducts", { count: updates.length });
    revalidatePath("/admin/products");
    return { success: true as const };
  }

  static async toggleStatus(id: string, tenantId: string, isActive: boolean) {
    await requireAuth(tenantId);
    const existing = await findProductById(id, tenantId);
    requireProductFound(existing);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { isActive, status: isActive ? "PUBLISHED" : "DRAFT" },
      });
      await logAction(tenantId, "toggleProductStatus", { productId: id, isActive }, tx);
    });

    revalidatePath("/admin/products");
    return { success: true as const };
  }

  static async bulkPublish(ids: string[], tenantId: string) {
    await requireAuth(tenantId);
    const result = await prisma.product.updateMany({
      where: { id: { in: ids }, tenantId },
      data: { status: "PUBLISHED", isActive: true, archivedAt: null },
    });
    await logAction(tenantId, "bulkPublish", { count: result.count });
    revalidatePath("/admin/products");
    return { success: true as const, count: result.count };
  }

  static async bulkArchive(ids: string[], tenantId: string) {
    await requireAuth(tenantId);
    const result = await prisma.product.updateMany({
      where: { id: { in: ids }, tenantId },
      data: { archivedAt: new Date(), status: "ARCHIVED", isActive: false },
    });
    await logAction(tenantId, "bulkArchive", { count: result.count });
    revalidatePath("/admin/products");
    return { success: true as const, count: result.count };
  }

  static async bulkDelete(ids: string[], tenantId: string) {
    await requireAuth(tenantId);
    const result = await prisma.product.deleteMany({
      where: { id: { in: ids }, tenantId },
    });
    await logAction(tenantId, "bulkDelete", { count: result.count });
    revalidatePath("/admin/products");
    return { success: true as const, count: result.count };
  }
}
