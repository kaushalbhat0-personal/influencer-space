import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { PublishedSnapshot } from "@/types/snapshot";
import { serializeSnapshot } from "@/lib/publishing/snapshot-serializer";

export interface PublishResult {
  version: number;
  websiteId: string;
}

const MAX_VERSION_RETRIES = 3;

/** P2002 = unique constraint violation (concurrent version bump race). */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
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

  /**
   * Ensures the PublishStatus row exists BEFORE the snapshot insert. The
   * PublishSnapshot.websiteId FK references PublishStatus.websiteId, so an
   * insert without a prior status row fails with P2003 even though the status
   * is upserted later in the same transaction. Creating the row first (with a
   * neutral "draft" state) guarantees the FK is satisfied regardless of
   * whether the website was provisioned through the full pipeline.
   */
  private async ensureStatusRow(tx: Prisma.TransactionClient, websiteId: string): Promise<void> {
    await tx.publishStatus.upsert({
      where: { websiteId },
      create: { websiteId, state: "draft" },
      update: {},
    });
  }

  /**
   * Runs the persist transaction, retrying when two concurrent publishes race
   * on the same `@@unique([websiteId, version])` version. A retry recomputes
   * the version from the committed max, so the second write lands on a fresh
   * version instead of failing.
   */
  private async withVersionRetry<T>(
    websiteId: string,
    run: (tx: Prisma.TransactionClient, nextVersion: number) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < MAX_VERSION_RETRIES; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const nextVersion = await this.nextVersion(websiteId, tx);
          return run(tx, nextVersion);
        });
      } catch (error) {
        if (isUniqueViolation(error) && attempt < MAX_VERSION_RETRIES - 1) {
          continue;
        }
        throw error;
      }
    }
    throw new Error("Publish version conflict after retries");
  }

  async createPublish(
    websiteId: string,
    snapshot: PublishedSnapshot,
    tx?: Prisma.TransactionClient,
  ): Promise<PublishResult> {
    if (tx) {
      // RCCF-31: when an external transaction is supplied (quota reservation +
      // snapshot in one atomic unit), run the persist on that tx. The version
      // retry loop is skipped — a concurrent version conflict aborts the whole
      // external transaction (quota reservation rolls back too).
      const nextVersion = await this.nextVersion(websiteId, tx);
      return this.persistPublish(tx, websiteId, snapshot, nextVersion);
    }
    return this.withVersionRetry(websiteId, async (tx, nextVersion) =>
      this.persistPublish(tx, websiteId, snapshot, nextVersion),
    );
  }

  private async persistPublish(
    tx: Prisma.TransactionClient,
    websiteId: string,
    snapshot: PublishedSnapshot,
    nextVersion: number,
  ): Promise<PublishResult> {
    snapshot.metadata.version = nextVersion;

    // FK ordering: PublishStatus row must exist before PublishSnapshot insert.
    await this.ensureStatusRow(tx, websiteId);

    const snap = await tx.publishSnapshot.create({
      data: {
        websiteId,
        version: nextVersion,
        state: "live",
        snapshot: JSON.parse(JSON.stringify(serializeSnapshot(snapshot))),
      },
    });

    await tx.publishStatus.update({
      where: { websiteId },
      data: { state: "live", liveVersion: nextVersion, publishedAt: new Date() },
    });

    return { version: snap.version, websiteId };
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
