import { prisma } from "@/lib/prisma";
import type { LinkData, LinkFormInput } from "./types";

export const linkService = {
  async list(tenantId: string): Promise<LinkData[]> {
    const rows = await prisma.affiliateLink.findMany({
      where: { tenantId },
      orderBy: { order: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      imageUrl: r.imageUrl,
      order: r.order,
      clicks: r.clicks,
      isActive: r.isActive,
      createdAt: r.createdAt,
    }));
  },

  async create(tenantId: string, input: LinkFormInput): Promise<LinkData> {
    const row = await prisma.affiliateLink.create({
      data: { tenantId, title: input.title, url: input.url, imageUrl: input.imageUrl ?? null },
    });
    return {
      id: row.id,
      title: row.title,
      url: row.url,
      imageUrl: row.imageUrl,
      order: row.order,
      clicks: row.clicks,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  },

  async update(id: string, input: Partial<LinkFormInput>): Promise<LinkData> {
    const row = await prisma.affiliateLink.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.url !== undefined && { url: input.url }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
    return {
      id: row.id,
      title: row.title,
      url: row.url,
      imageUrl: row.imageUrl,
      order: row.order,
      clicks: row.clicks,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  },

  async delete(id: string): Promise<void> {
    await prisma.affiliateLink.delete({ where: { id } });
  },
};
