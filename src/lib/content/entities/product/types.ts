import type { BaseEntity } from "../../framework/types";

export type ProductStatus = "draft" | "published" | "archived" | "deleted";
export type ProductVisibility = "public" | "private" | "unlisted";

export interface ProductVariant { id: string; label: string; price: number; salePrice?: number; inventory: number; sku: string; }
export interface ProductSEO { title: string; description: string; keywords: string[]; ogImage?: string; }

export interface Product extends BaseEntity {
  title: string;
  description: string;
  shortDescription: string;
  visibility: ProductVisibility;
  sku: string;
  price: number;
  currency: string;
  salePrice?: number;
  inventory: number;
  categories: string[];
  tags: string[];
  images: string[];
  thumbnail?: string;
  variants: ProductVariant[];
  seo: ProductSEO;
}

export interface CreateProductInput { tenantId: string; slug: string; title: string; description?: string; price: number; currency?: string; categories?: string[]; tags?: string[]; images?: string[]; thumbnail?: string; }
export interface UpdateProductInput { title?: string; description?: string; price?: number; salePrice?: number; inventory?: number; status?: ProductStatus; visibility?: ProductVisibility; categories?: string[]; tags?: string[]; images?: string[]; thumbnail?: string; }

export interface ProductQuery { tenantId?: string; status?: ProductStatus; category?: string; tag?: string; search?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number; sortBy?: string; sortOrder?: "asc" | "desc"; }

export interface ProductDiagnostics { total: number; draft: number; published: number; archived: number; lowInventory: string[]; duplicateSlugs: string[]; validationErrors: string[]; commandCount: number; queryCount: number; }

export type ProductEventName = "product:created" | "product:updated" | "product:deleted" | "product:published" | "product:archived" | "product:inventoryChanged" | "product:priceChanged" | "product:duplicated";

export type { IBaseRepository as IProductRepository } from "../../framework/types";
