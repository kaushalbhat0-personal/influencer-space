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
  async findAllActive(tenantId: string): Promise<ProductData[]> {
    try {
      return await prisma.product.findMany({
        where: { isActive: true, tenantId },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("ProductService.findAllActive error:", error);
      return [];
    }
  },

  async findAll(tenantId: string): Promise<ProductData[]> {
    try {
      return await prisma.product.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      });
    } catch (error) {
      console.error("ProductService.findAll error:", error);
      return [];
    }
  },

  async findById(id: string, tenantId: string): Promise<ProductData | null> {
    try {
      return await prisma.product.findFirst({
        where: { id, tenantId },
      });
    } catch (error) {
      console.error("ProductService.findById error:", error);
      return null;
    }
  },

  async create(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      price: number;
      imageUrl?: string;
    },
  ): Promise<ProductData> {
    try {
      return await prisma.product.create({ data: { ...data, tenantId } });
    } catch (error) {
      console.error("ProductService.create error:", error);
      throw error;
    }
  },

  async update(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      imageUrl?: string;
      isActive?: boolean;
    },
  ): Promise<ProductData> {
    try {
      const existing = await prisma.product.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Product not found");
      return await prisma.product.update({ where: { id }, data });
    } catch (error) {
      console.error("ProductService.update error:", error);
      throw error;
    }
  },

  async delete(id: string, tenantId: string): Promise<void> {
    try {
      const existing = await prisma.product.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Product not found");
      await prisma.product.delete({ where: { id } });
    } catch (error) {
      console.error("ProductService.delete error:", error);
      throw error;
    }
  },

  async toggleActive(id: string, tenantId: string): Promise<ProductData> {
    try {
      const existing = await prisma.product.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Product not found");
      return await prisma.product.update({
        where: { id },
        data: { isActive: !existing.isActive },
      });
    } catch (error) {
      console.error("ProductService.toggleActive error:", error);
      throw error;
    }
  },
};
