import { prisma } from "@/lib/prisma";
import type { BuilderPage } from "@/lib/builder/types";

function logSnapshotEvent(event: string, websiteId: string, meta: Record<string, unknown>): void {
  console.error(
    JSON.stringify({
      event,
      websiteId,
      ...meta,
      timestamp: new Date().toISOString(),
    })
  );
}

export interface PublishSnapshotData {
  pages: BuilderPage[];
  themePackageId: string;
  themeColors: Record<string, string>;
  themeFonts: Record<string, string>;
}

export class PublishSnapshotService {
  /** Take a snapshot of the current website state and publish it live. */
  async publish(websiteId: string, snapshot: PublishSnapshotData): Promise<{ version: number }> {
    try {
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

      logSnapshotEvent("publish.succeeded", websiteId, { version: nextVersion });
      return { version: result.version };
    } catch (error) {
      logSnapshotEvent("publish.failed", websiteId, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /** Create a preview snapshot (not live). */
  async preview(websiteId: string, snapshot: PublishSnapshotData): Promise<{ version: number }> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.publishSnapshot.findFirst({
          where: { websiteId, state: "preview" },
          orderBy: { version: "desc" },
        });
        const nextVersion = (existing?.version ?? 0) + 1;

        const snap = await tx.publishSnapshot.create({
          data: {
            websiteId,
            version: nextVersion,
            state: "preview",
            snapshot: JSON.parse(JSON.stringify(snapshot)),
          },
        });

        await tx.publishStatus.upsert({
          where: { websiteId },
          create: { websiteId, state: "preview" },
          update: { state: "preview" },
        });

        return snap;
      });

      logSnapshotEvent("preview.succeeded", websiteId, { version: result.version });
      return { version: result.version };
    } catch (error) {
      logSnapshotEvent("preview.failed", websiteId, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /** Rollback to a specific version — re-publishes the old snapshot as a new version. */
  async rollback(websiteId: string, version: number): Promise<PublishSnapshotData> {
    try {
      const snap = await prisma.publishSnapshot.findUnique({
        where: { websiteId_version: { websiteId, version } },
      });
      if (!snap) throw new Error(`Snapshot version ${version} not found`);

      const data = snap.snapshot as unknown as PublishSnapshotData;

      logSnapshotEvent("rollback.succeeded", websiteId, { fromVersion: version });
      return data;
    } catch (error) {
      logSnapshotEvent("rollback.failed", websiteId, {
        version,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
    try {
      const status = await prisma.publishStatus.findUnique({ where: { websiteId } });
      if (!status?.liveVersion) return null;
      const snap = await this.get(websiteId, status.liveVersion);
      if (!snap) {
        logSnapshotEvent("snapshot.missing", websiteId, { liveVersion: status.liveVersion });
        return null;
      }
      return { version: status.liveVersion, data: snap };
    } catch (error) {
      logSnapshotEvent("snapshot.load.failed", websiteId, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
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
