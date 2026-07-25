import type { GalleryItemData } from "./types";
import type { GalleryItem } from "@/components/public/GallerySection";

export function toStorefrontItem(item: GalleryItemData): GalleryItem {
  return {
    id: item.id,
    url: item.url,
    caption: item.caption,
    isVideo: item.isVideo,
  };
}

export function toStorefrontList(items: GalleryItemData[]): GalleryItem[] {
  return items.map(toStorefrontItem);
}
