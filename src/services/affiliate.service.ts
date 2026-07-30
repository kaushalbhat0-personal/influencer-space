import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability/error-tracker";

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
      captureError(error, { service: "affiliate-service", operation: "findAll" });
      return [];
    }
  },

  async findById(id: string, tenantId: string): Promise<AffiliateData | null> {
    try {
      return await prisma.affiliateLink.findFirst({
        where: { id, tenantId },
      });
    } catch (error) {
      captureError(error, { service: "affiliate-service", operation: "findById" });
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
      captureError(error, { service: "affiliate-service", operation: "findAllActive" });
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
      captureError(error, { service: "affiliate-service", operation: "create" });
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
      captureError(error, { service: "affiliate-service", operation: "update" });
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
      captureError(error, { service: "affiliate-service", operation: "delete" });
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
      captureError(error, { service: "affiliate-service", operation: "toggleActive" });
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
      captureError(error, { service: "affiliate-service", operation: "incrementClicks" });
      throw error;
    }
  },
};
