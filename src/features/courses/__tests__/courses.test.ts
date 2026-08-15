import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOfferingFindMany, mockOfferingFindFirst, mockOfferingCreate } = vi.hoisted(() => ({
  mockOfferingFindMany: vi.fn(),
  mockOfferingFindFirst: vi.fn(),
  mockOfferingCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    offering: {
      findMany: mockOfferingFindMany,
      findFirst: mockOfferingFindFirst,
      create: mockOfferingCreate,
    },
  },
}));

import { courseService } from "../service";

beforeEach(() => { vi.clearAllMocks(); });

describe("Course service", () => {
  it("list returns courses", async () => {
    mockOfferingFindMany.mockResolvedValue([
      { id: "1", title: "Test Course", description: "Learn", status: "draft", createdAt: new Date() },
    ]);
    const result = await courseService.list("t1");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test Course");
  });

  it("getById returns null for missing course", async () => {
    mockOfferingFindFirst.mockResolvedValue(null);
    const result = await courseService.getById("t1", "nonexistent");
    expect(result).toBeNull();
  });

  it("getById returns course when found", async () => {
    mockOfferingFindFirst.mockResolvedValue({ id: "1", title: "Course", description: "Desc", status: "published", createdAt: new Date() });
    const result = await courseService.getById("t1", "1");
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Course");
    // RCCF-63.3 — the query must be tenant-scoped.
    expect(mockOfferingFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "1", tenantId: "t1", type: "course" } }));
  });

  it("create creates course offering", async () => {
    mockOfferingCreate.mockResolvedValue({ id: "1", title: "New Course", description: "Desc", price: 0, status: "draft", slug: "new-course", type: "course", currency: "INR", createdAt: new Date(), updatedAt: new Date(), metadata: {}, tenantId: "t1" });
    const result = await courseService.create("t1", { title: "New Course", description: "Desc", price: 0 });
    expect(result.title).toBe("New Course");
    expect(result.status).toBe("DRAFT");
  });

  it("list returns empty array when no courses", async () => {
    mockOfferingFindMany.mockResolvedValue([]);
    const result = await courseService.list("t1");
    expect(result).toHaveLength(0);
  });
});
