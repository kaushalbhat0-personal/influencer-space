import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { DEFAULT_PRODUCT_TYPE } from "@/modules/product-types";
import { DEFAULT_COMMERCE_MODE, normalizeCommerceMode } from "@/config/commerce/commerce-mode";
import type { CommerceMode } from "@/config/commerce/commerce-mode";
import type { ProductData, ProductFormInput } from "./types";

/**
 * RCCF-72.18D.7.1 — Boundary A (publishing/selling gate).
 *
 * An ONLINE or BOTH offering can only become sellable when the tenant's
 * canonical payment readiness is `ready`. The check REUSES the single
 * authoritative readiness runtime (`computePaymentReadiness`, which resolves
 * strategy → PaymentAccount → verified credentials → settlement) — no second
 * readiness implementation exists. WHATSAPP-only offerings collect no online
 * payment and are exempt.
 *
 * Enforced on: creation that results in a sellable state, updates that
 * TRANSITION into a sellable state, and sellable products whose mode upgrades
 * from WHATSAPP to ONLINE/BOTH. Pure metadata edits of an already-sellable
 * product with unchanged mode are NOT blocked (an already-published offering
 * stays structurally intact; Boundary C — checkout readiness — remains the
 * final money authority if readiness lapses later).
 */
export const PAYMENT_SETUP_REQUIRED = "PAYMENT_SETUP_REQUIRED";

function isSellableState(status: string | undefined, isActive: boolean | undefined): boolean {
  return (status ?? "PUBLISHED") === "PUBLISHED" && (isActive ?? true);
}

async function assertOnlineSellingReadiness(tenantId: string, mode: CommerceMode): Promise<void> {
  if (mode === "WHATSAPP") return;
  const { computePaymentReadiness } = await import("@/modules/payment-account");
  const readiness = await computePaymentReadiness(tenantId);
  if (readiness.readiness !== "ready") {
    const err = new Error(
      "Payment setup required. Connect and verify your payment account before selling this offering online.",
    ) as Error & { code: string };
    err.code = PAYMENT_SETUP_REQUIRED;
    throw err;
  }
}

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

  async create(tenantId: string, input: ProductFormInput, tx?: Prisma.TransactionClient): Promise<ProductData> {
    // RCCF-72.18D.7.1 — Boundary A: a new ONLINE/BOTH product is sellable the
    // moment it is created (PUBLISHED defaults), so payment readiness is
    // required up front. WHATSAPP-only creation needs no payment setup.
    if (isSellableState(input.status, input.isActive)) {
      await assertOnlineSellingReadiness(tenantId, normalizeCommerceMode(input.commerceMode));
    }
    const client = tx ?? prisma;
    const row = await client.product.create({
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

  async update(id: string, tenantId: string, input: Partial<ProductFormInput>, tx?: Prisma.TransactionClient): Promise<ProductData> {
    // VALIDATION-01 V-035: scope product updates to the session tenant.
    const client = tx ?? prisma;
    const existing = await client.product.findFirst({
      where: { id, tenantId },
      select: { id: true, status: true, isActive: true, archivedAt: true, commerceMode: true },
    });
    if (!existing) throw new Error("Product not found");

    // RCCF-72.18D.7.1 — Boundary A: enforce readiness when this update would
    // GRANT online sellability (draft→published transition, reactivation, or a
    // WHATSAPP→ONLINE/BOTH mode upgrade on an already-sellable product).
    const wasSellable =
      existing.status === "PUBLISHED" && existing.isActive === true && existing.archivedAt === null;
    const willBeSellable =
      (input.status ?? existing.status) === "PUBLISHED" &&
      (input.isActive ?? existing.isActive) === true &&
      existing.archivedAt === null;
    const previousMode = normalizeCommerceMode(existing.commerceMode);
    const effectiveMode = input.commerceMode !== undefined ? normalizeCommerceMode(input.commerceMode) : previousMode;
    if (willBeSellable && effectiveMode !== "WHATSAPP" && (!wasSellable || previousMode === "WHATSAPP")) {
      await assertOnlineSellingReadiness(tenantId, effectiveMode);
    }

    const row = await client.product.update({
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

  /**
   * RCCF-72.16B — effective active-state transition for an update, read under
   * the tenant lock. `wasActive` is the item's current active state; the
   * resulting state is PUBLISHED + isActive + not archived after applying the
   * parsed input. An edit that keeps an already-active product active does not
   * consume a second Launch slot.
   */
  async resolveUpdateTransition(
    id: string,
    tenantId: string,
    input: Partial<ProductFormInput>,
    tx?: Prisma.TransactionClient,
  ): Promise<{ wasActive: boolean; willBeActive: boolean }> {
    const client = tx ?? prisma;
    const existing = await client.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Product not found");
    const wasActive = existing.status === "PUBLISHED" && existing.isActive === true && existing.archivedAt === null;
    const effectiveStatus = input.status ?? existing.status;
    const effectiveIsActive = input.isActive ?? existing.isActive;
    const willBeActive = effectiveStatus === "PUBLISHED" && effectiveIsActive === true && existing.archivedAt === null;
    return { wasActive, willBeActive };
  },

  async delete(id: string, tenantId: string): Promise<void> {
    // VALIDATION-01 V-035: scope product deletes to the session tenant.
    const existing = await prisma.product.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) throw new Error("Product not found");
    await prisma.product.delete({ where: { id } });
  },
};
