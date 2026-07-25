export const PRODUCT_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

export const STATUS_CONFIG: Record<ProductStatus, { label: string; dot: string; text: string }> = {
  PUBLISHED: { label: "Published", dot: "bg-green-500", text: "text-green-400" },
  DRAFT: { label: "Draft", dot: "bg-zinc-500", text: "text-zinc-400" },
  ARCHIVED: { label: "Archived", dot: "bg-amber-500", text: "text-amber-400" },
};

export const SORT_OPTIONS = [
  { value: "order", label: "Default" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
] as const;

export const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export const PRODUCT_LIMIT_DEFAULT = 24;
export const PRODUCT_NAME_MAX = 200;
export const PRODUCT_DESC_MAX = 5000;
export const SEO_TITLE_MAX = 200;
export const SEO_DESC_MAX = 500;
export const SLUG_MAX = 200;

export const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "Published",
  DRAFT: "Draft",
  ARCHIVED: "Archived",
};
