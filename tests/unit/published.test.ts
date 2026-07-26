import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWebsiteFindUnique, mockGetLive, mockGetPublicPageData } = vi.hoisted(() => ({
  mockWebsiteFindUnique: vi.fn(),
  mockGetLive: vi.fn(),
  mockGetPublicPageData: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    website: { findUnique: mockWebsiteFindUnique },
  },
}));

vi.mock("@/lib/publishing/snapshot", () => ({
  publishSnapshotService: { getLive: mockGetLive },
}));

vi.mock("@/services/public.service", () => ({
  getPublicPageData: mockGetPublicPageData,
}));

import { getPublishedPageData, extractProfileFromPages, extractSeoFromPages } from "@/services/published.service";

const mockLegacyData = {
  profile: { name: "Test Creator", tagline: "Tagline", bio: "Bio", profileImage: null, social: { instagram: "", youtube: "", twitter: "", tiktok: "" }, colors: { primary: "#000", secondary: "#fff", accent: "#f00" } },
  hero: { videoUrl: "", posterUrl: "", subtitle: "", ctaText: "", ctaLink: "", ctaSecondaryText: "", ctaSecondaryLink: "", liveBadgeText: "", showLiveBadge: false, videoDesktopAlignment: "center", videoMobileAlignment: "center", imageDesktopAlignment: "center", imageMobileAlignment: "center" },
  products: [], links: [], gallery: [], milestones: [], games: [], feed: [],
};

const mockSnapshotData = {
  version: 1,
  data: {
    website: { title: "Test Store", tagline: "Best store" },
    theme: { primary: "#6366F1", secondary: "#818CF8", mode: "dark", fonts: { heading: "Inter", body: "Inter" } },
    pages: [{ id: "p1", type: "home", title: "Home", slug: "/" }],
    navigation: { desktop: [] },
    sections: [{ id: "s1", type: "hero", page: "home", order: 0, props: { headline: "Welcome" } }],
    products: [], gallery: { enabled: false, albums: [] }, seo: { title: "Test SEO", description: "Test Description" },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPublicPageData.mockResolvedValue(mockLegacyData);
});

describe("getPublishedPageData", () => {
  it("resolves website by tenantId before snapshot lookup", async () => {
    mockWebsiteFindUnique.mockResolvedValue({ id: "website-uuid-1" });
    mockGetLive.mockResolvedValue(mockSnapshotData);

    await getPublishedPageData("tenant-uuid-1");

    expect(mockWebsiteFindUnique).toHaveBeenCalledWith({
      where: { tenantId: "tenant-uuid-1" },
      select: { id: true },
    });
    expect(mockGetLive).toHaveBeenCalledWith("website-uuid-1");
  });

  it("returns snapshot data when snapshot exists", async () => {
    mockWebsiteFindUnique.mockResolvedValue({ id: "website-uuid-1" });
    mockGetLive.mockResolvedValue(mockSnapshotData);

    const result = await getPublishedPageData("tenant-uuid-1");

    expect(result.snapshot).toEqual(mockSnapshotData.data);
    expect(result.fromSnapshot).toBe(true);
    expect(result.tenantId).toBe("tenant-uuid-1");
    expect(result.websiteId).toBe("website-uuid-1");
  });

  it("returns legacy fallback when snapshot is null", async () => {
    mockWebsiteFindUnique.mockResolvedValue({ id: "website-uuid-1" });
    mockGetLive.mockResolvedValue(null);

    const result = await getPublishedPageData("tenant-uuid-1");

    expect(result.snapshot).toBeNull();
    expect(result.fromSnapshot).toBe(false);
    expect(result.legacy).toEqual(mockLegacyData);
  });

  it("falls back to legacy when website not found", async () => {
    mockWebsiteFindUnique.mockResolvedValue(null);

    const result = await getPublishedPageData("tenant-uuid-missing");

    expect(result.snapshot).toBeNull();
    expect(result.fromSnapshot).toBe(false);
    expect(result.legacy).toEqual(mockLegacyData);
    expect(mockGetLive).not.toHaveBeenCalled();
  });

  it("returns legacy data from getPublicPageData", async () => {
    mockWebsiteFindUnique.mockResolvedValue({ id: "website-uuid-1" });
    mockGetLive.mockResolvedValue(null);

    const result = await getPublishedPageData("tenant-uuid-1");

    expect(mockGetPublicPageData).toHaveBeenCalledWith("tenant-uuid-1");
    expect(result.legacy).toBe(mockLegacyData);
  });

  it("falls back to legacy even when website not found", async () => {
    mockWebsiteFindUnique.mockResolvedValue(null);
    mockGetPublicPageData.mockResolvedValue(mockLegacyData);

    const result = await getPublishedPageData("tenant-uuid-missing");

    expect(result.legacy).toEqual(mockLegacyData);
    expect(result.fromSnapshot).toBe(false);
  });

  it("sets empty websiteId when website not found", async () => {
    mockWebsiteFindUnique.mockResolvedValue(null);

    const result = await getPublishedPageData("tenant-uuid-missing");

    expect(result.websiteId).toBe("");
  });
});

describe("extractProfileFromPages", () => {
  it("extracts name and tagline from artifact hero section", () => {
    const snapshot = {
      sections: [{ type: "hero", props: { headline: "Alice", subheadline: "Artist" } }],
    };

    const result = extractProfileFromPages(snapshot as never);

    expect(result.name).toBe("Alice");
    expect(result.tagline).toBe("Artist");
    expect(result.bio).toBe("Artist");
  });

  it("extracts name from artifact about section", () => {
    const snapshot = {
      sections: [{ type: "about", props: { title: "About Bob", bio: "Bob is great" } }],
    };

    const result = extractProfileFromPages(snapshot as never);

    expect(result.name).toBe("Bob");
    expect(result.bio).toBe("Bob is great");
  });

  it("extracts name from legacy hero slot", () => {
    const snapshot = {
      themePackageId: "dark",
      pages: [{ isHome: false, name: "Page", slug: "/", order: 0, theme: "", metadata: {}, sections: [{ id: "s1", name: "hero", order: 0, visible: true, locked: false, metadata: {}, slots: [{ id: "sl1", moduleId: "hero.default", parentId: null, order: 0, visible: true, locked: false, config: { title: "Charlie", subtitle: "The Best" }, metadata: {} }] }] }],
    };

    const result = extractProfileFromPages(snapshot as never);

    expect(result.name).toBe("Charlie");
  });

  it("returns defaults when no matching section found", () => {
    const snapshot = { sections: [{ type: "unknown", props: {} }] };

    const result = extractProfileFromPages(snapshot as never);

    expect(result.name).toBe("Creator");
    expect(result.tagline).toBe("");
    expect(result.bio).toBe("");
    expect(result.profileImage).toBeNull();
  });

  it("extracts profileImage from legacy about section", () => {
    const snapshot = {
      themePackageId: "dark",
      pages: [{ isHome: false, name: "Page", slug: "/", order: 0, theme: "", metadata: {}, sections: [{ id: "s1", name: "about", order: 0, visible: true, locked: false, metadata: {}, slots: [{ id: "sl1", moduleId: "about.default", parentId: null, order: 0, visible: true, locked: false, config: { title: "About Diana", content: "Bio", imageUrl: "/diana.jpg" }, metadata: {} }] }] }],
    };

    const result = extractProfileFromPages(snapshot as never);

    expect(result.profileImage).toBe("/diana.jpg");
  });
});

describe("extractSeoFromPages", () => {
  it("returns artifact seo when present", () => {
    const snapshot = {
      seo: { title: "Custom Title", description: "Custom Desc" },
      sections: [],
    };

    const result = extractSeoFromPages(snapshot as never);

    expect(result.title).toBe("Custom Title");
    expect(result.description).toBe("Custom Desc");
  });

  it("falls back to profile extraction when no seo field", () => {
    const snapshot = {
      sections: [{ type: "hero", props: { headline: "Eve" } }],
    };

    const result = extractSeoFromPages(snapshot as never);

    expect(result.title).toContain("Eve");
    expect(result.description).toBeDefined();
  });

  it("handles legacy snapshot without seo field", () => {
    const snapshot = {
      themePackageId: "dark",
      pages: [{ sections: [{ slots: [{ moduleId: "hero.default", config: { title: "Frank" } }] }] }],
    };

    const result = extractSeoFromPages(snapshot as never);

    expect(result.title).toContain("Frank");
  });
});
