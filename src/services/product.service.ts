import { prisma } from "@/lib/prisma";

export type ProductData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const ProductService = {
  async findAllActive(): Promise<ProductData[]> {
    return prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async findAll(): Promise<ProductData[]> {
    return prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string): Promise<ProductData | null> {
    return prisma.product.findUnique({ where: { id } });
  },

  async create(data: {
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
  }): Promise<ProductData> {
    return prisma.product.create({ data });
  },

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
      isActive?: boolean;
    },
  ): Promise<ProductData> {
    return prisma.product.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.product.delete({ where: { id } });
  },

  async toggleActive(id: string): Promise<ProductData> {
    const product = await prisma.product.findUniqueOrThrow({
      where: { id },
    });
    return prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });
  },
};
