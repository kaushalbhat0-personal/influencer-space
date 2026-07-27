import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { PublishedSnapshot } from "@/types/snapshot";
import { serializeSnapshot } from "./snapshot-serializer";

export interface PublishResult {
  version: number;
  websiteId: string;
}

export class PublishRepository {
  async createPublish(
    websiteId: string,
    snapshot: PublishedSnapshot,
  ): Promise<PublishResult> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.publishStatus.findUnique({ where: { websiteId } });
      const nextVersion = (existing?.liveVersion ?? 0) + 1;

      snapshot.metadata.version = nextVersion;

      const snap = await tx.publishSnapshot.create({
        data: {
          websiteId,
          version: nextVersion,
          state: "live",
          snapshot: JSON.parse(JSON.stringify(serializeSnapshot(snapshot))),
        },
      });

      await tx.publishStatus.upsert({
        where: { websiteId },
        create: { websiteId, state: "live", liveVersion: nextVersion, publishedAt: new Date() },
        update: { state: "live", liveVersion: nextVersion, publishedAt: new Date() },
      });

      return { version: snap.version, websiteId };
    });
  }

  async createPreview(
    websiteId: string,
    snapshot: PublishedSnapshot,
  ): Promise<PublishResult> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.publishSnapshot.findFirst({
        where: { websiteId, state: "preview" },
        orderBy: { version: "desc" },
      });
      const nextVersion = (existing?.version ?? 0) + 1;

      snapshot.metadata.version = nextVersion;

      await tx.publishSnapshot.create({
        data: {
          websiteId,
          version: nextVersion,
          state: "preview",
          snapshot: JSON.parse(JSON.stringify(serializeSnapshot(snapshot))),
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
