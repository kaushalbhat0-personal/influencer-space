import { prisma } from "@/lib/prisma";
import type { BuilderPage } from "@/lib/builder/types";

export interface PublishSnapshotData {
  pages: BuilderPage[];
  themePackageId: string;
  themeColors: Record<string, string>;
  themeFonts: Record<string, string>;
}

export class PublishSnapshotService {
  /** Take a snapshot of the current website state and publish it live. */
  async publish(websiteId: string, snapshot: PublishSnapshotData): Promise<{ version: number }> {
    const existing = await prisma.publishStatus.findUnique({ where: { websiteId } });
    const nextVersion = (existing?.liveVersion ?? 0) + 1;

    const result = await prisma.$transaction(async (tx) => {
      const snap = await tx.publishSnapshot.create({
        data: {
          websiteId,
          version: nextVersion,
          state: "live",
          snapshot: JSON.parse(JSON.stringify(snapshot)),
        },
      });

      await tx.publishStatus.upsert({
        where: { websiteId },
        create: { websiteId, state: "live", liveVersion: nextVersion, publishedAt: new Date() },
        update: { state: "live", liveVersion: nextVersion, publishedAt: new Date() },
      });

      return snap;
    });

    return { version: result.version };
  }

  /** Create a preview snapshot (not live). */
  async preview(websiteId: string, snapshot: PublishSnapshotData): Promise<{ version: number }> {
    const existing = await prisma.publishSnapshot.findFirst({
      where: { websiteId, state: "preview" },
      orderBy: { version: "desc" },
    });
    const nextVersion = (existing?.version ?? 0) + 1;

    const snap = await prisma.publishSnapshot.create({
      data: {
        websiteId,
        version: nextVersion,
        state: "preview",
        snapshot: JSON.parse(JSON.stringify(snapshot)),
      },
    });

    await prisma.publishStatus.upsert({
      where: { websiteId },
      create: { websiteId, state: "preview" },
      update: { state: "preview" },
    });

    return { version: snap.version };
  }

  /** Rollback to a specific version. */
  async rollback(websiteId: string, version: number): Promise<PublishSnapshotData> {
    const snap = await prisma.publishSnapshot.findUnique({
      where: { websiteId_version: { websiteId, version } },
    });
    if (!snap) throw new Error(`Snapshot version ${version} not found`);

    // Create a new snapshot with the old data but next version
    const data = snap.snapshot as unknown as PublishSnapshotData;
    return data;
  }

  /** Get a specific snapshot. */
  async get(websiteId: string, version: number): Promise<PublishSnapshotData | null> {
    const snap = await prisma.publishSnapshot.findUnique({
      where: { websiteId_version: { websiteId, version } },
    });
    if (!snap) return null;
    return snap.snapshot as unknown as PublishSnapshotData;
  }

  /** Get the live snapshot content. */
  async getLive(websiteId: string): Promise<{ version: number; data: PublishSnapshotData } | null> {
    const status = await prisma.publishStatus.findUnique({ where: { websiteId } });
    if (!status?.liveVersion) return null;
    const snap = await this.get(websiteId, status.liveVersion);
    if (!snap) return null;
    return { version: status.liveVersion, data: snap };
  }

  /** List all snapshots for a website. */
  async list(websiteId: string): Promise<{ version: number; state: string; createdAt: Date }[]> {
    const snaps = await prisma.publishSnapshot.findMany({
      where: { websiteId },
      select: { version: true, state: true, createdAt: true },
      orderBy: { version: "desc" },
      take: 50,
    });
    return snaps;
  }
}

export const publishSnapshotService = new PublishSnapshotService();
