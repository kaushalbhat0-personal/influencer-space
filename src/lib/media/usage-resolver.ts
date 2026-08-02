/**
 * Asset Usage Resolver — IMPLEMENTATION-23 (PART 12).
 *
 * THE single source of truth for "where is this asset used". The Media Library
 * Used/Unused badge, the Asset Details "Used In" panel, and Delete protection
 * ALL consume this resolver. There is no cached boolean, no manually
 * maintained "used" flag, and no duplicated logic.
 *
 * It inspects every runtime reference LIVE on every call:
 *   hero_data, Brand, Gallery, Products, Services/Courses (Offerings),
 *   Testimonials, FAQ, Timeline, Games, Content Feed, Affiliate Links,
 *   Builder Draft (Page → Section → Block config), Published Snapshots,
 *   Navigation.
 *
 * Matching is by BOTH asset id and public URL (some entities store ids, others
 * store urls). Batched — no N+1.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";

export interface AssetUsage {
  label: string;
  href: string;
}

export interface AssetUsageResult {
  used: boolean;
  usages: AssetUsage[];
}

interface IndexEntry {
  label: string;
  href: string;
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function isUrl(v: unknown): v is string {
  return typeof v === "string" && /^https?:\/\//i.test(v);
}

/** Recursively walk arbitrary JSON and index asset ids + asset urls. */
function indexJson(
  value: unknown,
  idSet: Set<string>,
  urlSet: Set<string>,
  label: string,
  href: string,
  byId: Map<string, IndexEntry[]>,
  byUrl: Map<string, IndexEntry[]>,
): void {
  if (Array.isArray(value)) {
    for (const item of value) indexJson(item, idSet, urlSet, label, href, byId, byUrl);
    return;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const [k, v] of Object.entries(record)) {
      const keyLower = k.toLowerCase();
      // Asset ids: keys ending in "assetid" or exactly "assetid".
      if (isUuid(v) && (keyLower.endsWith("assetid") || keyLower === "assetid" || keyLower.endsWith("_assetid"))) {
        if (idSet.has(v)) push(byId, v, { label, href });
      }
      // URLs: keys ending in "url" OR any https string that matches a known asset url.
      if (isUrl(v)) {
        if (keyLower.endsWith("url") || urlSet.has(v)) {
          if (urlSet.has(v)) push(byUrl, v, { label, href });
        }
      }
      // Recurse into nested objects/arrays.
      if (v && typeof v === "object") indexJson(v, idSet, urlSet, label, href, byId, byUrl);
    }
    return;
  }
  // Bare string url inside an array (e.g. images: ["https://…"]).
  if (isUrl(value) && urlSet.has(value)) {
    push(byUrl, value, { label, href });
  }
}

function push(map: Map<string, IndexEntry[]>, key: string, entry: IndexEntry): void {
  const list = map.get(key);
  if (list) {
    if (!list.some((e) => e.label === entry.label && e.href === entry.href)) list.push(entry);
  } else {
    map.set(key, [entry]);
  }
}

function dedupe(entries: IndexEntry[]): IndexEntry[] {
  const seen = new Set<string>();
  const out: IndexEntry[] = [];
  for (const e of entries) {
    const key = `${e.label}|${e.href}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}

interface ResolveInput {
  tenantId: string;
  assets: Array<{ id: string; publicUrl: string | null }>;
}

export async function resolveAssetUsage(
  input: ResolveInput,
): Promise<Record<string, AssetUsageResult>> {
  const { tenantId, assets } = input;
  const results: Record<string, AssetUsageResult> = {};
  if (assets.length === 0) return results;
  for (const a of assets) results[a.id] = { used: false, usages: [] };

  const idSet = new Set(assets.map((a) => a.id));
  const urlSet = new Set(assets.filter((a) => a.publicUrl).map((a) => a.publicUrl as string));
  const byId = new Map<string, IndexEntry[]>();
  const byUrl = new Map<string, IndexEntry[]>();

  try {
    const website = await prisma.website.findUnique({
      where: { tenantId },
      select: { id: true },
    });
    const websiteId = website?.id ?? "";

    // ── hero_data (explicit field → label mapping) ──
    const heroSetting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "hero_data" } },
      select: { value: true },
    });
    if (heroSetting?.value && typeof heroSetting.value === "object") {
      const hero = heroSetting.value as Record<string, unknown>;
      const HERO_FIELDS: Array<[string, string, string]> = [
        ["videoAssetId", "Hero Video", "/admin/settings"],
        ["posterAssetId", "Hero Poster", "/admin/settings"],
        ["backgroundAssetId", "Hero Background", "/admin/settings"],
        ["profilePictureAssetId", "Profile Picture", "/admin/settings"],
        ["videoUrl", "Hero Video", "/admin/settings"],
        ["posterUrl", "Hero Poster", "/admin/settings"],
        ["backgroundUrl", "Hero Background", "/admin/settings"],
        ["profilePictureUrl", "Profile Picture", "/admin/settings"],
      ];
      for (const [field, label, href] of HERO_FIELDS) {
        const v = hero[field];
        if (isUuid(v) && idSet.has(v)) push(byId, v, { label, href });
        if (isUrl(v) && urlSet.has(v)) push(byUrl, v, { label, href });
      }
      // Social link avatars / any other urls.
      indexJson(hero.socialLinks, idSet, urlSet, "Hero", "/admin/settings", byId, byUrl);
    }

    // ── Brand ──
    const brand = websiteId
      ? await prisma.brand.findUnique({ where: { websiteId }, select: { avatarAssetId: true, bannerAssetId: true, avatarUrl: true, bannerUrl: true } })
      : null;
    if (brand) {
      if (brand.avatarAssetId && idSet.has(brand.avatarAssetId)) push(byId, brand.avatarAssetId, { label: "Profile Picture", href: "/admin/settings" });
      if (brand.bannerAssetId && idSet.has(brand.bannerAssetId)) push(byId, brand.bannerAssetId, { label: "Banner", href: "/admin/settings" });
      if (brand.avatarUrl && urlSet.has(brand.avatarUrl)) push(byUrl, brand.avatarUrl, { label: "Profile Picture", href: "/admin/settings" });
      if (brand.bannerUrl && urlSet.has(brand.bannerUrl)) push(byUrl, brand.bannerUrl, { label: "Banner", href: "/admin/settings" });
    }

    // ── Gallery ──
    const gallery = await prisma.galleryImage.findMany({
      where: { tenantId },
      select: { id: true, title: true, assetId: true, imageUrl: true, videoUrl: true },
    });
    for (const g of gallery) {
      const label = `Gallery: ${g.title || "Image"}`;
      const href = "/admin/gallery";
      if (g.assetId && idSet.has(g.assetId)) push(byId, g.assetId, { label, href });
      if (g.imageUrl && urlSet.has(g.imageUrl)) push(byUrl, g.imageUrl, { label, href });
      if (g.videoUrl && urlSet.has(g.videoUrl)) push(byUrl, g.videoUrl, { label, href });
    }

    // ── Products ──
    const products = await prisma.product.findMany({
      where: { tenantId },
      select: { id: true, name: true, imageAssetId: true, imageUrl: true, images: true },
    });
    for (const p of products) {
      const label = `Product: ${p.name || "Product"}`;
      const href = "/admin/products";
      if (p.imageAssetId && idSet.has(p.imageAssetId)) push(byId, p.imageAssetId, { label, href });
      if (p.imageUrl && urlSet.has(p.imageUrl)) push(byUrl, p.imageUrl, { label, href });
      if (p.images) indexJson(p.images, idSet, urlSet, label, href, byId, byUrl);
    }

    // ── Affiliate Links ──
    const links = await prisma.affiliateLink.findMany({
      where: { tenantId },
      select: { imageAssetId: true, imageUrl: true },
    });
    for (const l of links) {
      if (l.imageAssetId && idSet.has(l.imageAssetId)) push(byId, l.imageAssetId, { label: "Affiliate Link", href: "/admin/links" });
      if (l.imageUrl && urlSet.has(l.imageUrl)) push(byUrl, l.imageUrl, { label: "Affiliate Link", href: "/admin/links" });
    }

    // ── Timeline ──
    const timeline = await prisma.timelineEvent.findMany({
      where: { tenantId },
      select: { title: true, imageAssetId: true, imageUrl: true },
    });
    for (const t of timeline) {
      const label = `Timeline: ${t.title || "Event"}`;
      if (t.imageAssetId && idSet.has(t.imageAssetId)) push(byId, t.imageAssetId, { label, href: "/admin/milestones" });
      if (t.imageUrl && urlSet.has(t.imageUrl)) push(byUrl, t.imageUrl, { label, href: "/admin/milestones" });
    }

    // ── Games ──
    const games = await prisma.game.findMany({
      where: { tenantId },
      select: { name: true, logoAssetId: true, logoUrl: true },
    });
    for (const g of games) {
      const label = `Game: ${g.name || "Game"}`;
      if (g.logoAssetId && idSet.has(g.logoAssetId)) push(byId, g.logoAssetId, { label, href: "/admin/games" });
      if (g.logoUrl && urlSet.has(g.logoUrl)) push(byUrl, g.logoUrl, { label, href: "/admin/games" });
    }

    // ── Offerings (services/courses) ──
    const offerings = await prisma.offering.findMany({
      where: { tenantId },
      select: { id: true, title: true, type: true, metadata: true },
    });
    for (const o of offerings) {
      const label = `${o.type === "course" ? "Course" : "Service"}: ${o.title || o.type}`;
      const href = o.type === "course" ? "/admin/courses" : "/admin/services";
      indexJson(o.metadata, idSet, urlSet, label, href, byId, byUrl);
    }

    // ── Content Feed ──
    const feed = await prisma.contentFeedItem.findMany({
      where: { tenantId },
      select: { thumbnailAssetId: true, thumbnailUrl: true, url: true },
    });
    for (const f of feed) {
      const label = "Content Feed";
      if (f.thumbnailAssetId && idSet.has(f.thumbnailAssetId)) push(byId, f.thumbnailAssetId, { label, href: "/admin/settings/content" });
      if (f.thumbnailUrl && urlSet.has(f.thumbnailUrl)) push(byUrl, f.thumbnailUrl, { label, href: "/admin/settings/content" });
      if (f.url && urlSet.has(f.url)) push(byUrl, f.url, { label, href: "/admin/settings/content" });
    }

    // ── Testimonials + FAQ (Setting JSON) ──
    for (const key of ["testimonials", "faq"]) {
      const s = await prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key } }, select: { value: true } });
      if (s?.value) {
        indexJson(s.value, idSet, urlSet, key === "faq" ? "FAQ" : "Testimonials", key === "faq" ? "/admin/faq" : "/admin/testimonials", byId, byUrl);
      }
    }

    // ── Builder Draft (Page → Section → Block config) ──
    if (websiteId) {
      const blocks = await prisma.block.findMany({
        where: { section: { page: { websiteId } } },
        select: { config: true, moduleId: true },
      });
      for (const b of blocks) {
        const label = `Builder Draft (${b.moduleId || "section"})`;
        const href = "/builder";
        indexJson(b.config, idSet, urlSet, label, href, byId, byUrl);
      }

      // ── Published Snapshot ──
      const snapshots = await prisma.publishSnapshot.findMany({
        where: { websiteId },
        select: { snapshot: true },
      });
      for (const s of snapshots) {
        indexJson(s.snapshot, idSet, urlSet, "Published Snapshot", "/builder", byId, byUrl);
      }

      // ── Navigation (website config may hold nav icon urls) ──
      const nav = await prisma.website.findUnique({ where: { id: websiteId }, select: { themeConfig: true } });
      if (nav?.themeConfig) {
        indexJson(nav.themeConfig, idSet, urlSet, "Navigation", "/", byId, byUrl);
      }
    }

    // ── Compose results ──
    for (const a of assets) {
      const entries: IndexEntry[] = [];
      const byIdEntries = byId.get(a.id) ?? [];
      entries.push(...byIdEntries);
      if (a.publicUrl) entries.push(...(byUrl.get(a.publicUrl) ?? []));
      const usages = dedupe(entries);
      results[a.id] = { used: usages.length > 0, usages };
    }
  } catch (error) {
    logger.warn("resolveAssetUsage failed — treating all as unused", "media", {
      metadata: { tenantId },
      error: error instanceof Error ? error : undefined,
    });
    // Never block listing on resolver failure; report unused + empty usages.
  }

  return results;
}
