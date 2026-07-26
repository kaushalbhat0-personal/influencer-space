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
    publishSnapshot: { create: mockPublishSnapshotCreate, findFirst: mockPublishSnapshotFindFirst },
    publishStatus: { upsert: mockPublishStatusUpsert },
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
  mockPublishSnapshotCreate.mockResolvedValue({ id: "snap-1", websiteId: "w-1", version: 1, state: "live", snapshot: artifactSnapshot, createdAt: new Date() });
  mockPublishStatusUpsert.mockResolvedValue({ id: "ps-1", websiteId: "w-1", state: "live", liveVersion: 1, publishedAt: new Date() });
});

describe("PublishSnapshotService.publish", () => {
  it("creates snapshot with next version number", async () => {
    mockPublishStatusFindUnique.mockResolvedValue({ liveVersion: 3 });

    await service.publish("w-1", artifactSnapshot);

    expect(mockPublishStatusFindUnique).toHaveBeenCalledWith({ where: { websiteId: "w-1" } });
    expect(mockPublishSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ websiteId: "w-1", version: 4, state: "live" }),
      }),
    );
  });

  it("starts version at 1 when no previous version exists", async () => {
    mockPublishStatusFindUnique.mockResolvedValue({ liveVersion: null });

    await service.publish("w-1", artifactSnapshot);

    expect(mockPublishSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 1 }),
      }),
    );
  });

  it("upserts PublishStatus with incremented version", async () => {
    mockPublishStatusFindUnique.mockResolvedValue({ liveVersion: 2 });

    await service.publish("w-1", artifactSnapshot);

    expect(mockPublishStatusUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { websiteId: "w-1" },
        create: expect.objectContaining({ state: "live", liveVersion: 3 }),
        update: expect.objectContaining({ state: "live", liveVersion: 3 }),
      }),
    );
  });

  it("returns version number from created snapshot", async () => {
    mockPublishSnapshotCreate.mockResolvedValue({ id: "snap-1", version: 1 });

    const result = await service.publish("w-1", artifactSnapshot);

    expect(result).toEqual({ version: 1 });
  });

  it("converts legacy BuilderPage snapshot to artifact format", async () => {
    mockPublishStatusFindUnique.mockResolvedValue({ liveVersion: null });
    mockWebsiteFindUnique.mockResolvedValue({ themePackageId: "neon-dark", themeColors: { primary: "#000" }, themeFonts: { heading: "Inter" } });

    const legacySnapshot = {
      themePackageId: "neon-dark",
      themeColors: { primary: "#000" },
      themeFonts: { heading: "Inter" },
      pages: [{
        id: "bp1", name: "Home", slug: "/", order: 0, isHome: true, theme: "", metadata: {},
        sections: [{ id: "sec1", name: "hero", order: 0, visible: true, locked: false, metadata: {}, slots: [{ id: "sl1", moduleId: "hero.default", parentId: null, order: 0, visible: true, locked: false, config: { title: "Hello" }, metadata: {} }] }],
      }],
    };

    await service.publish("w-1", legacySnapshot);

    expect(mockPublishSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          snapshot: expect.objectContaining({
            sections: expect.arrayContaining([
              expect.objectContaining({ type: "hero" }),
            ]),
          }),
        }),
      }),
    );
  });
});

describe("PublishSnapshotService.publishFromArtifact", () => {
  it("delegates to publish method", async () => {
    const spy = vi.spyOn(service, "publish");
    spy.mockResolvedValue({ version: 1 });

    await service.publishFromArtifact("w-2", artifactSnapshot);

    expect(spy).toHaveBeenCalledWith("w-2", artifactSnapshot);
  });

  it("returns version from publish", async () => {
    vi.spyOn(service, "publish").mockResolvedValue({ version: 5 });

    const result = await service.publishFromArtifact("w-2", artifactSnapshot);

    expect(result).toEqual({ version: 5 });
  });
});

describe("PublishSnapshotService.getLive", () => {
  it("returns snapshot data when PublishStatus has liveVersion", async () => {
    mockPublishStatusFindUnique.mockResolvedValue({ liveVersion: 2 });
    mockPublishSnapshotFindUnique.mockResolvedValue({ version: 2, state: "live", snapshot: artifactSnapshot, websiteId: "w-1", id: "snap-1", createdAt: new Date() });

    const result = await service.getLive("w-1");

    expect(result).toEqual({ version: 2, data: artifactSnapshot });
    expect(mockPublishStatusFindUnique).toHaveBeenCalledWith({ where: { websiteId: "w-1" } });
    expect(mockPublishSnapshotFindUnique).toHaveBeenCalledWith({
      where: { websiteId_version: { websiteId: "w-1", version: 2 } },
    });
  });

  it("returns null when no PublishStatus exists", async () => {
    mockPublishStatusFindUnique.mockResolvedValue(null);

    const result = await service.getLive("w-unknown");

    expect(result).toBeNull();
  });

  it("returns null when liveVersion is null", async () => {
    mockPublishStatusFindUnique.mockResolvedValue({ liveVersion: null });

    const result = await service.getLive("w-1");

    expect(result).toBeNull();
  });

  it("returns null when snapshot not found for live version", async () => {
    mockPublishStatusFindUnique.mockResolvedValue({ liveVersion: 99 });
    mockPublishSnapshotFindUnique.mockResolvedValue(null);

    const result = await service.getLive("w-1");

    expect(result).toBeNull();
  });

  it("handles database error gracefully", async () => {
    mockPublishStatusFindUnique.mockRejectedValue(new Error("DB down"));

    const result = await service.getLive("w-1");

    expect(result).toBeNull();
  });
});

describe("PublishSnapshotService.get", () => {
  it("returns snapshot data for specific version", async () => {
    mockPublishSnapshotFindUnique.mockResolvedValue({ version: 1, snapshot: artifactSnapshot, websiteId: "w-1", id: "snap-1", state: "live", createdAt: new Date() });

    const result = await service.get("w-1", 1);

    expect(result).toEqual(artifactSnapshot);
    expect(mockPublishSnapshotFindUnique).toHaveBeenCalledWith({
      where: { websiteId_version: { websiteId: "w-1", version: 1 } },
    });
  });

  it("returns null for non-existent version", async () => {
    mockPublishSnapshotFindUnique.mockResolvedValue(null);

    const result = await service.get("w-1", 999);

    expect(result).toBeNull();
  });
});

describe("PublishSnapshotService.preview", () => {
  it("creates preview snapshot with state 'preview'", async () => {
    mockPublishSnapshotFindFirst.mockResolvedValue(null);
    mockPublishSnapshotCreate.mockResolvedValue({ id: "preview-1", version: 1 });

    await service.preview("w-1", artifactSnapshot);

    expect(mockPublishSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state: "preview", version: 1 }),
      }),
    );
  });

  it("increments version from previous preview", async () => {
    mockPublishSnapshotFindFirst.mockResolvedValue({ version: 2 });

    await service.preview("w-1", artifactSnapshot);

    expect(mockPublishSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 3 }),
      }),
    );
  });

  it("upserts PublishStatus with preview state", async () => {
    mockPublishSnapshotFindFirst.mockResolvedValue(null);

    await service.preview("w-1", artifactSnapshot);

    expect(mockPublishStatusUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { websiteId: "w-1" },
        create: expect.objectContaining({ state: "preview" }),
        update: expect.objectContaining({ state: "preview" }),
      }),
    );
  });
});

describe("PublishSnapshotService.rollback", () => {
  it("returns pages from legacy snapshot", async () => {
    const legacySnapshot = {
      themePackageId: "dark",
      pages: [{ id: "bp1", name: "Home", slug: "/", order: 0, isHome: true, theme: "", metadata: {}, sections: [] }],
    };
    mockPublishSnapshotFindUnique.mockResolvedValue({ version: 1, snapshot: legacySnapshot });

    const result = await service.rollback("w-1", 1);

    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].name).toBe("Home");
  });

  it("converts artifact sections to pages", async () => {
    mockPublishSnapshotFindUnique.mockResolvedValue({ version: 1, snapshot: artifactSnapshot });

    const result = await service.rollback("w-1", 1);

    expect(result.pages.length).toBeGreaterThan(0);
    expect(result.pages[0].slug).toBe("/");
  });

  it("throws when snapshot version not found", async () => {
    mockPublishSnapshotFindUnique.mockResolvedValue(null);

    await expect(service.rollback("w-1", 999)).rejects.toThrow("Snapshot version 999 not found");
  });
});

describe("PublishSnapshotService.list", () => {
  it("returns snapshots ordered by version descending", async () => {
    mockPublishSnapshotFindMany.mockResolvedValue([
      { version: 2, state: "live", createdAt: new Date() },
      { version: 1, state: "preview", createdAt: new Date() },
    ]);

    const result = await service.list("w-1");

    expect(result).toHaveLength(2);
    expect(result[0].version).toBe(2);
    expect(mockPublishSnapshotFindMany).toHaveBeenCalledWith({
      where: { websiteId: "w-1" },
      select: { version: true, state: true, createdAt: true },
      orderBy: { version: "desc" },
      take: 50,
    });
  });
});
