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
  it("returns empty pages when no canonical data exists", async () => {
    mockPublishSnapshotFindUnique.mockResolvedValue({
      snapshot: { someField: "value" },
    });
    const result = await service.rollback("w-1", 1);
    expect(result.pages).toEqual([]);
  });
});
