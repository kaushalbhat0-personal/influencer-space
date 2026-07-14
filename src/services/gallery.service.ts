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
    return prisma.galleryImage.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  },

  async findAll(): Promise<GalleryImageData[]> {
    return prisma.galleryImage.findMany({
      orderBy: { order: "asc" },
    });
  },

  async findById(id: string): Promise<GalleryImageData | null> {
    return prisma.galleryImage.findUnique({ where: { id } });
  },

  async create(data: {
    title: string;
    description?: string;
    imageUrl: string;
    category: string;
    order?: number;
  }): Promise<GalleryImageData> {
    const maxOrder = await prisma.galleryImage.aggregate({
      _max: { order: true },
    });
    return prisma.galleryImage.create({
      data: {
        ...data,
        order: data.order ?? (maxOrder._max.order ?? 0) + 1,
      },
    });
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
    return prisma.galleryImage.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.galleryImage.delete({ where: { id } });
  },

  async reorder(ids: string[]): Promise<void> {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.galleryImage.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  },
};
