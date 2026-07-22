import { prisma } from "@/lib/prisma";

export type PublishState = "draft" | "preview" | "live" | "archived";

export class PublishService {
  async getByWebsiteId(websiteId: string) {
    return prisma.publishStatus.findUnique({ where: { websiteId } });
  }

  async setState(websiteId: string, state: PublishState) {
    const now = state === "live" ? new Date() : undefined;
    return prisma.publishStatus.upsert({
      where: { websiteId },
      create: { websiteId, state, publishedAt: now ?? null },
      update: { state, publishedAt: now ?? undefined },
    });
  }

  async listByState(state: PublishState) {
    return prisma.publishStatus.findMany({
      where: { state },
      include: { website: { include: { brand: true, tenant: true } } },
    });
  }
}
