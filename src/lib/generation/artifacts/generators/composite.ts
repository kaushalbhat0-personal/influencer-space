import type { WebsiteBlueprint } from "@/lib/generation/composition/types";
import { BaseGenerator } from "./base-generator";
import type { StorefrontJSON } from "../types";

export class BuilderJSONGenerator extends BaseGenerator<Record<string, unknown>> {
  readonly type = "builder_json" as const;

  generateData(blueprint: WebsiteBlueprint): Record<string, unknown> {
    return {
      version: blueprint.builder.version,
      blocks: blueprint.builder.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        props: b.props,
        children: b.children,
        locked: b.locked,
      })),
      layout: blueprint.builder.layout,
      containerWidth: blueprint.builder.containerWidth,
    };
  }
}

export class StorefrontJSONGenerator extends BaseGenerator<StorefrontJSON> {
  readonly type = "storefront_json" as const;

  generateData(blueprint: WebsiteBlueprint): StorefrontJSON {
    return {
      website: {
        title: blueprint.website.title,
        tagline: blueprint.website.tagline,
        description: blueprint.website.description,
        domain: blueprint.website.domain,
        locale: blueprint.website.locale,
        currency: blueprint.website.currency,
      },
      navigation: {
        desktop: blueprint.navigation.desktop,
        mobileBottom: blueprint.navigation.mobileBottom,
        sticky: blueprint.navigation.sticky,
        style: blueprint.navigation.style,
      },
      sections: blueprint.sections
        .filter((s) => s.page === "home" || s.page === "products")
        .sort((a, b) => a.order - b.order)
        .map((s) => ({
          id: s.id,
          type: s.type,
          props: s.props,
        })),
      theme: {
        mode: blueprint.theme.mode,
        primary: blueprint.theme.primary,
        secondary: blueprint.theme.secondary,
        accent: blueprint.theme.accent,
        background: blueprint.theme.background,
        text: blueprint.theme.text,
        fonts: blueprint.theme.fonts,
        borderRadius: blueprint.theme.borderRadius,
        buttons: blueprint.theme.buttons,
        cards: blueprint.theme.cards,
        colors: blueprint.theme.colors,
      },
      seo: {
        title: blueprint.seo.title,
        description: blueprint.seo.description,
        keywords: blueprint.seo.keywords,
        ogImage: blueprint.seo.ogImage,
        ogType: blueprint.seo.ogType,
        canonical: blueprint.seo.canonical,
      },
      products: blueprint.products.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        category: p.category,
        description: p.description,
        priceRange: p.priceRange,
        featured: p.featured,
      })),
      gallery: {
        enabled: blueprint.gallery.enabled,
        albums: blueprint.gallery.albums,
        layout: blueprint.gallery.layout,
      },
      feed: {
        enabled: blueprint.feed.enabled,
        source: blueprint.feed.source,
        limit: blueprint.feed.limit,
        layout: blueprint.feed.layout,
      },
      metadata: {
        generatedAt: blueprint.metadata.generatedAt,
        version: blueprint.metadata.version,
        confidence: blueprint.metadata.confidence,
      },
    };
  }
}

export class PublishSnapshotGenerator extends BaseGenerator<Record<string, unknown>> {
  readonly type = "publish_snapshot" as const;

  generateData(blueprint: WebsiteBlueprint): Record<string, unknown> {
    return {
      id: `snapshot_${blueprint.metadata.sourceKey}`,
      blueprintChecksum: "",
      artifacts: [],
      version: blueprint.metadata.version,
      createdAt: blueprint.metadata.generatedAt,
      records: {
        website: { title: blueprint.website.title, tagline: blueprint.website.tagline },
        theme: {
          primary: blueprint.theme.primary,
          secondary: blueprint.theme.secondary,
          mode: blueprint.theme.mode,
          fonts: blueprint.theme.fonts,
        },
        pages: blueprint.pages.map((p) => ({ id: p.id, type: p.type, title: p.title, slug: p.slug })),
        navigation: { desktop: blueprint.navigation.desktop, mobileBottom: blueprint.navigation.mobileBottom },
        sections: blueprint.sections.map((s) => ({ id: s.id, type: s.type, page: s.page, order: s.order })),
        products: blueprint.products.map((p) => ({ id: p.id, name: p.name, type: p.type, priceRange: p.priceRange })),
        gallery: { enabled: blueprint.gallery.enabled, albums: blueprint.gallery.albums },
        seo: { title: blueprint.seo.title, description: blueprint.seo.description },
      },
    };
  }
}
