import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockPublishStatusFindUnique,
  mockPublishStatusUpsert,
  mockPublishSnapshotCreate,
  mockPublishSnapshotFindUnique,
  mockPublishSnapshotFindFirst,
  mockPublishSnapshotFindMany,
  mockWebsiteFindUnique,
  mockTransaction,
} = vi.hoisted(() => ({
  mockPublishStatusFindUnique: vi.fn(),
  mockPublishStatusUpsert: vi.fn(),
  mockPublishSnapshotCreate: vi.fn(),
  mockPublishSnapshotFindUnique: vi.fn(),
  mockPublishSnapshotFindFirst: vi.fn(),
  mockPublishSnapshotFindMany: vi.fn(),
  mockWebsiteFindUnique: vi.fn(),
  mockTransaction: vi.fn<(cb: (tx: Record<string, unknown>) => Promise<unknown>) => Promise<unknown>>(),
}));

mockTransaction.mockImplementation(async (cb) => {
  const tx = {
    publishSnapshot: { create: mockPublishSnapshotCreate, findFirst: mockPublishSnapshotFindFirst, findUnique: mockPublishSnapshotFindUnique },
    publishStatus: { upsert: mockPublishStatusUpsert, findUnique: mockPublishStatusFindUnique },
  };
  return cb(tx);
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    publishStatus: { findUnique: mockPublishStatusFindUnique },
    publishSnapshot: { create: mockPublishSnapshotCreate, findUnique: mockPublishSnapshotFindUnique, findFirst: mockPublishSnapshotFindFirst, findMany: mockPublishSnapshotFindMany },
    website: { findUnique: mockWebsiteFindUnique },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/content/website-aggregate.service", () => ({
  websiteAggregateService: {
    build: vi.fn().mockResolvedValue({
      identity: { name: "Test", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
      hero: { title: "Hello", subtitle: "", description: "" },
      products: [],
      gallery: [],
      links: [],
      seo: { title: "", description: "" },
    }),
  },
}));

import { PublishSnapshotService } from "@/lib/publishing/snapshot";

const service = new PublishSnapshotService();

const artifactSnapshot = {
  website: { title: "Test Store", tagline: "Best" },
  theme: { primary: "#6366F1", secondary: "#818CF8", mode: "dark", fonts: { heading: "Inter", body: "Inter" } },
  pages: [{ id: "p1", type: "home", title: "Home", slug: "/" }],
  navigation: { desktop: [] },
  sections: [{ id: "s1", type: "hero", page: "home", order: 0, props: { headline: "Welcome" } }],
  products: [],
  gallery: { enabled: false, albums: [] },
  seo: { title: "SEO", description: "Desc" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPublishStatusFindUnique.mockResolvedValue({ id: "ps-1", websiteId: "w-1", state: "live", liveVersion: null, publishedAt: null, createdAt: new Date(), updatedAt: new Date() });
  mockPublishSnapshotCreate.mockResolvedValue({ id: "snap-1", websiteId: "w-1", version: 1, state: "live", snapshot: {}, createdAt: new Date() });
  mockPublishStatusUpsert.mockResolvedValue({ id: "ps-1", websiteId: "w-1", state: "live", liveVersion: 1, publishedAt: new Date() });
  mockWebsiteFindUnique.mockResolvedValue({
    id: "w-1",
    tenantId: "t-1",
    themePackageId: "neon-dark",
    themeColors: {},
    themeFonts: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

describe("PublishSnapshotService.publish", () => {
  it("creates snapshot and upserts publish status", async () => {
    const result = await service.publish("w-1", artifactSnapshot);

    expect(mockPublishSnapshotCreate).toHaveBeenCalledTimes(1);
    expect(mockPublishStatusUpsert).toHaveBeenCalledTimes(1);
    expect(result.version).toBe(1);
  });

  it("stores snapshot as canonical format via serializeSnapshot", async () => {
    await service.publish("w-1", artifactSnapshot);

    const call = mockPublishSnapshotCreate.mock.calls[0][0];
    expect(call.data.websiteId).toBe("w-1");
    expect(call.data.state).toBe("live");
    expect(call.data.snapshot).toBeDefined();
    expect(call.data.snapshot._schema).toBe("creatorstore.snapshot");
  });

  it("returns version from created snapshot", async () => {
    const result = await service.publish("w-1", artifactSnapshot);
    expect(result).toHaveProperty("version");
  });
});

describe("PublishSnapshotService.getLive", () => {
  it("returns null when no live version exists", async () => {
    mockPublishStatusFindUnique.mockResolvedValue(null);
    const result = await service.getLive("w-1");
    expect(result).toBeNull();
  });
});

describe("PublishSnapshotService.list", () => {
  it("returns snapshots list", async () => {
    mockPublishSnapshotFindMany.mockResolvedValue([
      { version: 1, state: "live", createdAt: new Date() },
      { version: 2, state: "preview", createdAt: new Date() },
    ]);
    const result = await service.list("w-1");
    expect(result).toHaveLength(2);
  });
});

describe("PublishSnapshotService.rollback", () => {
  it("returns empty pages when no canonical data exists", async () => {
    mockPublishSnapshotFindUnique.mockResolvedValue({
      snapshot: { someField: "value" },
    });
    const result = await service.rollback("w-1", 1);
    expect(result.pages).toEqual([]);
  });
});
