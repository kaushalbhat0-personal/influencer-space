/**
 * Gallery DTOs v1.0.0
 *
 * UI-friendly data transfer objects for the Gallery domain.
 * Separate from platform persistence models (Gallery entity).
 */

export interface GalleryMediaDTO {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnail?: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  sortOrder: number;
}

export interface GalleryDTO {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage?: string;
  media: GalleryMediaDTO[];
  mediaCount: number;
  displayMode: "grid" | "masonry" | "carousel" | "slideshow" | "list";
  status: "draft" | "published" | "archived";
  visibility: "public" | "private" | "unlisted";
  categories: string[];
  tags: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGalleryDTO {
  tenantId: string;
  ownerId: string;
  slug: string;
  title: string;
  description?: string;
  visibility?: "public" | "private" | "unlisted";
  displayMode?: "grid" | "masonry" | "carousel" | "slideshow" | "list";
  categories?: string[];
  tags?: string[];
  coverImage?: string;
}

export interface UpdateGalleryDTO {
  title?: string;
  description?: string;
  visibility?: "public" | "private" | "unlisted";
  displayMode?: "grid" | "masonry" | "carousel" | "slideshow" | "list";
  categories?: string[];
  tags?: string[];
  coverImage?: string;
  status?: "draft" | "published" | "archived";
}

export interface GalleryQueryDTO {
  tenantId?: string;
  ownerId?: string;
  status?: string;
  displayMode?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function mapPlatformToGalleryDTO(platform: {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage?: string;
  media: Array<{
    id: string;
    type: string;
    url: string;
    thumbnail?: string;
    alt: string;
    caption?: string;
    width?: number;
    height?: number;
    sortOrder: number;
  }>;
  displayMode: string;
  status: string;
  visibility: string;
  categories: string[];
  tags: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}): GalleryDTO {
  return {
    id: platform.id,
    slug: platform.slug,
    title: platform.title,
    description: platform.description,
    coverImage: platform.coverImage,
    media: platform.media.map((m) => ({
      id: m.id,
      type: m.type as GalleryMediaDTO["type"],
      url: m.url,
      thumbnail: m.thumbnail,
      alt: m.alt,
      caption: m.caption,
      width: m.width,
      height: m.height,
      sortOrder: m.sortOrder,
    })),
    mediaCount: platform.media.length,
    displayMode: platform.displayMode as GalleryDTO["displayMode"],
    status: platform.status as GalleryDTO["status"],
    visibility: platform.visibility as GalleryDTO["visibility"],
    categories: platform.categories,
    tags: platform.tags,
    sortOrder: platform.sortOrder,
    createdAt: platform.createdAt,
    updatedAt: platform.updatedAt,
  };
}
