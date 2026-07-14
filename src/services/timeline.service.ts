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
    try {
      return await prisma.timelineEvent.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.error("TimelineService.findAllActive error:", error);
      return [];
    }
  },

  async findAll(): Promise<TimelineEventData[]> {
    try {
      return await prisma.timelineEvent.findMany({
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.error("TimelineService.findAll error:", error);
      return [];
    }
  },

  async findById(id: string): Promise<TimelineEventData | null> {
    try {
      return await prisma.timelineEvent.findUnique({ where: { id } });
    } catch (error) {
      console.error("TimelineService.findById error:", error);
      return null;
    }
  },

  async create(data: {
    year: string;
    title: string;
    description: string;
    imageUrl?: string;
    stats?: string;
    order?: number;
  }): Promise<TimelineEventData> {
    try {
      const maxOrder = await prisma.timelineEvent.aggregate({
        _max: { order: true },
      });
      return await prisma.timelineEvent.create({
        data: {
          ...data,
          order: data.order ?? (maxOrder._max.order ?? 0) + 1,
        },
      });
    } catch (error) {
      console.error("TimelineService.create error:", error);
      throw error;
    }
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
    try {
      return await prisma.timelineEvent.update({ where: { id }, data });
    } catch (error) {
      console.error("TimelineService.update error:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await prisma.timelineEvent.delete({ where: { id } });
    } catch (error) {
      console.error("TimelineService.delete error:", error);
      throw error;
    }
  },

  async reorder(ids: string[]): Promise<void> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.timelineEvent.update({
            where: { id },
            data: { order: index },
          }),
        ),
      );
    } catch (error) {
      console.error("TimelineService.reorder error:", error);
      throw error;
    }
  },
};
