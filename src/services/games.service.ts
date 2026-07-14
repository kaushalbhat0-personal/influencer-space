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
    return prisma.game.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  },

  async findAll(): Promise<GameData[]> {
    return prisma.game.findMany({
      orderBy: { order: "asc" },
    });
  },

  async findById(id: string): Promise<GameData | null> {
    return prisma.game.findUnique({ where: { id } });
  },

  async create(data: {
    name: string;
    logoUrl?: string;
    description?: string;
    genre?: string;
    order?: number;
  }): Promise<GameData> {
    const maxOrder = await prisma.game.aggregate({
      _max: { order: true },
    });
    return prisma.game.create({
      data: {
        ...data,
        order: data.order ?? (maxOrder._max.order ?? 0) + 1,
      },
    });
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
    return prisma.game.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.game.delete({ where: { id } });
  },

  async reorder(ids: string[]): Promise<void> {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.game.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  },
};
