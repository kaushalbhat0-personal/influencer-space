import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLinkFindMany, mockLinkCreate, mockLinkUpdate, mockLinkDelete } = vi.hoisted(() => ({
  mockLinkFindMany: vi.fn(),
  mockLinkCreate: vi.fn(),
  mockLinkUpdate: vi.fn(),
  mockLinkDelete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    affiliateLink: {
      findMany: mockLinkFindMany,
      create: mockLinkCreate,
      update: mockLinkUpdate,
      delete: mockLinkDelete,
    },
  },
}));

import { linkService } from "../service";

beforeEach(() => { vi.clearAllMocks(); });

describe("Link service", () => {
  it("list returns links", async () => {
    mockLinkFindMany.mockResolvedValue([
      { id: "1", title: "My Link", url: "https://example.com", imageUrl: null, order: 0, clicks: 5, isActive: true, createdAt: new Date(), updatedAt: new Date(), tenantId: "t1" },
    ]);
    const result = await linkService.list("t1");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("My Link");
  });

  it("create creates link", async () => {
    mockLinkCreate.mockResolvedValue({ id: "1", title: "New", url: "https://example.com", imageUrl: null, order: 0, clicks: 0, isActive: true, createdAt: new Date(), updatedAt: new Date(), tenantId: "t1" });
    const result = await linkService.create("t1", { title: "New", url: "https://example.com" });
    expect(result.title).toBe("New");
    expect(result.url).toBe("https://example.com");
  });

  it("update updates link", async () => {
    mockLinkUpdate.mockResolvedValue({ id: "1", title: "Updated", url: "https://example.com", imageUrl: null, order: 0, clicks: 0, isActive: false, createdAt: new Date(), updatedAt: new Date(), tenantId: "t1" });
    const result = await linkService.update("1", { isActive: false });
    expect(result.isActive).toBe(false);
  });

  it("delete removes link", async () => {
    mockLinkDelete.mockResolvedValue({});
    await linkService.delete("1");
    expect(mockLinkDelete).toHaveBeenCalledWith({ where: { id: "1" } });
  });

  it("list returns empty when no links", async () => {
    mockLinkFindMany.mockResolvedValue([]);
    const result = await linkService.list("t1");
    expect(result).toHaveLength(0);
  });
});
