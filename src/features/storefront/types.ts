export interface StorefrontSlot {
  id: string;
  moduleId: string;
  config: Record<string, unknown>;
  sectionOrder?: number;
}

export interface StorefrontPage {
  id: string;
  slug: string;
  isHome: boolean;
  slots: StorefrontSlot[];
  seo: {
    title: string;
    description: string;
    ogImage?: string | null;
  };
}

export interface StorefrontTheme {
  primary: string;
  secondary: string;
  accent: string;
  mode: "dark" | "light";
  fonts: Record<string, string>;
}

export interface StorefrontData {
  tenantId: string;
  pages: StorefrontPage[];
  theme: StorefrontTheme;
  navigation: Array<{ id: string; label: string; href: string }>;
}

export interface PreviewToken {
  token: string;
  tenantId: string;
  version: number | null;
  expiresAt: Date;
}

export interface VersionEntry {
  version: number;
  publishedAt: string;
  state: "live" | "preview" | "archived";
  label: string;
}

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttl: number;
}

export interface AnalyticsEvent {
  type: "page_view" | "cta_click" | "product_click" | "link_click" | "scroll_depth" | "conversion";
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string | null;
  ogType?: string;
  twitterCard?: "summary" | "summary_large_image";
  jsonLd?: Record<string, unknown>[];
  noIndex?: boolean;
}
