import { prisma } from "@/lib/prisma";
import type { Prisma, AffiliateLink } from "@/generated/prisma/client";

export interface CreateLinkData {
  tenantId: string;
  title: string;
  url: string;
  imageUrl?: string | null;
  order?: number;
  isActive?: boolean;
}

export class LinkRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async create(data: CreateLinkData, tx?: Prisma.TransactionClient): Promise<AffiliateLink> {
    return this.client(tx).affiliateLink.create({
      data: {
        tenantId: data.tenantId,
        title: data.title,
        url: data.url,
        imageUrl: data.imageUrl ?? null,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<AffiliateLink | null> {
    return this.client(tx).affiliateLink.findUnique({ where: { id } });
  }

  async findMany(tenantId: string, params?: { isActive?: boolean }, tx?: Prisma.TransactionClient): Promise<AffiliateLink[]> {
    const where: Record<string, unknown> = { tenantId };
    if (params?.isActive !== undefined) where.isActive = params.isActive;
    return this.client(tx).affiliateLink.findMany({
      where,
      orderBy: { order: "asc" },
    });
  }

  async update(id: string, data: Partial<CreateLinkData & { clicks?: number }>, tx?: Prisma.TransactionClient): Promise<AffiliateLink> {
    return this.client(tx).affiliateLink.update({ where: { id }, data });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.client(tx).affiliateLink.delete({ where: { id } });
  }

  async count(tenantId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return this.client(tx).affiliateLink.count({ where: { tenantId } });
  }

  async incrementClicks(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.client(tx).affiliateLink.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
  }

  async findPublished(tenantId: string, tx?: Prisma.TransactionClient): Promise<AffiliateLink[]> {
    return this.client(tx).affiliateLink.findMany({
      where: { tenantId, isActive: true },
      // RCCF-65.2 — deterministic ordering: active only, by order then id.
      orderBy: [{ order: "asc" }, { id: "asc" }],
    });
  }
}

export const linkRepository = new LinkRepository();
