export interface GalleryItemData {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  mediaType: "image" | "video";
  videoUrl: string | null;
  altText: string | null;
  category: string;
  tags: string[];
  isFeatured: boolean;
  order: number;
  isActive: boolean;
  createdAt: Date;
}

export interface GalleryFormInput {
  title: string;
  description?: string;
  imageUrl: string;
  mediaType?: "image" | "video";
  videoUrl?: string;
  altText?: string;
  category?: string;
  tags?: string[];
  isFeatured?: boolean;
}
