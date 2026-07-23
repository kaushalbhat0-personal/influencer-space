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
  async findAllActive(tenantId: string): Promise<TimelineEventData[]> {
    try {
      return await prisma.timelineEvent.findMany({
        where: { isActive: true, tenantId },
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.error("TimelineService.findAllActive error:", error);
      return [];
    }
  },

  async findAll(tenantId: string): Promise<TimelineEventData[]> {
    try {
      return await prisma.timelineEvent.findMany({
        where: { tenantId },
        orderBy: { order: "asc" },
      });
    } catch (error) {
      console.error("TimelineService.findAll error:", error);
      return [];
    }
  },

  async findById(id: string, tenantId: string): Promise<TimelineEventData | null> {
    try {
      return await prisma.timelineEvent.findFirst({
        where: { id, tenantId },
      });
    } catch (error) {
      console.error("TimelineService.findById error:", error);
      return null;
    }
  },

  async create(
    tenantId: string,
    data: {
      year: string;
      title: string;
      description: string;
      imageUrl?: string;
      stats?: string;
      order?: number;
    },
  ): Promise<TimelineEventData> {
    try {
      const maxOrder = await prisma.timelineEvent.aggregate({
        where: { tenantId },
        _max: { order: true },
      });
      return await prisma.$transaction(async (tx) => {
        return tx.timelineEvent.create({
          data: {
            tenantId,
            ...data,
            order: data.order ?? (maxOrder._max.order ?? 0) + 1,
          },
        });
      });
    } catch (error) {
      console.error("TimelineService.create error:", error);
      throw error;
    }
  },

  async update(
    id: string,
    tenantId: string,
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
      const existing = await prisma.timelineEvent.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Timeline event not found");
      return await prisma.$transaction(async (tx) => {
        return tx.timelineEvent.update({ where: { id }, data });
      });
    } catch (error) {
      console.error("TimelineService.update error:", error);
      throw error;
    }
  },

  async delete(id: string, tenantId: string): Promise<void> {
    try {
      const existing = await prisma.timelineEvent.findFirst({
        where: { id, tenantId },
      });
      if (!existing) throw new Error("Timeline event not found");
      await prisma.$transaction(async (tx) => {
        await tx.timelineEvent.delete({ where: { id } });
      });
    } catch (error) {
      console.error("TimelineService.delete error:", error);
      throw error;
    }
  },

  async reorder(ids: string[], tenantId: string): Promise<void> {
    try {
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.timelineEvent.updateMany({
            where: { id, tenantId },
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
