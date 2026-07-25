import type { SEOGlobalSettings, PageSEOSettings } from "./types";

export function mapGlobalSettingsToForm(settings: Partial<SEOGlobalSettings>): SEOGlobalSettings {
  return {
    siteTitle: settings.siteTitle ?? "",
    brandName: settings.brandName ?? "",
    metaDescription: settings.metaDescription ?? "",
    defaultKeywords: settings.defaultKeywords ?? "",
    canonicalDomain: settings.canonicalDomain ?? "",
    defaultOGImage: settings.defaultOGImage ?? "",
    defaultTwitterImage: settings.defaultTwitterImage ?? "",
    favicon: settings.favicon ?? "",
    themeColor: settings.themeColor ?? "#000000",
    robotsIndex: settings.robotsIndex ?? true,
    sitemapEnabled: settings.sitemapEnabled ?? true,
    language: settings.language ?? "en",
    locale: settings.locale ?? "en_US",
  };
}

export function mapPageSettingsToForm(settings: Partial<PageSEOSettings>): PageSEOSettings {
  return {
    id: settings.id ?? "",
    pageType: settings.pageType ?? "products",
    seoTitle: settings.seoTitle ?? "",
    metaDescription: settings.metaDescription ?? "",
    slug: settings.slug ?? "",
    canonicalUrl: settings.canonicalUrl ?? "",
    ogTitle: settings.ogTitle ?? "",
    ogDescription: settings.ogDescription ?? "",
    ogImage: settings.ogImage ?? "",
    twitterTitle: settings.twitterTitle ?? "",
    twitterDescription: settings.twitterDescription ?? "",
    twitterImage: settings.twitterImage ?? "",
    robotsNoIndex: settings.robotsNoIndex ?? false,
    robotsNoFollow: settings.robotsNoFollow ?? false,
    updatedAt: settings.updatedAt ?? new Date().toISOString(),
  };
}
