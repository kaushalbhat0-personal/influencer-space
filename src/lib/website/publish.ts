import { prisma } from "@/lib/prisma";

export type PublishState = "draft" | "preview" | "live" | "archived";

export class PublishService {
  async getByWebsiteId(websiteId: string) {
    return prisma.publishStatus.findUnique({ where: { websiteId } });
  }

  async listByState(state: PublishState) {
    return prisma.publishStatus.findMany({
      where: { state },
      include: { website: { include: { brand: true, tenant: true } } },
    });
  }
}
