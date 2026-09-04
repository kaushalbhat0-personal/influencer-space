/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import type { BuilderPage } from "@/lib/builder/types";

// P2: try to use Next server cache when available, fallback to direct call in tests
function getUnstableCache(): typeof import("next/cache").unstable_cache | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("next/cache") as { unstable_cache?: typeof import("next/cache").unstable_cache };
    return typeof mod.unstable_cache === "function" ? mod.unstable_cache : null;
  } catch {
    return null;
  }
}

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
  async rollback(websiteId: string, version: number): Promise<{ pages: BuilderPage[] }> {
    try {
      const snap = await prisma.publishSnapshot.findUnique({
        where: { websiteId_version: { websiteId, version } },
      });
      if (!snap) throw new Error(`Snapshot version ${version} not found`);

      const data = snap.snapshot as Record<string, unknown>;

      // Canonical shape (written by serializeSnapshot): top-level `layout`.
      // Legacy artifact shape: `canonical.layout`. Both are supported so old
      // snapshots restore correctly.
      const layout = (data.layout ?? (data.canonical as Record<string, unknown> | undefined)?.layout) as
        | Record<string, unknown>
        | undefined;
      const pages = layout?.pages as Array<Record<string, unknown>> | undefined;

      if (!Array.isArray(pages)) {
        throw new Error(`Snapshot version ${version} has no layout pages`);
      }

      return {
        pages: pages.map((p: any) => ({
          id: p.id ?? `page_${crypto.randomUUID()}`,
          name: p.name ?? "Home",
          slug: p.slug ?? "/",
          isHome: (p.isHome ?? p.slug === "/") || false,
          order: p.order ?? 0,
          theme: "",
          metadata: p.metadata ?? {},
          sections: ((p.sections ?? []) as Array<Record<string, unknown>>).map((s: any) => ({
            id: s.id ?? `section_${crypto.randomUUID()}`,
            name: typeof s.name === "string" && s.name ? s.name : (s.moduleId as string) ?? "Section",
            order: s.order ?? 0,
            visible: s.visible ?? true,
            locked: false,
            metadata: s.metadata ?? {},
            slots: [{
              id: `slot_${s.id ?? crypto.randomUUID()}`,
              moduleId: s.moduleId as string,
              parentId: null,
              order: 0,
              visible: s.visible ?? true,
              locked: false,
              config: s.config ?? {},
              metadata: {},
            }],
          })),
        })) as BuilderPage[],
      };
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

  // P2: persistent cache for live snapshot — immutable until next publish, tenant-isolated
  async getLiveCached(websiteId: string, tenantId: string): Promise<{ version: number; data: SnapshotData } | null> {
    const uc = getUnstableCache();
    if (!uc) return this.getLive(websiteId);
    const cached = uc(
      async (wid: string): Promise<{ version: number; data: SnapshotData } | null> => {
        const status = await prisma.publishStatus.findUnique({ where: { websiteId: wid } });
        if (!status?.liveVersion) return null;
        const snap = await prisma.publishSnapshot.findUnique({
          where: { websiteId_version: { websiteId: wid, version: status.liveVersion } },
        });
        if (!snap) return null;
        return { version: status.liveVersion, data: snap.snapshot as unknown as SnapshotData };
      },
      ["publish-live", websiteId],
      { tags: [`publish:${tenantId}`, `publish:${websiteId}`, `tenant:${tenantId}`] },
    );
    return cached(websiteId);
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

  // P2: cached recent publish metadata (for dashboard Version History) — same tags as live
  async listCached(websiteId: string, tenantId: string): Promise<{ version: number; state: string; createdAt: Date }[]> {
    const uc = getUnstableCache();
    if (!uc) return this.list(websiteId);
    const cached = uc(
      async (wid: string) => {
        const snaps = await prisma.publishSnapshot.findMany({
          where: { websiteId: wid },
          select: { version: true, state: true, createdAt: true },
          orderBy: { version: "desc" },
          take: 10,
        });
        return snaps;
      },
      ["publish-list", websiteId],
      { tags: [`publish:${tenantId}`, `publish:${websiteId}`, `tenant:${tenantId}`] },
    );
    return cached(websiteId);
  }
}

export const publishSnapshotService = new PublishSnapshotService();
