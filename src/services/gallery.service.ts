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
  async findAllActive(): Promise<GalleryImageData[]> {
    try {
      return await prisma.galleryImage.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.error("GalleryService.findAllActive error:", error);
      return [];
    }
  },

  async findAll(): Promise<GalleryImageData[]> {
    try {
      return await prisma.galleryImage.findMany({
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.error("GalleryService.findAll error:", error);
      return [];
    }
  },

  async findById(id: string): Promise<GalleryImageData | null> {
    try {
      return await prisma.galleryImage.findUnique({ where: { id } });
    } catch (error) {
      console.error("GalleryService.findById error:", error);
      return null;
    }
  },

  async create(data: {
    title: string;
    description?: string;
    imageUrl: string;
    category: string;
    order?: number;
  }): Promise<GalleryImageData> {
    try {
      const maxOrder = await prisma.galleryImage.aggregate({
        _max: { order: true },
      });
      return await prisma.galleryImage.create({
        data: {
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
      return await prisma.galleryImage.update({ where: { id }, data });
    } catch (error) {
      console.error("GalleryService.update error:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await prisma.galleryImage.delete({ where: { id } });
    } catch (error) {
      console.error("GalleryService.delete error:", error);
      throw error;
    }
  },

  async reorder(ids: string[]): Promise<void> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.galleryImage.update({
            where: { id },
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
