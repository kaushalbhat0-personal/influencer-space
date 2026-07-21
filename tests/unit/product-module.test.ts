import { describe, it, expect, beforeEach } from "vitest";
import { ProductApplicationService } from "@/lib/content/entities/product/service";
import { InMemoryProductRepository } from "@/lib/content/entities/product/repository";
import type { CreateProductInput } from "@/lib/content/entities/product/types";

describe("ProductModule", () => {
  let service: ProductApplicationService;
  let repo: InMemoryProductRepository;

  beforeEach(() => { repo = new InMemoryProductRepository(); service = new ProductApplicationService(repo); });

  const input: CreateProductInput = { tenantId: "t1", slug: "test-product", title: "Test Product", price: 99 };

  describe("ProductApplicationService", () => {
    it("should create a product", async () => {
      const product = await service.create(input);
      expect(product.title).toBe("Test Product");
      expect(product.status).toBe("draft");
      expect(product.price).toBe(99);
    });

    it("should enforce unique slugs per tenant", async () => {
      await service.create(input);
      await expect(service.create(input)).rejects.toThrow("already taken");
    });

    it("should reject negative price", async () => {
      await expect(service.create({ ...input, price: -1 })).rejects.toThrow("must be >= 0");
    });

    it("should update a product", async () => {
      const product = await service.create(input);
      const updated = await service.update(product.id, { title: "Updated", price: 149 });
      expect(updated!.title).toBe("Updated");
      expect(updated!.price).toBe(149);
    });

    it("should reject sale price > price", async () => {
      const product = await service.create(input);
      await expect(service.update(product.id, { salePrice: 999 })).rejects.toThrow("<= price");
    });

    it("should publish a product", async () => {
      const product = await service.create(input);
      const published = await service.publish(product.id);
      expect(published!.status).toBe("published");
    });

    it("should archive a product", async () => {
      const product = await service.create(input);
      const archived = await service.archive(product.id);
      expect(archived!.status).toBe("archived");
    });

    it("should delete a product", async () => {
      const product = await service.create(input);
      const deleted = await service.delete(product.id);
      expect(deleted).toBe(true);
      expect(await service.findById(product.id)).toBeNull();
    });

    it("should query products", async () => {
      await service.create(input);
      await service.create({ ...input, slug: "product-2", title: "Second" });
      const results = await service.findByTenant("t1");
      expect(results.length).toBe(2);
    });

    it("should search products", async () => {
      await service.create(input);
      const results = await service.search("t1", "Test");
      expect(results.length).toBe(1);
    });

    it("should provide diagnostics", async () => {
      await service.create(input);
      const diag = await service.getDetailedDiagnostics();
      expect(diag.total).toBeGreaterThan(0);
      expect(diag.draft).toBeGreaterThan(0);
    });
  });
});
