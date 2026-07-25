export const SEO_TITLE_MIN = 30;
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MIN = 50;
export const SEO_DESCRIPTION_MAX = 160;
export const OG_TITLE_MAX = 60;
export const OG_DESCRIPTION_MAX = 200;
export const TWITTER_TITLE_MAX = 70;
export const TWITTER_DESCRIPTION_MAX = 200;
export const SLUG_MAX = 100;

export const SEO_SCORE_MAX = 100;
export const SEO_SCORE_GOOD = 80;
export const SEO_SCORE_FAIR = 50;

export const PAGE_TYPES = ["home", "products", "gallery", "milestones", "links"] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const FUTURE_PAGE_TYPES = ["blog", "events", "courses", "reviews"] as const;

export const SITEMAP_DEFAULT_FREQUENCY = "weekly";
export const SITEMAP_DEFAULT_PRIORITY = "0.5";

export const STRUCTURED_DATA_TYPES = [
  "Organization", "Website", "Product", "ImageGallery",
  "Breadcrumb", "FAQ", "Person",
] as const;

export const FUTURE_SCHEMA_TYPES = [
  "Event", "Course", "VideoObject", "Article", "Review",
] as const;

export const SCORE_CATEGORIES = [
  "metadata", "openGraph", "twitter", "structuredData", "technical",
] as const;

export type ScoreCategory = (typeof SCORE_CATEGORIES)[number];

export const RULE_CATEGORIES = [
  "content", "social", "technical", "structured", "performance",
] as const;

export type RuleCategory = (typeof RULE_CATEGORIES)[number];

export const PREVIEW_PROVIDERS = [
  "googleSERP", "browserTab", "facebook", "linkedin", "xTwitter",
] as const;

export type PreviewProviderType = (typeof PREVIEW_PROVIDERS)[number];
