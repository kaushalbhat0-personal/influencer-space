import type { ProductImageItem } from "./types";

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

export function duplicateName(name: string): string {
  return `${name} (Copy)`;
}

export function duplicateSlug(slug: string | null, name: string): string {
  return `${slug || slugify(name)}-copy`;
}
