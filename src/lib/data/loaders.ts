import { prisma } from "@/lib/prisma";
import { findStorefrontProducts } from "@/lib/products/queries";
import { toPublicProductList } from "@/lib/products/mapper";

export interface ResolvedComponentData {
  title?: string;
  items?: Record<string, unknown>[];
  empty: boolean;
}

// ── Product Loader ─────────────────────────────────────────────────

export async function loadProducts(tenantId: string, productId?: string): Promise<ResolvedComponentData> {
  const where: Record<string, unknown> = { tenantId, isActive: true };
  if (productId) where.id = productId;

  const products = await prisma.product.findMany({
    where: JSON.parse(JSON.stringify(where)) as never,
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, description: true, price: true, imageUrl: true } as never,
  });

  return { title: "Products", items: products as never[], empty: products.length === 0 };
}

export async function loadProductsForStorefront(tenantId: string) {
  const products = await findStorefrontProducts(tenantId);
  return toPublicProductList(products as unknown as Parameters<typeof toPublicProductList>[0]);
}

// ── Gallery Loader ─────────────────────────────────────────────────

export async function loadGallery(tenantId: string): Promise<ResolvedComponentData> {
  const { findStorefrontGallery } = await import("@/lib/gallery/queries");
  const { toStorefrontList } = await import("@/lib/gallery/mapper");
  const rows = await findStorefrontGallery(tenantId);
  const items = toStorefrontList(rows as unknown as Parameters<typeof toStorefrontList>[0]);
  return { title: "Gallery", items, empty: items.length === 0 };
}

export async function loadGalleryForStorefront(tenantId: string) {
  const { findStorefrontGallery } = await import("@/lib/gallery/queries");
  const { toStorefrontList } = await import("@/lib/gallery/mapper");
  const rows = await findStorefrontGallery(tenantId);
  return toStorefrontList(rows as unknown as Parameters<typeof toStorefrontList>[0]);
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
