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

  async findAllActive(): Promise<AffiliateData[]> {
    return prisma.affiliateLink.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async incrementClicks(id: string): Promise<void> {
    await prisma.affiliateLink.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });
  },
};
