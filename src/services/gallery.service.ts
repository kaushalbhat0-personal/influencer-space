import { prisma } from "@/lib/prisma";

export type GalleryImageData = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  category: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const GalleryService = {
  async findAllActive(tenantId: string): Promise<GalleryImageData[]> {
    try {
      return await prisma.galleryImage.findMany({
        where: { isActive: true, tenantId },
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.error("GalleryService.findAllActive error:", error);
      return [];
    }
  },

  async findAll(tenantId: string): Promise<GalleryImageData[]> {
    try {
      return await prisma.galleryImage.findMany({
        where: { tenantId },
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.error("GalleryService.findAll error:", error);
      return [];
    }
  },

  async findById(id: string, tenantId: string): Promise<GalleryImageData | null> {
    try {
      return await prisma.galleryImage.findFirst({
        where: { id, tenantId },
      });
    } catch (error) {
      console.error("GalleryService.findById error:", error);
      return null;
    }
  },

  async create(
    tenantId: string,
    data: {
      title: string;
      description?: string;
      imageUrl: string;
      category: string;
      order?: number;
    },
  ): Promise<GalleryImageData> {
    try {
      const maxOrder = await prisma.galleryImage.aggregate({
        where: { tenantId },
        _max: { order: true },
      });
      return await prisma.galleryImage.create({
        data: {
          tenantId,
          ...data,
          order: data.order ?? (maxOrder._max.order ?? 0) + 1,
        },
      });
    } catch (error) {
      console.error("GalleryService.create error:", error);
      throw error;
    }
  },

  async update(
    id: string,
    tenantId: string,
    data: {
      title?: string;
      description?: string;
      imageUrl?: string;
      category?: string;
      order?: number;
      isActive?: boolean;
    },
  ): Promise<GalleryImageData> {
    try {
      const existing = await prisma.galleryImage.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Gallery image not found");
      return await prisma.galleryImage.update({ where: { id }, data });
    } catch (error) {
      console.error("GalleryService.update error:", error);
      throw error;
    }
  },

  async delete(id: string, tenantId: string): Promise<void> {
    try {
      const existing = await prisma.galleryImage.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Gallery image not found");
      await prisma.galleryImage.delete({ where: { id } });
    } catch (error) {
      console.error("GalleryService.delete error:", error);
      throw error;
    }
  },

  async reorder(ids: string[], tenantId: string): Promise<void> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.galleryImage.updateMany({
            where: { id, tenantId },
            data: { order: index },
          }),
        ),
      );
    } catch (error) {
      console.error("GalleryService.reorder error:", error);
      throw error;
    }
  },
};
