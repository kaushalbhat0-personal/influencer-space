import { prisma } from "@/lib/prisma";

export type GameData = {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  genre: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const GameService = {
  async findAllActive(tenantId: string): Promise<GameData[]> {
    try {
      return await prisma.game.findMany({
        where: { isActive: true, tenantId },
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.error("GameService.findAllActive error:", error);
      return [];
    }
  },

  async findAll(tenantId: string): Promise<GameData[]> {
    try {
      return await prisma.game.findMany({
        where: { tenantId },
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.error("GameService.findAll error:", error);
      return [];
    }
  },

  async findById(id: string, tenantId: string): Promise<GameData | null> {
    try {
      return await prisma.game.findFirst({
        where: { id, tenantId },
      });
    } catch (error) {
      console.error("GameService.findById error:", error);
      return null;
    }
  },

  async create(
    tenantId: string,
    data: {
      name: string;
      logoUrl?: string;
      description?: string;
      genre?: string;
      order?: number;
    },
  ): Promise<GameData> {
    try {
      const maxOrder = await prisma.game.aggregate({
        where: { tenantId },
        _max: { order: true },
      });
      return await prisma.game.create({
        data: {
          tenantId,
          ...data,
          order: data.order ?? (maxOrder._max.order ?? 0) + 1,
        },
      });
    } catch (error) {
      console.error("GameService.create error:", error);
      throw error;
    }
  },

  async update(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      logoUrl?: string;
      description?: string;
      genre?: string;
      order?: number;
      isActive?: boolean;
    },
  ): Promise<GameData> {
    try {
      const existing = await prisma.game.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Game not found");
      return await prisma.game.update({ where: { id }, data });
    } catch (error) {
      console.error("GameService.update error:", error);
      throw error;
    }
  },

  async delete(id: string, tenantId: string): Promise<void> {
    try {
      const existing = await prisma.game.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Game not found");
      await prisma.game.delete({ where: { id } });
    } catch (error) {
      console.error("GameService.delete error:", error);
      throw error;
    }
  },

  async reorder(ids: string[], tenantId: string): Promise<void> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.game.updateMany({
            where: { id, tenantId },
            data: { order: index },
          }),
        ),
      );
    } catch (error) {
      console.error("GameService.reorder error:", error);
      throw error;
    }
  },
};
