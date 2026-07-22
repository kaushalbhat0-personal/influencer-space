import { prisma } from "@/lib/prisma";
import type { Website, Brand, PublishStatus } from "@/generated/prisma/client";

export type WebsiteWithAll = Website & { brand: Brand | null; publishStatus: PublishStatus | null };

export class WebsiteService {
  async getByTenantId(tenantId: string): Promise<WebsiteWithAll | null> {
    return prisma.website.findUnique({
      where: { tenantId },
      include: { brand: true, publishStatus: true },
    });
  }

  async getById(id: string): Promise<WebsiteWithAll | null> {
    return prisma.website.findUnique({
      where: { id },
      include: { brand: true, publishStatus: true },
    });
  }

  async listAll(): Promise<WebsiteWithAll[]> {
    return prisma.website.findMany({
      include: { brand: true, publishStatus: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async listPublished(): Promise<WebsiteWithAll[]> {
    return prisma.website.findMany({
      where: { publishStatus: { state: "live" } },
      include: { brand: true, publishStatus: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
