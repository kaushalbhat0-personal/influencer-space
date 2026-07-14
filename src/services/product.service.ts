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
    try {
      return await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("ProductService.findAllActive error:", error);
      return [];
    }
  },

  async findAll(): Promise<ProductData[]> {
    try {
      return await prisma.product.findMany({
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("ProductService.findAll error:", error);
      return [];
    }
  },

  async findById(id: string): Promise<ProductData | null> {
    try {
      return await prisma.product.findUnique({ where: { id } });
    } catch (error) {
      console.error("ProductService.findById error:", error);
      return null;
    }
  },

  async create(data: {
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
  }): Promise<ProductData> {
    try {
      return await prisma.product.create({ data });
    } catch (error) {
      console.error("ProductService.create error:", error);
      throw error;
    }
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
    try {
      return await prisma.product.update({ where: { id }, data });
    } catch (error) {
      console.error("ProductService.update error:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await prisma.product.delete({ where: { id } });
    } catch (error) {
      console.error("ProductService.delete error:", error);
      throw error;
    }
  },

  async toggleActive(id: string): Promise<ProductData> {
    try {
      const product = await prisma.product.findUniqueOrThrow({
        where: { id },
      });
      return await prisma.product.update({
        where: { id },
        data: { isActive: !product.isActive },
      });
    } catch (error) {
      console.error("ProductService.toggleActive error:", error);
      throw error;
    }
  },
};
