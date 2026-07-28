/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import type { BuilderPage } from "@/lib/builder/types";

export type PublishSnapshotData = SnapshotData;

export interface ArtifactSnapshotRecord {
  website: { title: string; tagline: string };
  theme: { primary: string; secondary: string; mode: string; fonts: Record<string, unknown> };
  pages: Array<{ id: string; type: string; title: string; slug: string }>;
  navigation: Record<string, unknown>;
  sections: Array<{ id: string; type: string; page: string; order: number; props: Record<string, unknown> }>;
  products: Array<Record<string, unknown>>;
  gallery: Record<string, unknown>;
  seo: { title: string; description: string };
}

export type SnapshotData = ArtifactSnapshotRecord | {
  pages: BuilderPage[];
  themePackageId: string;
  themeColors: Record<string, string>;
  themeFonts: Record<string, string>;
};

export class PublishSnapshotService {
  async getPreview(websiteId: string): Promise<{ version: number; data: SnapshotData } | null> {
    try {
      const snap = await prisma.publishSnapshot.findFirst({
        where: { websiteId, state: "preview" },
        orderBy: { version: "desc" },
      });
      if (!snap) return null;
      return { version: snap.version, data: snap.snapshot as unknown as SnapshotData };
    } catch {
      return null;
    }
  }

  async rollback(websiteId: string, version: number): Promise<{ pages: BuilderPage[] }> {
    try {
      const snap = await prisma.publishSnapshot.findUnique({
        where: { websiteId_version: { websiteId, version } },
      });
      if (!snap) throw new Error(`Snapshot version ${version} not found`);

      const data = snap.snapshot as Record<string, unknown>;
      const canonical = data.canonical as Record<string, unknown> | undefined;

      if (canonical) {
        const layout = canonical.layout as Record<string, unknown> | undefined;
        const pages = layout?.pages as Array<Record<string, unknown>> | undefined;
        if (pages) {
          return { pages: pages.map((p: any) => ({
            id: p.id, name: p.name, slug: p.slug, isHome: p.isHome, order: p.order,
            theme: "", metadata: {},
            sections: (p.sections ?? []).map((s: any) => ({
              id: s.id, name: s.moduleId, order: s.order, visible: s.visible ?? true,
              locked: false, metadata: {},
              slots: [{
                id: `slot_${s.id}`,
                moduleId: s.moduleId,
                parentId: null, order: 0, visible: true, locked: false,
                config: s.config ?? {}, metadata: {},
              }],
            })),
          })) as BuilderPage[] };
        }
      }

      return { pages: [] };
    } catch (error) {
      throw error;
    }
  }

  async get(websiteId: string, version: number): Promise<SnapshotData | null> {
    const snap = await prisma.publishSnapshot.findUnique({
      where: { websiteId_version: { websiteId, version } },
    });
    if (!snap) return null;
    return snap.snapshot as unknown as SnapshotData;
  }

  async getLive(websiteId: string): Promise<{ version: number; data: SnapshotData } | null> {
    try {
      const status = await prisma.publishStatus.findUnique({ where: { websiteId } });
      if (!status?.liveVersion) return null;
      const snap = await this.get(websiteId, status.liveVersion);
      if (!snap) return null;
      return { version: status.liveVersion, data: snap };
    } catch {
      return null;
    }
  }

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
