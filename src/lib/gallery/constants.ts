export const GALLERY_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export type GalleryStatus = (typeof GALLERY_STATUS)[keyof typeof GALLERY_STATUS];

export const GALLERY_STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  PUBLISHED: { label: "Published", dot: "bg-green-500", text: "text-green-400" },
  DRAFT: { label: "Draft", dot: "bg-zinc-500", text: "text-zinc-400" },
  ARCHIVED: { label: "Archived", dot: "bg-amber-500", text: "text-amber-400" },
};

export const GALLERY_SORT_OPTIONS = [
  { value: "order", label: "Default" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title_asc", label: "Title A-Z" },
  { value: "title_desc", label: "Title Z-A" },
] as const;

export const GALLERY_STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export const GALLERY_MEDIA_TYPE_FILTERS = [
  { value: "", label: "All Types" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
] as const;

export const GALLERY_LIMIT_DEFAULT = 24;
export const CAPTION_MAX = 1000;
export const ALT_TEXT_MAX = 500;
