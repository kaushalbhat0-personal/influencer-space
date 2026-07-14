import { prisma } from "@/lib/prisma";

export type TimelineEventData = {
  id: string;
  year: string;
  title: string;
  description: string;
  imageUrl: string | null;
  stats: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const TimelineService = {
  async findAllActive(): Promise<TimelineEventData[]> {
    return prisma.timelineEvent.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  },

  async findAll(): Promise<TimelineEventData[]> {
    return prisma.timelineEvent.findMany({
      orderBy: { order: "asc" },
    });
  },

  async findById(id: string): Promise<TimelineEventData | null> {
    return prisma.timelineEvent.findUnique({ where: { id } });
  },

  async create(data: {
    year: string;
    title: string;
    description: string;
    imageUrl?: string;
    stats?: string;
    order?: number;
  }): Promise<TimelineEventData> {
    const maxOrder = await prisma.timelineEvent.aggregate({
      _max: { order: true },
    });
    return prisma.timelineEvent.create({
      data: {
        ...data,
        order: data.order ?? (maxOrder._max.order ?? 0) + 1,
      },
    });
  },

  async update(
    id: string,
    data: {
      year?: string;
      title?: string;
      description?: string;
      imageUrl?: string;
      stats?: string;
      order?: number;
      isActive?: boolean;
    },
  ): Promise<TimelineEventData> {
    return prisma.timelineEvent.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    await prisma.timelineEvent.delete({ where: { id } });
  },

  async reorder(ids: string[]): Promise<void> {
    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.timelineEvent.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  },
};
