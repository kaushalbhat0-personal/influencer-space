import type { ProductStatus } from "./constants";

export interface ProductImageItem {
  url: string;
  alt: string;
  order: number;
}

export interface ProductData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  images: unknown;
  slug: string | null;
  status: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface FetchProductsParams {
  tenantId: string;
  search?: string;
  status?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface FetchProductsResult {
  products: ProductData[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  images: string;
  status: ProductStatus;
  isFeatured: boolean;
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface BulkActionResult {
  success: boolean;
  count?: number;
  error?: string;
}
