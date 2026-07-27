import { prisma } from "@/lib/prisma";
import type { Prisma, Product } from "@/generated/prisma/client";

export interface CreateProductData {
  tenantId: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  images?: Prisma.InputJsonValue;
  slug?: string | null;
  status?: string;
  order?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

type UpdateProductData = Omit<Partial<CreateProductData>, "tenantId">;

export class ProductRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async create(data: CreateProductData, tx?: Prisma.TransactionClient): Promise<Product> {
    return this.client(tx).product.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        description: data.description ?? null,
        price: data.price,
        imageUrl: data.imageUrl ?? null,
        images: (data.images ?? []) as Prisma.InputJsonValue,
        slug: data.slug ?? null,
        status: data.status ?? "PUBLISHED",
        order: data.order ?? 0,
        isFeatured: data.isFeatured ?? false,
        isActive: data.isActive ?? true,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Product | null> {
    return this.client(tx).product.findUnique({ where: { id } });
  }

  async findMany(tenantId: string, params?: { status?: string; isActive?: boolean; limit?: number; offset?: number }, tx?: Prisma.TransactionClient): Promise<Product[]> {
    const where: Record<string, unknown> = { tenantId };
    if (params?.status) where.status = params.status;
    if (params?.isActive !== undefined) where.isActive = params.isActive;
    return this.client(tx).product.findMany({
      where,
      orderBy: { order: "asc" },
      take: params?.limit,
      skip: params?.offset,
    });
  }

  async update(id: string, data: UpdateProductData, tx?: Prisma.TransactionClient): Promise<Product> {
    return this.client(tx).product.update({ where: { id }, data: data as Prisma.ProductUpdateInput });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.client(tx).product.delete({ where: { id } });
  }

  async count(tenantId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return this.client(tx).product.count({ where: { tenantId } });
  }

  async deleteMany(tenantId: string, ids?: string[], tx?: Prisma.TransactionClient): Promise<number> {
    const where: Record<string, unknown> = { tenantId };
    if (ids) where.id = { in: ids };
    const r = await this.client(tx).product.deleteMany({ where });
    return r.count;
  }

  async findPublished(tenantId: string, tx?: Prisma.TransactionClient): Promise<Product[]> {
    return this.client(tx).product.findMany({
      where: { tenantId, status: "PUBLISHED", isActive: true, archivedAt: null },
      orderBy: { order: "asc" },
    });
  }

  async findFeatured(tenantId: string, tx?: Prisma.TransactionClient): Promise<Product[]> {
    return this.client(tx).product.findMany({
      where: { tenantId, isFeatured: true, status: "PUBLISHED", isActive: true, archivedAt: null },
      orderBy: { order: "asc" },
    });
  }
}

export const productRepository = new ProductRepository();
