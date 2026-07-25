import type { PageType, RuleCategory, ScoreCategory } from "./constants";

export interface SEOGlobalSettings {
  siteTitle: string;
  brandName: string;
  metaDescription: string;
  defaultKeywords: string;
  canonicalDomain: string;
  defaultOGImage: string;
  defaultTwitterImage: string;
  favicon: string;
  themeColor: string;
  robotsIndex: boolean;
  sitemapEnabled: boolean;
  language: string;
  locale: string;
}

export interface PageSEOSettings {
  id: string;
  pageType: PageType;
  seoTitle: string;
  metaDescription: string;
  slug: string;
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  robotsNoIndex: boolean;
  robotsNoFollow: boolean;
  updatedAt: string;
}

export interface SEOScore {
  overall: number;
  metadata: number;
  openGraph: number;
  twitter: number;
  structuredData: number;
  technical: number;
  checks: SEOCheck[];
  explanations?: ScoreExplanation[];
}

export interface ScoreExplanation {
  category: ScoreCategory;
  label: string;
  weight: number;
  score: number;
  maxScore: number;
  details: string;
}

export interface SEOCheck {
  id: string;
  label: string;
  passed: boolean;
  score: number;
  severity: "info" | "warning" | "error";
  recommendation: string;
  cta?: { label: string; href: string };
}

export interface SEOValidationResult {
  field: string;
  value: string;
  rule: string;
  passed: boolean;
  severity: "info" | "warning" | "error";
  message: string;
  recommendation: string;
}

export interface StructuredData {
  type: string;
  jsonLd: Record<string, unknown>;
  valid: boolean;
  errors: string[];
}

export interface MetadataPreview {
  googleTitle: string;
  googleDescription: string;
  browserTitle: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

export interface ValidationRuleConfig {
  id: string;
  label: string;
  category: RuleCategory;
  priority: number;
  enabled: boolean;
  field: string;
  validate(value: string, context?: Record<string, unknown>): SEOValidationResult;
}

export interface SchemaConfig {
  type: string;
  version: string;
  enabled: boolean;
  condition?: (params: Record<string, unknown>) => boolean;
  build(params: Record<string, unknown>): Record<string, unknown>;
}

export interface MetadataGenerator {
  pageType: PageType | string;
  generate(settings: PageSEOSettings, global: SEOGlobalSettings): MetadataPreview;
}

export interface PreviewProvider {
  type: string;
  label: string;
  renderId: string;
}

export interface HreflangConfig {
  href: string;
  hreflang: string;
}

export interface AlternateLocale {
  locale: string;
  url: string;
  title?: string;
  description?: string;
}

export interface TranslatedMetadata {
  locale: string;
  seoTitle: string;
  metaDescription: string;
  slug: string;
  ogTitle: string;
  ogDescription: string;
}

export interface MetadataCacheEntry<T = MetadataPreview> {
  key: string;
  value: T;
  pageType: string;
  createdAt: number;
  ttl: number;
}

export interface MetadataCacheConfig {
  defaultTTL: number;
  maxEntries: number;
}

export interface ScoreWeightConfig {
  category: ScoreCategory;
  weight: number;
  rules: string[];
}

export interface ErrorFallback {
  message: string;
  icon?: string;
  action?: { label: string; onClick: () => void };
}
