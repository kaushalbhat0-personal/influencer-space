import type { HreflangConfig, AlternateLocale, TranslatedMetadata } from "./types";

export interface SEOLocaleConfig {
  defaultLocale: string;
  supportedLocales: string[];
  localeMap: Record<string, string>;
}

export const DEFAULT_LOCALE_CONFIG: SEOLocaleConfig = {
  defaultLocale: "en",
  supportedLocales: ["en"],
  localeMap: { en: "en_US" },
};

export class SEOInternationalization {
  private config: SEOLocaleConfig;

  constructor(config: SEOLocaleConfig = DEFAULT_LOCALE_CONFIG) {
    this.config = config;
  }

  setConfig(config: SEOLocaleConfig): void {
    this.config = config;
  }

  getConfig(): SEOLocaleConfig {
    return { ...this.config };
  }

  getSupportedLocales(): string[] {
    return [...this.config.supportedLocales];
  }

  isLocaleSupported(locale: string): boolean {
    return this.config.supportedLocales.includes(locale);
  }

  buildHreflangTags(canonicalUrl: string, alternates: AlternateLocale[]): HreflangConfig[] {
    const tags: HreflangConfig[] = [];

    tags.push({ href: canonicalUrl, hreflang: this.config.defaultLocale });

    for (const alt of alternates) {
      if (this.isLocaleSupported(alt.locale)) {
        tags.push({ href: alt.url, hreflang: alt.locale });
      }
    }

    tags.push({ href: canonicalUrl, hreflang: "x-default" });

    return tags;
  }

  buildAlternateLocales(
    baseUrl: string,
    pageSlug: string,
    translations: TranslatedMetadata[],
  ): AlternateLocale[] {
    return translations.map((t) => ({
      locale: t.locale,
      url: `${baseUrl}/${t.locale}/${t.slug || pageSlug}`,
      title: t.seoTitle,
      description: t.metaDescription,
    }));
  }

  getRegionalCanonicalUrl(
    canonicalDomain: string,
    pageSlug: string,
    locale: string,
  ): string {
    if (locale === this.config.defaultLocale) {
      return `${canonicalDomain}/${pageSlug}`;
    }
    return `${canonicalDomain}/${locale}/${pageSlug}`;
  }

  getLocaleAwareSlug(slug: string, locale: string): string {
    return locale === this.config.defaultLocale ? slug : `${locale}/${slug}`;
  }
}

export const seoI18n = new SEOInternationalization();
