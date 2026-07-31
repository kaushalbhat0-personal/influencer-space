import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockPublishStatusFindUnique,
  mockPublishSnapshotFindUnique,
  mockPublishSnapshotFindFirst,
  mockPublishSnapshotFindMany,
  mockWebsiteFindUnique,
} = vi.hoisted(() => ({
  mockPublishStatusFindUnique: vi.fn(),
  mockPublishSnapshotFindUnique: vi.fn(),
  mockPublishSnapshotFindFirst: vi.fn(),
  mockPublishSnapshotFindMany: vi.fn(),
  mockWebsiteFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    publishStatus: { findUnique: mockPublishStatusFindUnique },
    publishSnapshot: { findUnique: mockPublishSnapshotFindUnique, findFirst: mockPublishSnapshotFindFirst, findMany: mockPublishSnapshotFindMany },
    website: { findUnique: mockWebsiteFindUnique },
  },
}));

import { PublishSnapshotService } from "@/lib/publishing/snapshot";

const service = new PublishSnapshotService();

beforeEach(() => {
  vi.clearAllMocks();
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
  it("throws when the snapshot has no layout pages", async () => {
    mockPublishSnapshotFindUnique.mockResolvedValue({
      snapshot: { someField: "value" },
    });
    await expect(service.rollback("w-1", 1)).rejects.toThrow("no layout pages");
  });

  it("restores builder pages from a canonical snapshot", async () => {
    mockPublishSnapshotFindUnique.mockResolvedValue({
      snapshot: {
        layout: {
          pages: [
            {
              id: "p1", name: "Home", slug: "/", isHome: true, order: 0,
              sections: [
                { id: "s1", moduleId: "hero.default", config: { title: "Hi" }, order: 0, visible: true },
              ],
            },
          ],
        },
      },
    });
    const result = await service.rollback("w-1", 1);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].slug).toBe("/");
    expect(result.pages[0].sections[0].slots[0].moduleId).toBe("hero.default");
  });

  it("restores from legacy canonical.layout shape", async () => {
    mockPublishSnapshotFindUnique.mockResolvedValue({
      snapshot: {
        canonical: {
          layout: {
            pages: [
              { id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: [] },
            ],
          },
        },
      },
    });
    const result = await service.rollback("w-1", 1);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].name).toBe("Home");
  });
});
