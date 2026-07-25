import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { FetchProductsParams, FetchProductsResult, ProductData } from "./types";
import { PRODUCT_LIMIT_DEFAULT } from "./constants";

export const PRODUCT_LIST_SELECT = {
  id: true,
  name: true,
  description: true,
  price: true,
  imageUrl: true,
  images: true,
  slug: true,
  status: true,
  isActive: true,
  isFeatured: true,
  order: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const PRODUCT_STOREFRONT_SELECT = {
  id: true,
  name: true,
  description: true,
  price: true,
  imageUrl: true,
  images: true,
  slug: true,
  seoTitle: true,
  seoDescription: true,
} as const;

export function buildProductWhere(tenantId: string, search?: string, status?: string): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { tenantId };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status === "ACTIVE") {
    where.isActive = true;
  } else if (status === "INACTIVE") {
    where.isActive = false;
  } else if (status === "DRAFT") {
    where.status = "DRAFT";
  } else if (status === "PUBLISHED") {
    where.status = "PUBLISHED";
  } else if (status === "ARCHIVED") {
    where.archivedAt = { not: null };
  }

  return where;
}

export function buildProductOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "name_asc": return [{ name: "asc" }];
    case "name_desc": return [{ name: "desc" }];
    case "price_asc": return [{ price: "asc" }];
    case "price_desc": return [{ price: "desc" }];
    case "newest": return [{ createdAt: "desc" }];
    case "oldest": return [{ createdAt: "asc" }];
    default: return [{ order: "asc" }, { createdAt: "desc" }];
  }
}

export async function findProducts(params: FetchProductsParams): Promise<FetchProductsResult> {
  const { tenantId, search, status, sort, page = 1, limit = PRODUCT_LIMIT_DEFAULT } = params;
  const where = buildProductWhere(tenantId, search, status);
  const orderBy = buildProductOrderBy(sort);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: PRODUCT_LIST_SELECT,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products as unknown as ProductData[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function findProductById(id: string, tenantId: string) {
  return prisma.product.findFirst({ where: { id, tenantId } });
}

export async function countProducts(tenantId: string) {
  return prisma.product.count({ where: { tenantId } });
}

export async function findStorefrontProducts(tenantId: string) {
  return prisma.product.findMany({
    where: { tenantId, isActive: true, status: "PUBLISHED", archivedAt: null },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: PRODUCT_STOREFRONT_SELECT,
  });
}
