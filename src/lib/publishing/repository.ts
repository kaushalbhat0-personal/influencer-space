import { prisma } from "@/lib/prisma";
import type { BuilderPage } from "@/lib/builder/types";
import type { Prisma } from "@/generated/prisma/client";

type PageData = {
  pages: BuilderPage[];
  themePackageId: string;
  themeColors: Record<string, string>;
  themeFonts: Record<string, string>;
};

export interface PublishResult {
  version: number;
  websiteId: string;
}

export class PublishRepository {
  async createPublish(
    websiteId: string,
    data: PageData,
  ): Promise<PublishResult> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.publishStatus.findUnique({ where: { websiteId } });
      const nextVersion = (existing?.liveVersion ?? 0) + 1;

      const snapshotPayload = {
        pages: data.pages,
        themePackageId: data.themePackageId,
        themeColors: data.themeColors,
        themeFonts: data.themeFonts,
      };

      const snap = await tx.publishSnapshot.create({
        data: {
          websiteId,
          version: nextVersion,
          state: "live",
          snapshot: JSON.parse(JSON.stringify(snapshotPayload)),
        },
      });

      await tx.publishStatus.upsert({
        where: { websiteId },
        create: {
          websiteId,
          state: "live",
          liveVersion: nextVersion,
          publishedAt: new Date(),
        },
        update: {
          state: "live",
          liveVersion: nextVersion,
          publishedAt: new Date(),
        },
      });

      return { version: snap.version, websiteId };
    });
  }

  async createPreview(
    websiteId: string,
    data: PageData,
  ): Promise<PublishResult> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.publishSnapshot.findFirst({
        where: { websiteId, state: "preview" },
        orderBy: { version: "desc" },
      });
      const nextVersion = (existing?.version ?? 0) + 1;

      await tx.publishSnapshot.create({
        data: {
          websiteId,
          version: nextVersion,
          state: "preview",
          snapshot: JSON.parse(JSON.stringify({
            pages: data.pages,
            themePackageId: data.themePackageId,
            themeColors: data.themeColors,
            themeFonts: data.themeFonts,
          })),
        },
      });

      await tx.publishStatus.upsert({
        where: { websiteId },
        create: { websiteId, state: "preview" },
        update: { state: "preview" },
      });

      return { version: nextVersion, websiteId };
    });
  }

  async createStatus(
    websiteId: string,
    state?: string,
    publishedAt?: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.publishStatus.create({
      data: {
        websiteId,
        state: state ?? "draft",
        publishedAt: publishedAt ?? new Date(),
      },
    });
  }
}

export const publishRepository = new PublishRepository();
