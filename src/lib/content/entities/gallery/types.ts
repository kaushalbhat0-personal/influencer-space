import type { BaseEntity } from "../../framework/types";

export type GalleryStatus = "draft" | "published" | "archived" | "deleted";
export type GalleryVisibility = "public" | "private" | "unlisted";
export type GalleryDisplayMode = "grid" | "masonry" | "carousel" | "slideshow" | "list";
export type GalleryMediaType = "image" | "video";

export interface GalleryMedia {
  id: string;
  type: GalleryMediaType;
  url: string;
  thumbnail?: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  size?: number;
  mimeType?: string;
  duration?: number;
  sortOrder: number;
  visibility: "public" | "private";
  metadata: Record<string, unknown>;
}

export interface GallerySEO {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
}

export interface Gallery extends BaseEntity {
  title: string;
  description: string;
  ownerId: string;
  visibility: GalleryVisibility;
  coverImage?: string;
  media: GalleryMedia[];
  displayMode: GalleryDisplayMode;
  sortOrder: number;
  categories: string[];
  tags: string[];
  seo: GallerySEO;
}

export interface CreateGalleryInput {
  tenantId: string;
  ownerId: string;
  slug: string;
  title: string;
  description?: string;
  visibility?: GalleryVisibility;
  displayMode?: GalleryDisplayMode;
  sortOrder?: number;
  categories?: string[];
  tags?: string[];
  coverImage?: string;
}

export interface UpdateGalleryInput {
  title?: string;
  description?: string;
  visibility?: GalleryVisibility;
  displayMode?: GalleryDisplayMode;
  sortOrder?: number;
  categories?: string[];
  tags?: string[];
  coverImage?: string;
  status?: GalleryStatus;
}

export interface GalleryQuery {
  tenantId?: string;
  ownerId?: string;
  status?: GalleryStatus;
  displayMode?: GalleryDisplayMode;
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface GalleryDiagnostics {
  total: number;
  draft: number;
  published: number;
  archived: number;
  totalMedia: number;
  averageMediaPerGallery: number;
  missingAltText: string[];
  duplicateMedia: string[];
  validationErrors: string[];
}

export type GalleryEventName =
  | "gallery:created"
  | "gallery:updated"
  | "gallery:deleted"
  | "gallery:published"
  | "gallery:archived"
  | "gallery:mediaAdded"
  | "gallery:mediaRemoved"
  | "gallery:mediaReordered"
  | "gallery:coverChanged";

export type { IBaseRepository as IGalleryRepository } from "../../framework/types";
