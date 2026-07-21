import type { Product, CreateProductInput, ProductDiagnostics } from "./types";
import type { IBaseRepository } from "../../framework/types";
import { productRepository } from "./repository";
import { BaseApplicationService } from "../../framework/base";
import type { LifecycleHooks } from "../../framework/types";
import { contentEvents } from "../../engine";

export class ProductApplicationService extends BaseApplicationService<Product> {
  constructor(repoOverride?: IBaseRepository<Product>) {
    const repo = repoOverride ?? productRepository;
    const lifecycle: LifecycleHooks<Product> = {
      validate: (entity: Product): string[] => {
        const errors: string[] = [];
        if (entity.price < 0) errors.push("Price must be >= 0");
        if (entity.salePrice !== undefined && entity.salePrice > entity.price) errors.push("Sale price must be <= price");
        if (!entity.title) errors.push("Title is required");
        return errors;
      },
      beforeUpdate: async (id: string, data: Partial<Product>): Promise<void> => {
        const existing = await repo.findById(id);
        if (!existing) throw new Error("Product not found");
        const merged = { ...existing, ...data };
        if (merged.price < 0) throw new Error("Price must be >= 0");
        if (merged.salePrice !== undefined && merged.price !== undefined && merged.salePrice > merged.price)
          throw new Error("Sale price must be <= price");
      },
      afterCreate: (entity) => {
        contentEvents.emit("product:created", { productId: entity.id, tenantId: entity.tenantId, title: entity.title });
      },
      afterUpdate: (entity) => {
        contentEvents.emit("product:updated", { productId: entity.id });
      },
      afterDelete: (id) => {
        contentEvents.emit("product:deleted", { productId: id });
      },
    };
    super(repo, lifecycle);
  }

  async create(input: CreateProductInput): Promise<Product> {
    const existing = await this.repo.findBySlug(input.tenantId, input.slug);
    if (existing) throw new Error(`Slug "${input.slug}" is already taken`);

    const product: Product = {
      id: "", tenantId: input.tenantId, slug: input.slug, title: input.title,
      description: input.description ?? "", shortDescription: "", status: "draft",
      visibility: "public", sku: `SKU-${Date.now()}`, price: input.price, currency: input.currency ?? "INR",
      inventory: 0, categories: input.categories ?? [], tags: input.tags ?? [],
      images: input.images ?? [], thumbnail: input.thumbnail, variants: [], seo: { title: input.title, description: input.description ?? "", keywords: [] },
      metadata: {}, version: 1, createdAt: "", updatedAt: "",
    };

    const errors = this.lifecycle.validate?.(product) ?? [];
    if (errors.length > 0) throw new Error(errors.join(", "));

    return super.create(product);
  }

  async publish(id: string): Promise<Product | null> {
    const result = await this.repo.update(id, { status: "published" } as Partial<Product>);
    if (result) contentEvents.emit("product:published", { productId: id });
    return result;
  }

  async archive(id: string): Promise<Product | null> {
    const result = await this.repo.update(id, { status: "archived" } as Partial<Product>);
    if (result) contentEvents.emit("product:archived", { productId: id });
    return result;
  }

  async search(tenantId: string, term: string): Promise<Product[]> {
    return this.repo.query({ tenantId, search: term });
  }

  async getDetailedDiagnostics(): Promise<ProductDiagnostics> {
    const all = await this.repo.query({});
    const base = await this.diagnostics();
    return { ...base, lowInventory: all.filter((p) => p.inventory < 5).map((p) => p.id), duplicateSlugs: [], validationErrors: [], commandCount: 0, queryCount: 0 };
  }
}

export const productService = new ProductApplicationService();
