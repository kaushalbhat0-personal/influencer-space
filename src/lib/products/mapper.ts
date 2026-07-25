import type { ProductData, ProductImageItem } from "./types";
import type { PublicProductData, PublicProductImage } from "@/services/public.service";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 200);
}

export function resolveSlug(name: string, existingSlug?: string | null): string {
  return existingSlug || slugify(name);
}

export function parseImages(raw: unknown): ProductImageItem[] {
  if (Array.isArray(raw)) return raw as ProductImageItem[];
  return [];
}

export function primaryImage(images: ProductImageItem[], fallbackUrl?: string | null): string | null {
  if (images.length > 0 && images[0].url) return images[0].url;
  return fallbackUrl ?? null;
}

export function toPublicProduct(product: ProductData): PublicProductData {
  const images = parseImages(product.images);
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: primaryImage(images, product.imageUrl),
    slug: product.slug,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    images: images.length > 0 ? images as PublicProductImage[] : null,
  };
}

export function toPublicProductList(products: ProductData[]): PublicProductData[] {
  return products.map(toPublicProduct);
}

export function duplicateName(name: string): string {
  return `${name} (Copy)`;
}

export function duplicateSlug(slug: string | null, name: string): string {
  return `${slug || slugify(name)}-copy`;
}
