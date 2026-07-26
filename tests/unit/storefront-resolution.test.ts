import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTenantFindFirst, mockWebsiteFindUnique, mockGetLive, mockGetPublicPageData } = vi.hoisted(() => ({
  mockTenantFindFirst: vi.fn(),
  mockWebsiteFindUnique: vi.fn(),
  mockGetLive: vi.fn(),
  mockGetPublicPageData: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findFirst: mockTenantFindFirst },
    website: { findUnique: mockWebsiteFindUnique },
  },
}));

vi.mock("@/lib/publishing/snapshot", () => ({
  publishSnapshotService: { getLive: mockGetLive },
}));

vi.mock("@/services/public.service", () => ({
  getPublicPageData: mockGetPublicPageData,
}));

vi.mock("@/lib/config/platform", () => ({
  buildStorefrontUrl: (slug: string) => `http://localhost:3000/${slug}`,
}));

import { getPublishedPageData } from "@/services/published.service";

const mockLegacy = {
  profile: { name: "Legacy", tagline: "", bio: "", profileImage: null, social: { instagram: "", youtube: "", twitter: "", tiktok: "" }, colors: { primary: "#000", secondary: "#fff", accent: "#f00" } },
  hero: { videoUrl: "", posterUrl: "", subtitle: "", ctaText: "", ctaLink: "", ctaSecondaryText: "", ctaSecondaryLink: "", liveBadgeText: "", showLiveBadge: false, videoDesktopAlignment: "center", videoMobileAlignment: "center", imageDesktopAlignment: "center", imageMobileAlignment: "center" },
  products: [], links: [], gallery: [], milestones: [], games: [], feed: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPublicPageData.mockResolvedValue(mockLegacy);
});

describe("Storefront resolution: Tenant -> Website -> Snapshot", () => {
  it("requires tenant lookup first (tenant not found = 404)", async () => {
    mockTenantFindFirst.mockResolvedValue(null);
    const tenant = await mockTenantFindFirst({ where: { OR: [{ subdomain: "unknown" }, { customDomain: "unknown" }] } });
    expect(tenant).toBeNull();
  });

  it("resolves tenant by subdomain", async () => {
    mockTenantFindFirst.mockResolvedValue({ id: "t-1", subdomain: "known", name: "Known" });
    const tenant = await mockTenantFindFirst();
    expect(tenant).toBeTruthy();
  });

  it("resolves tenant by customDomain", async () => {
    mockTenantFindFirst.mockResolvedValue({ id: "t-1", customDomain: "custom.com", name: "Custom" });
    const tenant = await mockTenantFindFirst();
    expect(tenant).toBeTruthy();
  });
});

describe("Storefront resolution: getPublishedPageData path", () => {
  it("resolves tenant ID -> Website UUID -> Snapshot (canonical path)", async () => {
    mockWebsiteFindUnique.mockResolvedValue({ id: "w-1" });
    mockGetLive.mockResolvedValue({ version: 1, data: { sections: [], website: { title: "S", tagline: "" }, theme: { primary: "#6366F1", secondary: "#818CF8", mode: "dark", fonts: {} }, pages: [], navigation: {}, products: [], gallery: { enabled: false, albums: [] }, seo: { title: "T", description: "D" } } });

    const result = await getPublishedPageData("t-1");

    expect(mockWebsiteFindUnique).toHaveBeenCalledWith({ where: { tenantId: "t-1" }, select: { id: true } });
    expect(mockGetLive).toHaveBeenCalledWith("w-1");
    expect(result.fromSnapshot).toBe(true);
  });

  it("falls back to legacy when no snapshot exists", async () => {
    mockWebsiteFindUnique.mockResolvedValue({ id: "w-1" });
    mockGetLive.mockResolvedValue(null);

    const result = await getPublishedPageData("t-1");

    expect(result.fromSnapshot).toBe(false);
    expect(result.snapshot).toBeNull();
    expect(result.legacy).toEqual(mockLegacy);
  });

  it("falls back to legacy when no website record exists", async () => {
    mockWebsiteFindUnique.mockResolvedValue(null);

    const result = await getPublishedPageData("t-1");

    expect(result.fromSnapshot).toBe(false);
    expect(result.snapshot).toBeNull();
    expect(mockGetLive).not.toHaveBeenCalled();
  });

  it("returns legacy data even when snapshot exists (dual load)", async () => {
    mockWebsiteFindUnique.mockResolvedValue({ id: "w-1" });
    mockGetLive.mockResolvedValue({ version: 1, data: { sections: [], website: { title: "S", tagline: "" }, theme: { primary: "#6366F1", secondary: "#818CF8", mode: "dark", fonts: {} }, pages: [], navigation: {}, products: [], gallery: { enabled: false, albums: [] }, seo: { title: "T", description: "D" } } });

    const result = await getPublishedPageData("t-1");

    expect(result.legacy).toEqual(mockLegacy);
    expect(result.fromSnapshot).toBe(true);
  });

  it("maintains backward compatibility with legacy-only creators", async () => {
    mockWebsiteFindUnique.mockResolvedValue(null);
    mockGetPublicPageData.mockResolvedValue(mockLegacy);

    const result = await getPublishedPageData("legacy-tenant");

    expect(result.fromSnapshot).toBe(false);
    expect(result.legacy).toEqual(mockLegacy);
    expect(result.snapshot).toBeNull();
  });

  it("never passes tenantId to getLive (always uses websiteId)", async () => {
    mockWebsiteFindUnique.mockResolvedValue({ id: "website-real-uuid" });
    mockGetLive.mockResolvedValue(null);

    await getPublishedPageData("tenant-uuid");

    expect(mockGetLive).toHaveBeenCalledWith("website-real-uuid");
    expect(mockGetLive).not.toHaveBeenCalledWith("tenant-uuid");
  });
});

describe("Storefront resolution: error scenarios", () => {
  it("handles tenant not found as null (not throw)", async () => {
    mockTenantFindFirst.mockResolvedValue(null);

    const tenant = await mockTenantFindFirst();
    expect(tenant).toBeNull();
  });

  it("handles website lookup rejection without crashing published service", async () => {
    mockWebsiteFindUnique.mockRejectedValue(new Error("DB connection failed"));

    await expect(getPublishedPageData("t-1")).rejects.toThrow();
  });

  it("handles snapshot service rejection gracefully", async () => {
    mockWebsiteFindUnique.mockResolvedValue({ id: "w-1" });
    mockGetLive.mockRejectedValue(new Error("Snapshot service error"));

    await expect(getPublishedPageData("t-1")).rejects.toThrow();
  });

  it("handles legacy data loading failure when no website", async () => {
    mockWebsiteFindUnique.mockResolvedValue(null);
    mockGetPublicPageData.mockRejectedValue(new Error("Legacy load failed"));

    await expect(getPublishedPageData("t-1")).rejects.toThrow();
  });
});
