/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWebsiteFindUnique, mockPageFindMany } = vi.hoisted(() => ({
  mockWebsiteFindUnique: vi.fn(),
  mockPageFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    website: { findUnique: mockWebsiteFindUnique },
    page: { findMany: mockPageFindMany },
  },
}));

import { builderFeatureService } from "../service";

beforeEach(() => { vi.clearAllMocks(); });

describe("builderFeatureService.getPages", () => {
  it("returns empty when no website found", async () => {
    mockWebsiteFindUnique.mockResolvedValue(null);
    const result = await builderFeatureService.getPages("t1");
    expect(result).toEqual([]);
  });

  it("returns mapped pages with sections and slots", async () => {
    mockWebsiteFindUnique.mockResolvedValue({ id: "ws-1" });
    mockPageFindMany.mockResolvedValue([
      {
        id: "p1", name: "Home", slug: "home", order: 0, isHome: true, theme: "default",
        sections: [
          {
            id: "s1", name: "Hero", order: 0, visible: true, locked: false,
            blocks: [{ id: "b1", moduleId: "hero.default", parentId: null, order: 0, visible: true, locked: false, config: {}, metadata: {} }],
          },
        ],
      },
    ]);
    const pages = await builderFeatureService.getPages("t1");
    expect(pages).toHaveLength(1);
    expect(pages[0].name).toBe("Home");
    expect(pages[0].sections).toHaveLength(1);
    expect(pages[0].sections[0].slots).toHaveLength(1);
  });

  it("getTenantIdFromWebsite returns tenant id", async () => {
    mockWebsiteFindUnique.mockResolvedValue({ tenantId: "t1" });
    const id = await builderFeatureService.getTenantIdFromWebsite("ws-1");
    expect(id).toBe("t1");
  });

  it("getTenantIdFromWebsite returns null when no website", async () => {
    mockWebsiteFindUnique.mockResolvedValue(null);
    const id = await builderFeatureService.getTenantIdFromWebsite("ws-1");
    expect(id).toBeNull();
  });
});
