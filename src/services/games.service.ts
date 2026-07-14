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
  async findAllActive(): Promise<GameData[]> {
    try {
      return await prisma.game.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.error("GameService.findAllActive error:", error);
      return [];
    }
  },

  async findAll(): Promise<GameData[]> {
    try {
      return await prisma.game.findMany({
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.error("GameService.findAll error:", error);
      return [];
    }
  },

  async findById(id: string): Promise<GameData | null> {
    try {
      return await prisma.game.findUnique({ where: { id } });
    } catch (error) {
      console.error("GameService.findById error:", error);
      return null;
    }
  },

  async create(data: {
    name: string;
    logoUrl?: string;
    description?: string;
    genre?: string;
    order?: number;
  }): Promise<GameData> {
    try {
      const maxOrder = await prisma.game.aggregate({
        _max: { order: true },
      });
      return await prisma.game.create({
        data: {
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
      return await prisma.game.update({ where: { id }, data });
    } catch (error) {
      console.error("GameService.update error:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await prisma.game.delete({ where: { id } });
    } catch (error) {
      console.error("GameService.delete error:", error);
      throw error;
    }
  },

  async reorder(ids: string[]): Promise<void> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.game.update({
            where: { id },
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
