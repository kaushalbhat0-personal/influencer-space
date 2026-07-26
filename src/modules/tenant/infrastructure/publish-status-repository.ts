import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface CreatePublishStatusData {
  websiteId: string;
  state?: string;
  publishedAt?: Date;
}

export class PublishStatusRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async create(data: CreatePublishStatusData, tx?: Prisma.TransactionClient) {
    return this.client(tx).publishStatus.create({
      data: {
        websiteId: data.websiteId,
        state: data.state ?? "draft",
        publishedAt: data.publishedAt ?? new Date(),
      },
    });
  }
}

export const publishStatusRepository = new PublishStatusRepository();
