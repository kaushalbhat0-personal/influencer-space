import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { PublishedSnapshot } from "@/types/snapshot";
import { serializeSnapshot } from "@/lib/publishing/snapshot-serializer";

export interface PublishResult {
  version: number;
  websiteId: string;
}

export class PublishRepository {
  /**
   * Compute the next version number across ALL snapshots for the website
   * (live + preview). Live and preview previously computed their own
   * sequences, which collided on the `@@unique([websiteId, version])`
   * constraint (publish-after-preview and preview-after-publish both failed).
   */
  private async nextVersion(websiteId: string, tx: Prisma.TransactionClient): Promise<number> {
    const agg = await tx.publishSnapshot.aggregate({
      where: { websiteId },
      _max: { version: true },
    });
    return (agg._max.version ?? 0) + 1;
  }

  async createPublish(
    websiteId: string,
    snapshot: PublishedSnapshot,
  ): Promise<PublishResult> {
    return prisma.$transaction(async (tx) => {
      const nextVersion = await this.nextVersion(websiteId, tx);
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
      const nextVersion = await this.nextVersion(websiteId, tx);

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
