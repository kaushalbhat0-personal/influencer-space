import type { MetadataPreview, PageSEOSettings, SEOGlobalSettings } from "./types";
import { FUTURE_PAGE_TYPES } from "./constants";
import type { MetadataGenerator } from "./types";

interface GeneratorEntry {
  generator: MetadataGenerator;
  priority: number;
}

export class MetadataRegistry {
  private generators = new Map<string, GeneratorEntry>();

  register(generator: MetadataGenerator, priority = 10): void {
    this.generators.set(generator.pageType, { generator, priority });
  }

  unregister(pageType: string): boolean {
    return this.generators.delete(pageType);
  }

  get(pageType: string): MetadataGenerator | undefined {
    return this.generators.get(pageType)?.generator;
  }

  buildPreview(
    pageType: string,
    settings: PageSEOSettings,
    global: SEOGlobalSettings,
  ): MetadataPreview {
    const entry = this.generators.get(pageType);
    if (entry) {
      return entry.generator.generate(settings, global);
    }
    const fallback = this.generators.get("default")?.generator;
    if (fallback) {
      return fallback.generate(settings, global);
    }
    return this.buildFallbackPreview(settings, global);
  }

  private buildFallbackPreview(settings: PageSEOSettings, global: SEOGlobalSettings): MetadataPreview {
    const googleTitle = this.truncateGoogleTitle(settings.seoTitle || global.siteTitle, global.brandName);
    const browserTitle = settings.seoTitle ? `${settings.seoTitle} | ${global.brandName}` : global.brandName;
    return {
      googleTitle,
      googleDescription: settings.metaDescription || global.metaDescription,
      browserTitle,
      ogTitle: settings.ogTitle || settings.seoTitle || global.siteTitle,
      ogDescription: settings.ogDescription || settings.metaDescription || global.metaDescription,
      ogImage: settings.ogImage || global.defaultOGImage,
      twitterTitle: settings.twitterTitle || settings.seoTitle || global.siteTitle,
      twitterDescription: settings.twitterDescription || settings.metaDescription || global.metaDescription,
      twitterImage: settings.twitterImage || global.defaultTwitterImage,
    };
  }

  private truncateGoogleTitle(title: string, brandName: string): string {
    if (!title) return `${brandName} — CreatorStore`;
    return title.length > 60 ? `${title.slice(0, 57)}...` : title;
  }

  buildGlobalPreview(global: SEOGlobalSettings): MetadataPreview {
    const googleTitle = this.truncateGoogleTitle(global.siteTitle, global.brandName);
    return {
      googleTitle,
      googleDescription: global.metaDescription,
      browserTitle: global.brandName,
      ogTitle: global.siteTitle,
      ogDescription: global.metaDescription,
      ogImage: global.defaultOGImage,
      twitterTitle: global.siteTitle,
      twitterDescription: global.metaDescription,
      twitterImage: global.defaultTwitterImage,
    };
  }

  getAllRegistered(): string[] {
    return Array.from(this.generators.keys());
  }
}

export function homeMetadataGenerator(): MetadataGenerator {
  return {
    pageType: "home",
    generate(settings: PageSEOSettings, global: SEOGlobalSettings): MetadataPreview {
      const googleTitle = settings.seoTitle
        ? (settings.seoTitle.length > 60 ? `${settings.seoTitle.slice(0, 57)}...` : settings.seoTitle)
        : `${global.brandName} — CreatorStore`;
      return {
        googleTitle,
        googleDescription: settings.metaDescription || global.metaDescription,
        browserTitle: settings.seoTitle ? `${settings.seoTitle} | ${global.brandName}` : global.brandName,
        ogTitle: settings.ogTitle || settings.seoTitle || global.siteTitle,
        ogDescription: settings.ogDescription || settings.metaDescription || global.metaDescription,
        ogImage: settings.ogImage || global.defaultOGImage,
        twitterTitle: settings.twitterTitle || settings.seoTitle || global.siteTitle,
        twitterDescription: settings.twitterDescription || settings.metaDescription || global.metaDescription,
        twitterImage: settings.twitterImage || global.defaultTwitterImage,
      };
    },
  };
}

export function pageMetadataGenerator(pageType: string): MetadataGenerator {
  return {
    pageType,
    generate(settings: PageSEOSettings, global: SEOGlobalSettings): MetadataPreview {
      const googleTitle = settings.seoTitle
        ? (settings.seoTitle.length > 60 ? `${settings.seoTitle.slice(0, 57)}...` : settings.seoTitle)
        : `${settings.pageType.charAt(0).toUpperCase() + settings.pageType.slice(1)} | ${global.brandName}`;
      return {
        googleTitle,
        googleDescription: settings.metaDescription || global.metaDescription,
        browserTitle: settings.seoTitle ? `${settings.seoTitle} | ${global.brandName}` : global.brandName,
        ogTitle: settings.ogTitle || settings.seoTitle || `${global.siteTitle} - ${pageType}`,
        ogDescription: settings.ogDescription || settings.metaDescription || global.metaDescription,
        ogImage: settings.ogImage || global.defaultOGImage,
        twitterTitle: settings.twitterTitle || settings.seoTitle || global.siteTitle,
        twitterDescription: settings.twitterDescription || settings.metaDescription || global.metaDescription,
        twitterImage: settings.twitterImage || global.defaultTwitterImage,
      };
    },
  };
}

export function createMetadataRegistry(): MetadataRegistry {
  const registry = new MetadataRegistry();

  registry.register(homeMetadataGenerator(), 1);
  registry.register(pageMetadataGenerator("products"), 10);
  registry.register(pageMetadataGenerator("gallery"), 10);
  registry.register(pageMetadataGenerator("milestones"), 10);
  registry.register(pageMetadataGenerator("links"), 10);

  for (const futureType of FUTURE_PAGE_TYPES) {
    registry.register(pageMetadataGenerator(futureType), 20);
  }

  return registry;
}

export const metadataRegistry = createMetadataRegistry();
