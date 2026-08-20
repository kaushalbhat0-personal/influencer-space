import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockBrand: vi.fn(),
  mockHero: vi.fn(),
  mockProducts: vi.fn(),
  mockProductsFeatured: vi.fn(),
  mockProductsNonFeatured: vi.fn(),
  mockGallery: vi.fn(),
  mockGalleryFeatured: vi.fn(),
  mockGalleryNonFeatured: vi.fn(),
  mockLinks: vi.fn(),
  mockSeo: vi.fn(),
  mockWebsite: vi.fn(),
  mockTimeline: vi.fn(),
  mockGames: vi.fn(),
  mockFeed: vi.fn(),
  mockOffering: vi.fn(),
  mockBooking: vi.fn(),
  mockSetting: vi.fn(),
  mockResolveHeroMedia: vi.fn(),
  mockDescribeHeroMedia: vi.fn(),
}));

vi.mock("@/modules/tenant/infrastructure/brand-repository", () => ({
  brandRepository: { findByTenantId: h.mockBrand },
}));
vi.mock("@/modules/tenant/infrastructure/product-repository", () => ({
  productRepository: {
    findPublished: h.mockProducts,
    findFeatured: h.mockProductsFeatured,
    findNonFeatured: h.mockProductsNonFeatured,
  },
}));
vi.mock("@/modules/tenant/infrastructure/gallery-repository", () => ({
  galleryRepository: {
    findPublished: h.mockGallery,
    findFeatured: h.mockGalleryFeatured,
    findNonFeatured: h.mockGalleryNonFeatured,
  },
}));
vi.mock("@/modules/tenant/infrastructure/link-repository", () => ({
  linkRepository: { findPublished: h.mockLinks },
}));
vi.mock("@/modules/tenant/infrastructure/website-repository", () => ({
  websiteRepository: { findByTenantId: h.mockWebsite },
}));
vi.mock("@/services/settings.service", () => ({
  SettingsService: {
    getHeroData: h.mockHero,
    getSeo: h.mockSeo,
    getSettingByKey: h.mockSetting,
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    timelineEvent: { findMany: h.mockTimeline },
    game: { findMany: h.mockGames },
    contentFeedItem: { findMany: h.mockFeed },
    offering: { findMany: h.mockOffering },
    booking: { findMany: h.mockBooking },
  },
}));
vi.mock("@/lib/media/service", () => ({
  mediaService: { resolveUrls: vi.fn().mockResolvedValue({}) },
}));
vi.mock("@/lib/media/resolve", () => ({ normalizeAssetId: (id: string) => id }));
vi.mock("@/lib/media/hero-media", () => ({
  describeHeroMedia: h.mockDescribeHeroMedia,
  resolveHeroMediaForRuntime: h.mockResolveHeroMedia,
}));
vi.mock("@/config/commerce/commerce-mode", () => ({ normalizeCommerceMode: (m: string) => m }));
vi.mock("@/lib/commerce/whatsapp", () => ({ resolveWhatsAppDestination: () => undefined }));

import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";

const TENANT = "tenant-a";

beforeEach(() => {
  vi.clearAllMocks();
  h.mockResolveHeroMedia.mockReturnValue({
    resolvedMedia: "image",
    mediaType: "image",
    mediaUrl: null,
    mediaPoster: null,
    rendererDecision: "image",
  });
  h.mockDescribeHeroMedia.mockReturnValue({ resolvedMedia: "image", mediaType: "image", mediaUrl: null, mediaPoster: null });
  const hero = { title: "Hi", subtitle: "Sub", name: "Creator", bio: "bio" };
  h.mockBrand.mockResolvedValue({ id: "b1", name: "Brand", tagline: "tag", bio: "bio", socialLinks: [] });
  h.mockHero.mockResolvedValue(hero);
  h.mockLinks.mockResolvedValue([{ id: "l1", title: "L", url: "https://x.com", order: 0 }]);
  h.mockSeo.mockResolvedValue({ title: "SEO", description: "desc" });
  h.mockWebsite.mockResolvedValue({ id: "w1", tenantId: TENANT, tenant: { name: "Creator" } });
  h.mockSetting.mockResolvedValue(null);
  h.mockTimeline.mockResolvedValue([]);
  h.mockGames.mockResolvedValue([]);
  h.mockFeed.mockResolvedValue([]);
  h.mockOffering.mockResolvedValue([]);
  h.mockBooking.mockResolvedValue([]);
  // Non-homepage products/gallery
  h.mockProducts.mockResolvedValue([
    { id: "p1", name: "Featured Product", price: 10, isFeatured: true, isActive: true, commerceMode: "ONLINE", slug: "p1" },
    { id: "p2", name: "Regular Product", price: 5, isFeatured: false, isActive: true, commerceMode: "ONLINE", slug: "p2" },
  ]);
  h.mockGallery.mockResolvedValue([
    { id: "g1", title: "G1", imageUrl: "https://x/1.png", mediaType: "image", isFeatured: true },
    { id: "g2", title: "G2", imageUrl: "https://x/2.png", mediaType: "image", isFeatured: false },
  ]);
  // Homepage-mode products/gallery (featured + top-up)
  h.mockProductsFeatured.mockResolvedValue([{ id: "p1", name: "Featured Product", price: 10, isFeatured: true, isActive: true, commerceMode: "ONLINE", slug: "p1" }]);
  h.mockProductsNonFeatured.mockResolvedValue([{ id: "p2", name: "Regular Product", price: 5, isFeatured: false, isActive: true, commerceMode: "ONLINE", slug: "p2" }]);
  h.mockGalleryFeatured.mockResolvedValue([{ id: "g1", title: "G1", imageUrl: "https://x/1.png", mediaType: "image", isFeatured: true }]);
  h.mockGalleryNonFeatured.mockResolvedValue([{ id: "g2", title: "G2", imageUrl: "https://x/2.png", mediaType: "image", isFeatured: false }]);
});

describe("RCCF-72.17C.2 — publish aggregate shared-read reuse", () => {
  it("produces output identical to the standalone homepage build (equivalence)", async () => {
    const old = await websiteAggregateService.build(TENANT, { homepage: true });
    const full = await websiteAggregateService.buildWithDiagnosticsAndShared(TENANT);
    const reused = await websiteAggregateService.buildHomepageFromShared(TENANT, full.sharedReads);
    expect(JSON.stringify(reused)).toBe(JSON.stringify(old));
    expect(reused.products).toEqual(old.products);
    expect(reused.gallery).toEqual(old.gallery);
    expect(reused.identity.name).toBe(old.identity.name);
  });

  it("does NOT re-query the shared reads in the reuse path (query reduction)", async () => {
    await websiteAggregateService.buildWithDiagnosticsAndShared(TENANT);
    await websiteAggregateService.buildHomepageFromShared(TENANT, (await websiteAggregateService.buildWithDiagnosticsAndShared(TENANT)).sharedReads);

    // Shared reads queried once per full build; the homepage reuse path adds zero.
    const sharedCalls = h.mockBrand.mock.calls.length + h.mockHero.mock.calls.length + h.mockLinks.mock.calls.length + h.mockSeo.mock.calls.length + h.mockWebsite.mock.calls.length + h.mockSetting.mock.calls.length + h.mockBooking.mock.calls.length;
    // 2 full builds × 1 each for brand/hero/links/seo/website + 4 settings + booking = 9 shared reads per full build.
    // The 2 homepage reuse builds must add ZERO shared reads.
    expect(sharedCalls).toBe(2 * 9);
  });

  it("issues the homepage-only collection queries in the reuse path (products featured+topUp, gallery)", async () => {
    const full = await websiteAggregateService.buildWithDiagnosticsAndShared(TENANT);
    await websiteAggregateService.buildHomepageFromShared(TENANT, full.sharedReads);
    // Homepage mode still queries featured + non-featured products/gallery.
    expect(h.mockProductsFeatured).toHaveBeenCalled();
    expect(h.mockProductsNonFeatured).toHaveBeenCalled();
    expect(h.mockGalleryFeatured).toHaveBeenCalled();
    expect(h.mockGalleryNonFeatured).toHaveBeenCalled();
  });

  it("respects tenant scoping — the reuse path does not widen queries", async () => {
    const full = await websiteAggregateService.buildWithDiagnosticsAndShared("tenant-b");
    await websiteAggregateService.buildHomepageFromShared("tenant-b", full.sharedReads);
    // All repository reads are tenant-scoped by the caller-provided tenantId.
    expect(h.mockBrand).toHaveBeenCalledWith("tenant-b");
    expect(h.mockWebsite).toHaveBeenCalledWith("tenant-b");
    expect(h.mockBooking).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: "tenant-b" }) }));
  });
});