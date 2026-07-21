/**
 * Product DTOs v1.0.0
 *
 * UI-friendly data transfer objects for the Product domain.
 * Separate from platform persistence models (Product entity).
 */

export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  thumbnail: string | null;
  category: string;
  tags: string[];
  status: "draft" | "published" | "archived";
  visibility: "public" | "private" | "unlisted";
  inventory: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDTO {
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  categories?: string[];
  tags?: string[];
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  categories?: string[];
  tags?: string[];
  status?: "draft" | "published" | "archived";
  visibility?: "public" | "private" | "unlisted";
  inventory?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ProductQueryDTO {
  tenantId?: string;
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ProductStatsDTO {
  total: number;
  active: number;
  draft: number;
  published: number;
  archived: number;
}

export function mapPlatformToProductDTO(platform: {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  description: string;
  status: string;
  visibility: string;
  price: number;
  currency: string;
  inventory: number;
  categories: string[];
  tags: string[];
  images: string[];
  thumbnail?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}): ProductDTO {
  return {
    id: platform.id,
    name: platform.title,
    slug: platform.slug,
    description: platform.description,
    price: platform.price,
    currency: platform.currency,
    imageUrl: platform.images[0] ?? null,
    thumbnail: platform.thumbnail ?? null,
    category: platform.categories[0] ?? "",
    tags: platform.tags,
    status: platform.status as ProductDTO["status"],
    visibility: platform.visibility as ProductDTO["visibility"],
    inventory: platform.inventory,
    isActive: true,
    sortOrder: 0,
    createdAt: platform.createdAt,
    updatedAt: platform.updatedAt,
  };
}
