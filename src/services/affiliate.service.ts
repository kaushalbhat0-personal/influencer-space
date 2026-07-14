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
    try {
      return await prisma.affiliateLink.findMany({
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("AffiliateService.findAll error:", error);
      return [];
    }
  },

  async findById(id: string): Promise<AffiliateData | null> {
    try {
      return await prisma.affiliateLink.findUnique({ where: { id } });
    } catch (error) {
      console.error("AffiliateService.findById error:", error);
      return null;
    }
  },

  async findAllActive(): Promise<AffiliateData[]> {
    try {
      return await prisma.affiliateLink.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("AffiliateService.findAllActive error:", error);
      return [];
    }
  },

  async create(data: {
    title: string;
    url: string;
    imageUrl?: string;
    isActive?: boolean;
  }): Promise<AffiliateData> {
    try {
      return await prisma.affiliateLink.create({
        data: {
          title: data.title,
          url: data.url,
          imageUrl: data.imageUrl ?? null,
          isActive: data.isActive ?? true,
          clicks: 0,
        },
      });
    } catch (error) {
      console.error("AffiliateService.create error:", error);
      throw error;
    }
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
    try {
      return await prisma.affiliateLink.update({ where: { id }, data });
    } catch (error) {
      console.error("AffiliateService.update error:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await prisma.affiliateLink.delete({ where: { id } });
    } catch (error) {
      console.error("AffiliateService.delete error:", error);
      throw error;
    }
  },

  async toggleActive(id: string): Promise<AffiliateData> {
    try {
      const current = await prisma.affiliateLink.findUniqueOrThrow({
        where: { id },
      });
      return await prisma.affiliateLink.update({
        where: { id },
        data: { isActive: !current.isActive },
      });
    } catch (error) {
      console.error("AffiliateService.toggleActive error:", error);
      throw error;
    }
  },

  async incrementClicks(id: string): Promise<void> {
    try {
      await prisma.affiliateLink.update({
        where: { id },
        data: { clicks: { increment: 1 } },
      });
    } catch (error) {
      console.error("AffiliateService.incrementClicks error:", error);
      throw error;
    }
  },
};
