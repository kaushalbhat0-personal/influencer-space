// ── LayoutEngine ──────────────────────────────────────────
// Pure transformation: PublishedSnapshot → StorefrontDocument.
// No side effects. No DB access. No services. No rendering.
// Deterministic. Immutable input.

import type { PublishedSnapshot, WebsiteAggregate } from "@/types/snapshot";
import type { StorefrontDocument } from "@/types/storefront";
import { resolveModuleId, isDeprecatedSection } from "@/lib/registry/resolve-module";

export class LayoutEngine {
  resolve(snapshot: PublishedSnapshot): StorefrontDocument {
    const canonicalUrl = this.buildCanonicalUrl(snapshot);

    return {
      version: snapshot.metadata.version,
      metadata: this.buildMetadata(snapshot, canonicalUrl),
      theme: this.buildTheme(snapshot),
      navigation: this.buildNavigation(snapshot),
      jsonLd: this.buildJsonLd(snapshot, canonicalUrl),
      pages: this.buildPages(snapshot),
      renderingHints: this.buildRenderingHints(snapshot),
    };
  }

  // ── Theme ──────────────────────────────────────────────

  private buildTheme(snapshot: PublishedSnapshot): Record<string, string> {
    const c = snapshot.theme.colors;
    return {
      "--brand-primary": c.primary,
      "--brand-secondary": c.secondary,
      "--brand-accent": c.accent,
      "--surface-root": c.background,
      "--surface-base": c.foreground,
      "--surface-card": deriveSurface(c.background, c.foreground),
      "--surface-card-hover": deriveSurface(c.background, c.foreground, 1.4),
      "--border": deriveBorder(c.background),
      "--text-primary": c.foreground,
      "--text-secondary": c.muted,
      "--text-muted": c.muted,
      "--on-primary": deriveOnColor(c.primary),
      "--primary-hover": deriveShade(c.primary, 0.82),
      "--live": "#ef4444",
    };
  }

  // ── Navigation ─────────────────────────────────────────
  // Canonical: read from snapshot.navigation directly.
  // No runtime derivation. No content inspection.
  // Navigation is persisted and published as part of the snapshot.

  private buildNavigation(snapshot: PublishedSnapshot): StorefrontDocument["navigation"] {
    return snapshot.navigation
      .filter((n) => n.visible)
      .map((n) => ({
        id: n.id,
        label: n.label,
        href: n.href,
        type: n.type,
        visible: n.visible,
        ...(n.target ? { target: n.target } : {}),
        ...(n.icon ? { icon: n.icon } : {}),
      }));
  }

  // ── Metadata ───────────────────────────────────────────

  private buildMetadata(
    snapshot: PublishedSnapshot,
    canonicalUrl: string,
  ): StorefrontDocument["metadata"] {
    const identity = snapshot.content.identity;
    const seo = snapshot.content.seo;
    const hero = snapshot.content.hero;

    const title = seo.title || `${identity.name} — CreatorStore`;
    const description = seo.description || identity.tagline || identity.bio || "Creator storefront";

    const image = identity.avatarUrl || hero.imageUrl || hero.posterUrl || undefined;

    return {
      title,
      description,
      canonicalUrl,
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        ...(image ? { image } : {}),
        siteName: "CreatorStore",
        type: "profile",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(image ? { image } : {}),
      },
    };
  }

  // ── JSON-LD ────────────────────────────────────────────

  private buildJsonLd(
    snapshot: PublishedSnapshot,
    canonicalUrl: string,
  ): StorefrontDocument["jsonLd"] {
    const identity = snapshot.content.identity;
    const products = snapshot.content.products;

    const jsonLd: Record<string, unknown>[] = [];

    const sameAs: string[] = [];
    for (const link of identity.socialLinks) {
      if (link.url) sameAs.push(link.url);
    }

    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "Person",
      name: identity.name,
      description: identity.tagline || identity.bio,
      ...(identity.avatarUrl ? { image: identity.avatarUrl } : {}),
      ...(sameAs.length > 0 ? { sameAs } : {}),
      url: canonicalUrl,
    });

    if (products.length > 0) {
      jsonLd.push({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${identity.name}'s Products`,
        itemListElement: products.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Product",
            name: p.name,
            description: p.description || undefined,
            image: p.imageUrl || undefined,
            offers: {
              "@type": "Offer",
              price: p.price,
              priceCurrency: "INR",
            },
          },
        })),
      });
    }

    return jsonLd;
  }

  // ── Section Composition ─────────────────────────────────
  // Pure: composes layout config + business content into renderer props.

  private composeSectionConfig(
    moduleId: string,
    layoutConfig: Record<string, unknown>,
    content: WebsiteAggregate,
  ): Record<string, unknown> {
    const config = { ...layoutConfig };
    const tracePrefix = "[RuntimeTrace] LayoutEngine.composeSectionConfig";

    if (moduleId.startsWith("hero.")) {
      Object.assign(config, content.hero);
      if (content.hero.ctaText) {
        config.cta = content.hero.ctaText;
      }
      if (content.hero.ctaSecondaryText) {
        config.ctaSecondary = content.hero.ctaSecondaryText;
      }
      // IMPLEMENTATION-21 (BUG 4): log the resolved hero media props the
      // renderer will receive. content.hero carries the SINGLE resolved
      // decision from the aggregate (resolveHeroMediaForRuntime); Builder +
      // Storefront both flow through this engine, so identical values prove
      // parity.
      console.log(tracePrefix, "hero", {
        title: content.hero.title,
        cta: config.cta,
        ctaSecondary: config.ctaSecondary,
        videoAssetId: content.hero.videoAssetId ?? null,
        videoUrl: content.hero.videoUrl ?? null,
        posterAssetId: content.hero.posterAssetId ?? null,
        posterUrl: content.hero.posterUrl ?? null,
        backgroundUrl: content.hero.backgroundUrl ?? null,
        resolvedMedia: content.hero.resolvedMedia ?? null,
        mediaType: content.hero.mediaType ?? null,
        mediaUrl: content.hero.mediaUrl ?? null,
        mediaPoster: content.hero.mediaPoster ?? null,
        rendererDecision: content.hero.rendererDecision ?? null,
      });
    } else if (moduleId.startsWith("products.")) {
      const productEntries: Record<string, unknown>[] = content.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
        slug: p.slug,
        isFeatured: p.isFeatured,
      }));
      config.resolvedData = productEntries;
      config.resolvedTitle = content.identity.name
        ? `${content.identity.name}'s Products`
        : "Products";
      console.log(tracePrefix, "products", { aggCount: content.products.length, resolvedCount: productEntries.length });
    } else if (moduleId.startsWith("gallery.")) {
      const imageEntries: Record<string, unknown>[] = content.gallery.map((g) => ({
        id: g.id,
        url: g.imageUrl,
        caption: g.title || g.description || "",
        description: g.description,
        videoUrl: g.videoUrl,
        altText: g.altText,
        isVideo: g.mediaType === "video",
      }));
      config.resolvedData = imageEntries;
      config.resolvedTitle = "Gallery";
      console.log(tracePrefix, "gallery", { aggCount: content.gallery.length, resolvedCount: imageEntries.length });
    } else if (moduleId.startsWith("links.") || moduleId === "links.default") {
      // IMPLEMENTATION-18A: the Links section is PRESENTATION ONLY — it renders
      // Hero's social/streaming links. Hero is the single source of truth; the
      // separate AffiliateLink table is no longer a storefront data source.
      const heroLinks = content.hero.socialLinks ?? [];
      const linkEntries: Record<string, unknown>[] = heroLinks.map((l) => ({
        url: l.url,
        platform: l.label || l.platform,
        label: l.label || l.platform,
      }));
      config.resolvedData = linkEntries;
      config.resolvedTitle = "Connect With Me";
      console.log(tracePrefix, "links", { heroLinks: heroLinks.length, resolvedCount: linkEntries.length });
    } else if (moduleId.startsWith("footer.")) {
      config.copyright = config.copyright || `© ${content.identity.name} — CreatorStore`;
      config.socialLinks = content.hero.socialLinks ?? [];
    } else if (moduleId.startsWith("contact.")) {
      config.title = config.title || "Get In Touch";
    } else if (moduleId.startsWith("newsletter.")) {
      config.title = config.title || "Subscribe";
    } else if (moduleId.startsWith("testimonials.")) {
      config.resolvedData = content.testimonials.map((t) => ({
        name: t.author,
        handle: t.role,
        content: t.content,
        message: t.content,
        avatarUrl: t.avatarUrl,
        rating: t.rating,
      }));
      config.resolvedTitle = "Testimonials";
      console.log(tracePrefix, "testimonials", { aggCount: content.testimonials.length, resolvedCount: (config.resolvedData as unknown[]).length });
    } else if (moduleId.startsWith("faq.")) {
      config.resolvedData = content.faq.map((f) => ({
        question: f.question,
        answer: f.answer,
        q: f.question,
        a: f.answer,
        category: f.category,
      }));
      config.resolvedTitle = "FAQ";
      console.log(tracePrefix, "faq", { aggCount: content.faq.length, resolvedCount: (config.resolvedData as unknown[]).length });
    } else if (moduleId.startsWith("timeline.")) {
      config.resolvedData = content.timeline.map((t) => ({
        year: t.year,
        title: t.title,
        name: t.title,
        description: t.description,
        imageUrl: t.imageUrl,
      }));
      config.resolvedTitle = "Timeline";
      console.log(tracePrefix, "timeline", { aggCount: content.timeline.length, resolvedCount: (config.resolvedData as unknown[]).length });
    } else if (moduleId.startsWith("games.")) {
      config.resolvedData = (content.games ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        logoUrl: g.logoUrl,
        description: g.description,
        genre: g.genre,
      }));
      config.resolvedTitle = "Games";
      console.log(tracePrefix, "games", { aggCount: (content.games ?? []).length, resolvedCount: (config.resolvedData as unknown[]).length });
    } else if (moduleId.startsWith("contentFeed.")) {
      config.resolvedData = (content.contentFeed ?? []).map((f) => ({
        id: f.id,
        platform: f.platform,
        mediaType: f.mediaType,
        url: f.url,
        thumbnailUrl: f.thumbnailUrl,
        caption: f.caption,
        permalink: f.permalink,
      }));
      config.resolvedTitle = "Latest Content";
      console.log(tracePrefix, "contentFeed", { aggCount: (content.contentFeed ?? []).length, resolvedCount: (config.resolvedData as unknown[]).length });
    } else if (moduleId.startsWith("courses.")) {
      config.resolvedData = (content.courses ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        price: c.price,
        imageUrl: c.imageUrl,
        category: c.category,
        featured: c.featured,
      }));
      config.resolvedTitle = "Courses";
      console.log(tracePrefix, "courses", { aggCount: (content.courses ?? []).length, resolvedCount: (config.resolvedData as unknown[]).length });
    } else if (moduleId.startsWith("services.")) {
      config.resolvedData = (content.services ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        price: s.price,
        duration: s.duration,
        imageUrl: s.imageUrl,
        category: s.category,
        featured: s.featured,
      }));
      config.resolvedTitle = "Services";
      console.log(tracePrefix, "services", { aggCount: (content.services ?? []).length, resolvedCount: (config.resolvedData as unknown[]).length });
    }

    return config;
  }

  // ── Pages ──────────────────────────────────────────────

  private buildPages(snapshot: PublishedSnapshot): StorefrontDocument["pages"] {
    return snapshot.layout.pages.map((page) => ({
      id: page.id,
      name: page.name,
      slug: page.slug,
      isHome: page.isHome,
      sections: page.sections
        .map((section) => {
          const moduleId = resolveModuleId(section.moduleId);
          return {
            id: section.id,
            moduleId,
            config: this.composeSectionConfig(moduleId, section.config, snapshot.content),
            order: section.order,
            visible: section.visible,
          };
        })
        // IMPLEMENTATION-19: About was removed — Hero is the identity section.
        // Old layouts containing About migrate automatically by dropping it.
        .filter((section) => !isDeprecatedSection(section.moduleId)),
    }));
  }

  // ── Rendering Hints ────────────────────────────────────

  private buildRenderingHints(
    snapshot: PublishedSnapshot,
  ): StorefrontDocument["renderingHints"] {
    return {
      sectionVisibility: snapshot.renderingHints.sectionVisibility
        ? { ...snapshot.renderingHints.sectionVisibility }
        : undefined,
      responsive: snapshot.renderingHints.responsive
        ? { ...snapshot.renderingHints.responsive }
        : undefined,
      animations: snapshot.renderingHints.animations
        ? JSON.parse(JSON.stringify(snapshot.renderingHints.animations))
        : undefined,
      customCss: snapshot.renderingHints.customCss,
    };
  }

  // ── Helpers ────────────────────────────────────────────

  private buildCanonicalUrl(_snapshot: PublishedSnapshot): string {
    // Canonical URL requires tenant subdomain/domain which is resolved
    // at the page level (infrastructure). LayoutEngine receives the
    // resolved URL from the caller.
    return "";
  }
}

export const layoutEngine = new LayoutEngine();

// ── Theme integration helpers (derived from the existing snapshot colors) ──

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "").trim();
  if (m.length === 3) {
    return [
      parseInt(m[0]! + m[0]!, 16),
      parseInt(m[1]! + m[1]!, 16),
      parseInt(m[2]! + m[2]!, 16),
    ];
  }
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return [Number.isFinite(r) ? r : 0, Number.isFinite(g) ? g : 0, Number.isFinite(b) ? b : 0];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Card surface: dark themes lift from the background; light themes sink. */
function deriveSurface(bg: string, _fg: string, factor = 1): string {
  const isDark = luminance(bg) < 0.5;
  const [r, g, b] = hexToRgb(bg);
  const delta = isDark ? 14 * factor : -10 * factor;
  return rgbToHex([r + delta, g + delta, b + delta]);
}

/** Border: subtle white on dark themes, subtle black on light themes. */
function deriveBorder(bg: string): string {
  const isDark = luminance(bg) < 0.5;
  return isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
}

/** Foreground color that reads on a given background. */
function deriveOnColor(bg: string): string {
  return luminance(bg) < 0.5 ? "#ffffff" : "#09090b";
}

/** Darken (factor < 1) or lighten (factor > 1) a hex color. */
function deriveShade(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r * factor, g * factor, b * factor]);
}
