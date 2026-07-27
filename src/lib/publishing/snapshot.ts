/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/prisma";
import type { BuilderPage } from "@/lib/builder/types";
import { websiteAggregateService } from "@/lib/content/website-aggregate.service";
import { serializeSnapshot } from "./snapshot-serializer";
import { publishRepository } from "./repository";
import {
  SNAPSHOT_SCHEMA,
  CURRENT_SNAPSHOT_VERSION,
  type PublishedSnapshot,
} from "@/types/snapshot";

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
  async publish(websiteId: string, _snapshot: SnapshotData): Promise<{ version: number }> {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { tenantId: true, themePackageId: true, themeColors: true, themeFonts: true },
    });
    if (!website) throw new Error("Website not found");

    const aggregate = await websiteAggregateService.build(website.tenantId);
    const dbThemeColors = website.themeColors as Record<string, string> | undefined;
    const dbThemeFonts = website.themeFonts as Record<string, string> | undefined;

    const canonicalSnapshot: PublishedSnapshot = {
      _schema: SNAPSHOT_SCHEMA,
      _version: CURRENT_SNAPSHOT_VERSION,
      metadata: {
        version: 0,
        publishedAt: new Date().toISOString(),
        previousVersion: null,
        correlationId: `publish_${websiteId}_${Date.now()}`,
        generatedBy: "onboarding",
      },
      content: aggregate,
      layout: {
        pages: [],
      },
      theme: {
        packageId: website.themePackageId,
        colors: {
          primary: dbThemeColors?.primary ?? "#6366F1",
          secondary: dbThemeColors?.secondary ?? "#818CF8",
          accent: dbThemeColors?.accent ?? "#A5B4FC",
          background: dbThemeColors?.background ?? "#09090b",
          foreground: dbThemeColors?.foreground ?? "#fafafa",
          muted: dbThemeColors?.muted ?? "#a1a1aa",
        },
        typography: {
          heading: dbThemeFonts?.heading ?? "Inter",
          body: dbThemeFonts?.body ?? "Inter",
        },
      },
      navigation: [],
      renderingHints: {},
    };

    return prisma.$transaction(async (tx) => {
      const existing = await tx.publishStatus.findUnique({ where: { websiteId } });
      const nextVersion = (existing?.liveVersion ?? 0) + 1;

      canonicalSnapshot.metadata.version = nextVersion;

      const snap = await tx.publishSnapshot.create({
        data: {
          websiteId,
          version: nextVersion,
          state: "live",
          snapshot: JSON.parse(JSON.stringify(serializeSnapshot(canonicalSnapshot))),
        },
      });

      await tx.publishStatus.upsert({
        where: { websiteId },
        create: { websiteId, state: "live", liveVersion: nextVersion, publishedAt: new Date() },
        update: { state: "live", liveVersion: nextVersion, publishedAt: new Date() },
      });

      return { version: snap.version };
    });
  }

  async publishFromArtifact(websiteId: string, artifact: ArtifactSnapshotRecord): Promise<{ version: number }> {
    return this.publish(websiteId, artifact);
  }

  async preview(websiteId: string, _snapshot: SnapshotData): Promise<{ version: number }> {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { tenantId: true, themePackageId: true, themeColors: true, themeFonts: true },
    });
    const aggregate = website ? await websiteAggregateService.build(website.tenantId) : undefined;
    const colors = (website?.themeColors ?? {}) as Record<string, string>;
    const fonts = (website?.themeFonts ?? {}) as Record<string, string>;
    const preview: PublishedSnapshot = {
      _schema: SNAPSHOT_SCHEMA, _version: CURRENT_SNAPSHOT_VERSION,
      metadata: { version: 0, publishedAt: new Date().toISOString(), previousVersion: null, correlationId: `preview_${websiteId}`, generatedBy: "dashboard" },
      content: aggregate ?? { identity: { name: "", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] }, hero: { title: "", subtitle: "", description: "" }, products: [], gallery: [], links: [], seo: { title: "", description: "" } },
      layout: { pages: [] },
      theme: { packageId: website?.themePackageId ?? "neon-dark", colors: { primary: colors?.primary ?? "#6366F1", secondary: colors?.secondary ?? "#818CF8", accent: colors?.accent ?? "#A5B4FC", background: colors?.background ?? "#09090b", foreground: colors?.foreground ?? "#fafafa", muted: colors?.muted ?? "#a1a1aa" }, typography: { heading: fonts?.heading ?? "Inter", body: fonts?.body ?? "Inter" } },
      navigation: [], renderingHints: {},
    };
    const result = await publishRepository.createPreview(websiteId, preview);
    return { version: result.version };
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
