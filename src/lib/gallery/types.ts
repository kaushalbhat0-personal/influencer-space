export interface GalleryItemData {
  id: string;
  url: string;
  caption: string | null;
  altText: string | null;
  isVideo: boolean;
  status: string;
  isFeatured: boolean;
  isActive: boolean;
  category: string | null;
  tags: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  order: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FetchGalleryParams {
  tenantId: string;
  search?: string;
  status?: string;
  mediaType?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface FetchGalleryResult {
  items: GalleryItemData[];
  total: number;
  page: number;
  totalPages: number;
}
