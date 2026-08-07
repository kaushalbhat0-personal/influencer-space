import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockProductFindMany, mockProductCreate, mockProductUpdate, mockProductDelete, mockProductFindUnique, mockProductFindFirst } = vi.hoisted(() => ({
  mockProductFindMany: vi.fn(),
  mockProductCreate: vi.fn(),
  mockProductUpdate: vi.fn(),
  mockProductDelete: vi.fn(),
  mockProductFindUnique: vi.fn(),
  mockProductFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: mockProductFindMany,
      create: mockProductCreate,
      update: mockProductUpdate,
      delete: mockProductDelete,
      findUnique: mockProductFindUnique,
      findFirst: mockProductFindFirst,
    },
  },
}));

import { productService } from "../service";
import { productFormSchema } from "../validators";

beforeEach(() => { vi.clearAllMocks(); });

describe("Product validators", () => {
  it("accepts valid product", () => {
    const result = productFormSchema.safeParse({ name: "Test Product", price: 100, type: "digital" });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = productFormSchema.safeParse({ price: 100, type: "digital" });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = productFormSchema.safeParse({ name: "Test", price: -1, type: "digital" });
    expect(result.success).toBe(false);
  });

  it("accepts all product types", () => {
    for (const type of ["digital", "physical", "service", "membership", "bundle"] as const) {
      const result = productFormSchema.safeParse({ name: "Test", price: 0, type });
      expect(result.success).toBe(true);
    }
  });
});

describe("Product service", () => {
  it("list returns mapped products", async () => {
    mockProductFindMany.mockResolvedValue([
      { id: "1", name: "P1", price: 100, status: "PUBLISHED", isActive: true, images: [], order: 0, tenantId: "t1", description: null, imageUrl: null, slug: "p1", isFeatured: false, seoTitle: null, seoDescription: null, createdAt: new Date(), updatedAt: new Date() },
    ]);
    const result = await productService.list("t1");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("P1");
  });

  it("create returns mapped product", async () => {
    mockProductCreate.mockResolvedValue({ id: "1", name: "New", price: 50, status: "DRAFT", isActive: true, images: [], order: 0, tenantId: "t1", description: null, imageUrl: null, slug: "new", isFeatured: false, seoTitle: null, seoDescription: null, createdAt: new Date(), updatedAt: new Date() });
    const result = await productService.create("t1", { name: "New", price: 50, type: "digital" });
    expect(result.name).toBe("New");
    expect(result.price).toBe(50);
  });

  it("delete calls prisma delete (scoped to tenant)", async () => {
    mockProductFindFirst.mockResolvedValue({ id: "1" });
    mockProductDelete.mockResolvedValue({});
    await productService.delete("1", "t1");
    expect(mockProductFindFirst).toHaveBeenCalledWith({ where: { id: "1", tenantId: "t1" }, select: { id: true } });
    expect(mockProductDelete).toHaveBeenCalledWith({ where: { id: "1" } });
  });

  it("returns empty list when no products", async () => {
    mockProductFindMany.mockResolvedValue([]);
    const result = await productService.list("t1");
    expect(result).toHaveLength(0);
  });
});
