import type { WebsiteBlueprint } from "@/lib/generation/composition/types";
import { BaseGenerator } from "./base-generator";

export class WebsiteRecordGenerator extends BaseGenerator<Record<string, unknown>> {
  readonly type = "website_record" as const;

  generateData(blueprint: WebsiteBlueprint): Record<string, unknown> {
    return {
      title: blueprint.website.title,
      tagline: blueprint.website.tagline,
      description: blueprint.website.description,
      domain: blueprint.website.domain,
      locale: blueprint.website.locale,
      currency: blueprint.website.currency,
      timezone: blueprint.website.timezone,
      version: blueprint.metadata.version,
      confidence: blueprint.metadata.confidence,
      generatedAt: blueprint.metadata.generatedAt,
    };
  }
}

export class ThemeRecordGenerator extends BaseGenerator<Record<string, unknown>> {
  readonly type = "theme_record" as const;

  generateData(blueprint: WebsiteBlueprint): Record<string, unknown> {
    return {
      mode: blueprint.theme.mode,
      primary: blueprint.theme.primary,
      secondary: blueprint.theme.secondary,
      accent: blueprint.theme.accent,
      background: blueprint.theme.background,
      text: blueprint.theme.text,
      fonts: blueprint.theme.fonts,
      spacing: blueprint.theme.spacing,
      borderRadius: blueprint.theme.borderRadius,
      buttons: blueprint.theme.buttons,
      cards: blueprint.theme.cards,
      colors: blueprint.theme.colors,
    };
  }
}

export class PagesGenerator extends BaseGenerator<Array<Record<string, unknown>>> {
  readonly type = "pages" as const;

  generateData(blueprint: WebsiteBlueprint): Array<Record<string, unknown>> {
    return blueprint.pages.map((p) => ({
      id: p.id,
      type: p.type,
      title: p.title,
      slug: p.slug,
      description: p.description,
      sections: p.sections,
      order: p.order,
      visible: p.visible,
    }));
  }
}

export class NavigationGenerator extends BaseGenerator<Record<string, unknown>> {
  readonly type = "navigation" as const;

  generateData(blueprint: WebsiteBlueprint): Record<string, unknown> {
    return {
      desktop: blueprint.navigation.desktop,
      mobile: blueprint.navigation.mobile,
      bottom: blueprint.navigation.bottom,
      mobileBottom: blueprint.navigation.mobileBottom,
      sticky: blueprint.navigation.sticky,
      style: blueprint.navigation.style,
    };
  }
}

export class SectionsGenerator extends BaseGenerator<Array<Record<string, unknown>>> {
  readonly type = "sections" as const;

  generateData(blueprint: WebsiteBlueprint): Array<Record<string, unknown>> {
    return blueprint.sections.map((s) => ({
      id: s.id,
      type: s.type,
      page: s.page,
      order: s.order,
      props: s.props,
      reason: s.reason,
      confidence: s.confidence,
    }));
  }
}

export class ProductsGenerator extends BaseGenerator<Array<Record<string, unknown>>> {
  readonly type = "products" as const;

  generateData(blueprint: WebsiteBlueprint): Array<Record<string, unknown>> {
    return blueprint.products.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      category: p.category,
      description: p.description,
      priceRange: p.priceRange,
      featured: p.featured,
      order: p.order,
    }));
  }
}

export class GalleryGenerator extends BaseGenerator<Record<string, unknown>> {
  readonly type = "gallery" as const;

  generateData(blueprint: WebsiteBlueprint): Record<string, unknown> {
    return {
      enabled: blueprint.gallery.enabled,
      albums: blueprint.gallery.albums.map((a) => ({
        id: a.id,
        title: a.title,
        caption: a.caption,
        images: a.images,
        coverImage: a.coverImage,
        order: a.order,
      })),
      ordering: blueprint.gallery.ordering,
      layout: blueprint.gallery.layout,
    };
  }
}

export class SEOGenerator extends BaseGenerator<Record<string, unknown>> {
  readonly type = "seo" as const;

  generateData(blueprint: WebsiteBlueprint): Record<string, unknown> {
    return {
      title: blueprint.seo.title,
      description: blueprint.seo.description,
      keywords: blueprint.seo.keywords,
      ogImage: blueprint.seo.ogImage,
      ogType: blueprint.seo.ogType,
      twitterHandle: blueprint.seo.twitterHandle,
      canonical: blueprint.seo.canonical,
      structuredData: blueprint.seo.structuredData,
      sitemapPriority: blueprint.seo.sitemapPriority,
      sitemapChangefreq: blueprint.seo.sitemapChangefreq,
    };
  }
}
