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
  async findAll(tenantId: string): Promise<AffiliateData[]> {
    try {
      return await prisma.affiliateLink.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("AffiliateService.findAll error:", error);
      return [];
    }
  },

  async findById(id: string, tenantId: string): Promise<AffiliateData | null> {
    try {
      return await prisma.affiliateLink.findFirst({
        where: { id, tenantId },
      });
    } catch (error) {
      console.error("AffiliateService.findById error:", error);
      return null;
    }
  },

  async findAllActive(tenantId: string): Promise<AffiliateData[]> {
    try {
      return await prisma.affiliateLink.findMany({
        where: { isActive: true, tenantId },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("AffiliateService.findAllActive error:", error);
      return [];
    }
  },

  async create(
    tenantId: string,
    data: {
      title: string;
      url: string;
      imageUrl?: string;
      isActive?: boolean;
    },
  ): Promise<AffiliateData> {
    try {
      return await prisma.affiliateLink.create({
        data: {
          tenantId,
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
    tenantId: string,
    data: {
      title?: string;
      url?: string;
      imageUrl?: string;
      isActive?: boolean;
    },
  ): Promise<AffiliateData> {
    try {
      const existing = await prisma.affiliateLink.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Affiliate not found");
      return await prisma.affiliateLink.update({ where: { id }, data });
    } catch (error) {
      console.error("AffiliateService.update error:", error);
      throw error;
    }
  },

  async delete(id: string, tenantId: string): Promise<void> {
    try {
      const existing = await prisma.affiliateLink.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Affiliate not found");
      await prisma.affiliateLink.delete({ where: { id } });
    } catch (error) {
      console.error("AffiliateService.delete error:", error);
      throw error;
    }
  },

  async toggleActive(id: string, tenantId: string): Promise<AffiliateData> {
    try {
      const existing = await prisma.affiliateLink.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Affiliate not found");
      return await prisma.affiliateLink.update({
        where: { id },
        data: { isActive: !existing.isActive },
      });
    } catch (error) {
      console.error("AffiliateService.toggleActive error:", error);
      throw error;
    }
  },

  async incrementClicks(id: string, tenantId: string): Promise<void> {
    try {
      const existing = await prisma.affiliateLink.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Affiliate not found");
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
