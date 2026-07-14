import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockFindFirst,
  mockFindMany,
  mockCreate,
  mockUpdate,
  mockDelete,
} = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

import { ProductService } from "@/services/product.service";

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const PRODUCT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProductService", () => {
  describe("create", () => {
    it("sets tenantId on the created record", async () => {
      mockCreate.mockResolvedValueOnce({
        id: PRODUCT_ID,
        tenantId: TENANT_A,
        name: "Test",
        description: null,
        price: 10,
        imageUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await ProductService.create(TENANT_A, { name: "Test", price: 10 });

      expect(mockCreate).toHaveBeenCalledWith({
        data: { name: "Test", price: 10, tenantId: TENANT_A },
      });
    });
  });

  describe("findAll", () => {
    it("scopes query to the given tenantId", async () => {
      mockFindMany.mockResolvedValueOnce([]);

      await ProductService.findAll(TENANT_A);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_A },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("findById", () => {
    it("passes both id and tenantId to Prisma", async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      await ProductService.findById(PRODUCT_ID, TENANT_A);

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID, tenantId: TENANT_A },
      });
    });

    it("returns null when the product belongs to a different tenant", async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      const result = await ProductService.findById(PRODUCT_ID, TENANT_B);

      expect(result).toBeNull();
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID, tenantId: TENANT_B },
      });
    });

    it("returns the product when it belongs to the correct tenant", async () => {
      const product = {
        id: PRODUCT_ID,
        tenantId: TENANT_A,
        name: "Only Tenant A",
        description: null,
        price: 99,
        imageUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockFindFirst.mockResolvedValueOnce(product);

      const result = await ProductService.findById(PRODUCT_ID, TENANT_A);

      expect(result).toEqual(product);
    });
  });

  describe("update", () => {
    it("throws when findFirst returns null (cross-tenant or missing)", async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      await expect(
        ProductService.update(PRODUCT_ID, TENANT_B, { name: "Hacked" }),
      ).rejects.toThrow("Product not found");

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("updates after ownership verification passes", async () => {
      const existing = {
        id: PRODUCT_ID,
        tenantId: TENANT_A,
        name: "Old",
        description: null,
        price: 10,
        imageUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = { ...existing, name: "New" };
      mockFindFirst.mockResolvedValueOnce(existing);
      mockUpdate.mockResolvedValueOnce(updated);

      const result = await ProductService.update(PRODUCT_ID, TENANT_A, {
        name: "New",
      });

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID, tenantId: TENANT_A },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID },
        data: { name: "New" },
      });
      expect(result.name).toBe("New");
    });
  });

  describe("delete", () => {
    it("throws when findFirst returns null (cross-tenant)", async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      await expect(
        ProductService.delete(PRODUCT_ID, TENANT_B),
      ).rejects.toThrow("Product not found");

      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("deletes after ownership verification passes", async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: PRODUCT_ID,
        tenantId: TENANT_A,
      });
      mockDelete.mockResolvedValueOnce(undefined);

      await ProductService.delete(PRODUCT_ID, TENANT_A);

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID, tenantId: TENANT_A },
      });
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID },
      });
    });
  });
});
