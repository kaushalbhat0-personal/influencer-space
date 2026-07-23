import { prisma } from "@/lib/prisma";

export interface ResolvedComponentData {
  title?: string;
  items?: Record<string, unknown>[];
  empty: boolean;
}

// ── Product Loader ─────────────────────────────────────────────────

const PRODUCT_SELECT = { id: true, name: true, description: true, price: true, imageUrl: true } as const;

export async function loadProducts(tenantId: string, productId?: string): Promise<ResolvedComponentData> {
  const where: Record<string, unknown> = { tenantId, isActive: true };
  if (productId) where.id = productId;

  const products = await prisma.product.findMany({
    where: JSON.parse(JSON.stringify(where)) as never,
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: PRODUCT_SELECT,
  });

  return { title: "Products", items: products as never[], empty: products.length === 0 };
}

export async function loadProductsForStorefront(tenantId: string) {
  return prisma.product.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: PRODUCT_SELECT,
  });
}

// ── Gallery Loader ─────────────────────────────────────────────────

const GALLERY_SELECT = { id: true, title: true, description: true, imageUrl: true, mediaType: true, videoUrl: true } as const;

export async function loadGallery(tenantId: string): Promise<ResolvedComponentData> {
  const images = await prisma.galleryImage.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: GALLERY_SELECT,
  });

  const items = images.map((g) => ({
    id: g.id, url: g.mediaType === "video" && g.videoUrl ? g.videoUrl : g.imageUrl,
    caption: g.description || g.title, isVideo: g.mediaType === "video",
  }));

  return { title: "Gallery", items, empty: items.length === 0 };
}

export async function loadGalleryForStorefront(tenantId: string) {
  const rows = await prisma.galleryImage.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: { ...GALLERY_SELECT },
  });
  return rows.map((g) => ({
    id: g.id,
    url: g.mediaType === "video" && g.videoUrl ? g.videoUrl : g.imageUrl,
    caption: g.description || g.title,
    isVideo: g.mediaType === "video",
  }));
}

// ── Timeline Loader ────────────────────────────────────────────────

const TIMELINE_SELECT = { id: true, year: true, title: true, description: true, imageUrl: true, stats: true } as const;

export async function loadTimeline(tenantId: string): Promise<ResolvedComponentData> {
  const events = await prisma.timelineEvent.findMany({
    where: { tenantId, isActive: true },
    orderBy: { year: "desc" },
    select: TIMELINE_SELECT,
  });

  return { title: "Timeline", items: events as never[], empty: events.length === 0 };
}

export async function loadTimelineForStorefront(tenantId: string) {
  return prisma.timelineEvent.findMany({
    where: { tenantId, isActive: true },
    orderBy: { year: "desc" },
    select: TIMELINE_SELECT,
  });
}

// ── Affiliate Loader ───────────────────────────────────────────────

const AFFILIATE_SELECT = { id: true, title: true, url: true, imageUrl: true, clicks: true } as const;

export async function loadAffiliates(tenantId: string): Promise<ResolvedComponentData> {
  const links = await prisma.affiliateLink.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: AFFILIATE_SELECT,
  });

  return { title: "Links", items: links as never[], empty: links.length === 0 };
}

export async function loadAffiliatesForStorefront(tenantId: string) {
  return prisma.affiliateLink.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: AFFILIATE_SELECT,
  });
}

// ── Games Loader ───────────────────────────────────────────────────

const GAME_SELECT = { id: true, name: true, logoUrl: true, genre: true } as const;

export async function loadGamesForStorefront(tenantId: string) {
  return prisma.game.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: GAME_SELECT,
  });
}
