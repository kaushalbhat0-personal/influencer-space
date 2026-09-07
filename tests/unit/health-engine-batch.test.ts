import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  productGroupBy: vi.fn(),
  galleryGroupBy: vi.fn(),
  linkGroupBy: vi.fn(),
  timelineGroupBy: vi.fn(),
  feedGroupBy: vi.fn(),
  gameGroupBy: vi.fn(),
  orderGroupBy: vi.fn(),
  brandFindMany: vi.fn(),
  websiteFindMany: vi.fn(),
  publishFindMany: vi.fn(),
  settingFindMany: vi.fn(),
  // single-path mocks for parity test
  brandFindFirst: vi.fn(),
  productCount: vi.fn(),
  galleryCount: vi.fn(),
  linkCount: vi.fn(),
  timelineCount: vi.fn(),
  feedCount: vi.fn(),
  gameCount: vi.fn(),
  settingFindUnique: vi.fn(),
  websiteFindUnique: vi.fn(),
  publishFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      groupBy: mocks.productGroupBy,
      count: mocks.productCount,
      findFirst: mocks.brandFindFirst, // not used but placeholder
    },
    galleryImage: { groupBy: mocks.galleryGroupBy, count: mocks.galleryCount },
    affiliateLink: { groupBy: mocks.linkGroupBy, count: mocks.linkCount },
    timelineEvent: { groupBy: mocks.timelineGroupBy, count: mocks.timelineCount },
    contentFeedItem: { groupBy: mocks.feedGroupBy, count: mocks.feedCount },
    game: { groupBy: mocks.gameGroupBy, count: mocks.gameCount },
    productOrder: { groupBy: mocks.orderGroupBy },
    brand: { findMany: mocks.brandFindMany, findFirst: mocks.brandFindFirst },
    website: { findMany: mocks.websiteFindMany, findUnique: mocks.websiteFindUnique },
    publishStatus: { findMany: mocks.publishFindMany, findFirst: mocks.publishFindFirst },
    setting: { findMany: mocks.settingFindMany, findUnique: mocks.settingFindUnique },
    booking: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

// websiteAggregateService is used by single-path runChecks for sharedReads and orderCount
vi.mock("@/modules/tenant/application/website-aggregate.service", () => ({
  websiteAggregateService: {
    getSharedReads: vi.fn().mockResolvedValue({ brand: null, testimonialsData: null, faqData: null, seoData: null, website: null }),
    getOrderCountPaidCompleted: vi.fn().mockImplementation(async (tid: string) => (tid === "t1" ? 1 : 0)),
  },
}));

vi.mock("react", () => ({ cache: (fn: unknown) => fn as unknown }));

import { websiteHealthEngine } from "@/lib/platform/health/engine";

beforeEach(() => {
  vi.clearAllMocks();
  // Default batch mocks: 2 tenants t1 (rich) and t2 (sparse)
  mocks.productGroupBy.mockResolvedValue([{ tenantId: "t1", _count: { _all: 5 } }]); // t1 has 5 products, t2 0
  mocks.galleryGroupBy.mockResolvedValue([{ tenantId: "t1", _count: { _all: 10 } }]);
  mocks.linkGroupBy.mockResolvedValue([{ tenantId: "t1", _count: { _all: 4 } }]);
  mocks.timelineGroupBy.mockResolvedValue([{ tenantId: "t1", _count: { _all: 5 } }, { tenantId: "t2", _count: { _all: 0 } }]);
  mocks.feedGroupBy.mockResolvedValue([{ tenantId: "t1", _count: { _all: 5 } }]);
  mocks.gameGroupBy.mockResolvedValue([{ tenantId: "t1", _count: { _all: 4 } }]);
  mocks.orderGroupBy.mockResolvedValue([{ tenantId: "t1", _count: { _all: 1 } }]);
  mocks.brandFindMany.mockResolvedValue([{ name: "Brand T1", tagline: "Tag", bio: "Bio", avatarUrl: "http://a", website: { tenantId: "t1" } }]);
  mocks.websiteFindMany.mockResolvedValue([
    { id: "w1", themeColors: { primary: "#fff" }, tenantId: "t1" },
    { id: "w2", themeColors: {}, tenantId: "t2" },
  ]);
  mocks.publishFindMany.mockResolvedValue([{ state: "live", website: { tenantId: "t1" } }]);
  mocks.settingFindMany.mockResolvedValue([
    { tenantId: "t1", key: "testimonials", value: [{}, {}, {}, {}] },
    { tenantId: "t1", key: "faq", value: [{}, {}, {}, {}] },
    { tenantId: "t1", key: "seo", value: "seo" },
  ]);
  // Single-path mocks (for parity)
  mocks.brandFindFirst.mockResolvedValue({ name: "Brand T1", tagline: "Tag", bio: "Bio", avatarUrl: "http://a" });
  mocks.productCount.mockResolvedValue(5);
  mocks.galleryCount.mockResolvedValue(10);
  mocks.linkCount.mockResolvedValue(4);
  mocks.timelineCount.mockResolvedValue(5);
  mocks.feedCount.mockResolvedValue(5);
  mocks.gameCount.mockResolvedValue(4);
  mocks.settingFindUnique.mockImplementation(async ({ where }: { where: { tenantId_key: { tenantId: string; key: string } } }) => {
    if (where.tenantId_key.key === "testimonials") return { value: [{}, {}, {}, {}] } as never;
    if (where.tenantId_key.key === "faq") return { value: [{}, {}, {}, {}] } as never;
    if (where.tenantId_key.key === "seo") return { value: "seo" } as never;
    return null as never;
  });
  mocks.websiteFindUnique.mockResolvedValue({ id: "w1", themeColors: { primary: "#fff" } } as never);
  mocks.publishFindFirst.mockResolvedValue({ state: "live" } as never);
});

describe("HealthEngine batch parity and query reduction", () => {
  it("evaluateMany uses ~11 queries total for N=2, not 13*N", async () => {
    const map = await websiteHealthEngine.evaluateMany(["t1", "t2"]);
    expect(map.size).toBe(2);
    // Each batched query should be called exactly once
    expect(mocks.productGroupBy).toHaveBeenCalledTimes(1);
    expect(mocks.galleryGroupBy).toHaveBeenCalledTimes(1);
    expect(mocks.linkGroupBy).toHaveBeenCalledTimes(1);
    expect(mocks.timelineGroupBy).toHaveBeenCalledTimes(1);
    expect(mocks.feedGroupBy).toHaveBeenCalledTimes(1);
    expect(mocks.gameGroupBy).toHaveBeenCalledTimes(1);
    expect(mocks.orderGroupBy).toHaveBeenCalledTimes(1);
    expect(mocks.brandFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.websiteFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.publishFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.settingFindMany).toHaveBeenCalledTimes(1);
    // Verify tenant isolation: where clause contains both tenantIds
    expect(mocks.productGroupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: { in: ["t1", "t2"] } }) }));
    expect(mocks.settingFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: { in: ["t1", "t2"] } }) }));
  });

  it("batch scores equal single-tenant scores for same data", async () => {
    const single = await websiteHealthEngine.evaluate("t1");
    const batch = await websiteHealthEngine.evaluateMany(["t1"]);
    const batched = batch.get("t1")!;
    expect(batched.overallScore).toBe(single.overallScore);
    expect(batched.checks.length).toBe(single.checks.length);
    // Spot-check a few checks
    expect(batched.checks.find((c) => c.id === "products")!.score).toBe(single.checks.find((c) => c.id === "products")!.score);
    expect(batched.checks.find((c) => c.id === "publishing")!.score).toBe(single.checks.find((c) => c.id === "publishing")!.score);
  });

  it("sparse tenant scores lower than rich tenant", async () => {
    const map = await websiteHealthEngine.evaluateMany(["t1", "t2"]);
    expect(map.get("t1")!.overallScore).toBeGreaterThan(map.get("t2")!.overallScore);
  });

  it("empty input returns empty map without queries", async () => {
    const map = await websiteHealthEngine.evaluateMany([]);
    expect(map.size).toBe(0);
    expect(mocks.productGroupBy).not.toHaveBeenCalled();
  });

  it("deduplicates tenantIds", async () => {
    const map = await websiteHealthEngine.evaluateMany(["t1", "t1", "t2"]);
    expect(map.size).toBe(2);
    expect(mocks.productGroupBy).toHaveBeenCalledTimes(1);
  });
});
