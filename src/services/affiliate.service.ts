import { prisma } from "@/lib/prisma";

export type AffiliateData = {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  clicks: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const AffiliateService = {
  async findAll(): Promise<AffiliateData[]> {
    return prisma.affiliateLink.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string): Promise<AffiliateData | null> {
    return prisma.affiliateLink.findUnique({ where: { id } });
  },

  async findAllActive(): Promise<AffiliateData[]> {
    return prisma.affiliateLink.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: {
    title: string;
    url: string;
    imageUrl?: string;
    isActive?: boolean;
  }): Promise<AffiliateData> {
    return prisma.affiliateLink.create({
      data: {
        title: data.title,
        url: data.url,
        imageUrl: data.imageUrl ?? null,
        isActive: data.isActive ?? true,
        clicks: 0,
      },
    });
  },

  async update(
    id: string,
    data: {
      title?: string;
      url?: string;
      imageUrl?: string;
      isActive?: boolean;
    },
  ): Promise<AffiliateData> {
    return prisma.affiliateLink.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.affiliateLink.delete({ where: { id } });
  },

  async toggleActive(id: string): Promise<AffiliateData> {
    const current = await prisma.affiliateLink.findUniqueOrThrow({
      where: { id },
    });
    return prisma.affiliateLink.update({
      where: { id },
      data: { isActive: !current.isActive },
    });
  },

  async incrementClicks(id: string): Promise<void> {
    await prisma.affiliateLink.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
  },
};
