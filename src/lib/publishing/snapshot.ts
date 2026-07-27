/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import type { BuilderPage } from "@/lib/builder/types";
import { resolveModuleId, moduleIdToDisplayName } from "@/lib/registry/resolve-module";

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

function builderPagesToArtifact(pages: BuilderPage[], website: Record<string, any>): ArtifactSnapshotRecord {
  return {
    website: { title: "", tagline: "" },
    theme: {
      primary: website?.themeColors?.primary ?? "#6366F1",
      secondary: website?.themeColors?.secondary ?? "#818CF8",
      mode: "light",
      fonts: { heading: "Inter", body: "Inter" },
    },
    pages: pages.map((p) => ({ id: p.id, type: p.isHome ? "home" : "products", title: p.name, slug: p.slug })),
    navigation: { desktop: pages.map((p) => ({ label: p.name, href: `/${p.slug}`, order: p.order })) },
    sections: pages.flatMap((p) =>
      p.sections.map((s, i) => ({
        id: s.id,
        type: s.slots.length > 0 ? s.slots[0]!.moduleId : s.name,
        page: p.isHome ? "home" : "products",
        order: i,
        props: s.slots.length > 0 ? s.slots[0]!.config : {},
      }))
    ),
    products: [],
    gallery: { enabled: false, albums: [] },
    seo: { title: "", description: "" },
  };
}

function isLegacySnapshot(snapshot: SnapshotData): snapshot is { pages: BuilderPage[]; themePackageId: string; themeColors: Record<string, string>; themeFonts: Record<string, string> } {
  return "themePackageId" in snapshot;
}

export class PublishSnapshotService {
  async publish(websiteId: string, snapshot: SnapshotData): Promise<{ version: number }> {
    try {
      const existing = await prisma.publishStatus.findUnique({ where: { websiteId } });
      const nextVersion = (existing?.liveVersion ?? 0) + 1;

      let artifact: ArtifactSnapshotRecord;
      if (isLegacySnapshot(snapshot)) {
        const websiteRaw = await prisma.website.findUnique({
          where: { id: websiteId },
          select: { themePackageId: true, themeColors: true, themeFonts: true },
        });
        const website = (websiteRaw ?? {}) as unknown as Record<string, any>;
        artifact = builderPagesToArtifact(snapshot.pages, website);
      } else {
        artifact = snapshot;
      }

      const result = await prisma.$transaction(async (tx) => {
        const snap = await tx.publishSnapshot.create({
          data: {
            websiteId,
            version: nextVersion,
            state: "live",
            snapshot: JSON.parse(JSON.stringify(artifact)),
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
    } catch (error) {
      throw error;
    }
  }

  async publishFromArtifact(websiteId: string, artifact: ArtifactSnapshotRecord): Promise<{ version: number }> {
    return this.publish(websiteId, artifact);
  }

  async preview(websiteId: string, snapshot: SnapshotData): Promise<{ version: number }> {
    try {
      let artifact: ArtifactSnapshotRecord;
      if (isLegacySnapshot(snapshot)) {
        const websiteRaw = await prisma.website.findUnique({
          where: { id: websiteId },
          select: { themePackageId: true, themeColors: true, themeFonts: true },
        });
        const website = (websiteRaw ?? {}) as unknown as Record<string, any>;
        artifact = builderPagesToArtifact(snapshot.pages, website);
      } else {
        artifact = snapshot;
      }

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
            snapshot: JSON.parse(JSON.stringify(artifact)),
          },
        });

        await tx.publishStatus.upsert({
          where: { websiteId },
          create: { websiteId, state: "preview" },
          update: { state: "preview" },
        });

        return snap;
      });

      return { version: result.version };
    } catch (error) {
      throw error;
    }
  }

  async rollback(websiteId: string, version: number): Promise<{ pages: BuilderPage[] }> {
    try {
      const snap = await prisma.publishSnapshot.findUnique({
        where: { websiteId_version: { websiteId, version } },
      });
      if (!snap) throw new Error(`Snapshot version ${version} not found`);

      const data = snap.snapshot as unknown as SnapshotData;

      if (isLegacySnapshot(data)) {
        return { pages: data.pages };
      }

      const artifact = data as ArtifactSnapshotRecord;
      const moduleId = (s: ArtifactSnapshotRecord["sections"][number]) => resolveModuleId(s.type);
      const displayName = (s: ArtifactSnapshotRecord["sections"][number]) => moduleIdToDisplayName(moduleId(s));
      const pages: BuilderPage[] = artifact.sections.map((s, i) => ({
        id: s.id,
        name: displayName(s),
        slug: s.page === "home" ? "/" : `/${s.page}`,
        order: i,
        isHome: s.page === "home",
        theme: "",
        metadata: {},
        sections: [{
          id: s.id,
          name: displayName(s),
          order: 0,
          visible: true,
          locked: false,
          metadata: {},
          slots: [{
            id: `slot_${s.id}`,
            moduleId: moduleId(s),
            parentId: null,
            order: 0,
            visible: true,
            locked: false,
            config: s.props ?? {},
            metadata: {},
          }],
        }],
      }));

      return { pages };
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
