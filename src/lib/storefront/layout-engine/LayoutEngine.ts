// ── LayoutEngine ──────────────────────────────────────────
// Pure transformation: PublishedSnapshot → StorefrontDocument.
// No side effects. No DB access. No services. No rendering.
// Deterministic. Immutable input.

import type { PublishedSnapshot, WebsiteAggregate } from "@/types/snapshot";
import type { StorefrontDocument } from "@/types/storefront";
import { resolveModuleId } from "@/lib/registry/resolve-module";

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
      "--text-primary": c.foreground,
      "--text-secondary": c.muted,
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

    if (moduleId.startsWith("hero.")) {
      Object.assign(config, content.hero);
      if (content.hero.ctaText && !config.cta) {
        config.cta = content.hero.ctaText;
      }
    } else if (moduleId.startsWith("about.")) {
      config.title = config.title || content.identity.name || "About";
      config.content = config.content || content.identity.bio || "";
      config.imageUrl = config.imageUrl || content.identity.avatarUrl;
      config.tagline = config.tagline || content.identity.tagline || "";
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
    } else if (moduleId.startsWith("links.") || moduleId === "links.default") {
      const linkEntries: Record<string, unknown>[] = content.links.map((l) => ({
        url: l.url,
        platform: l.title,
        label: l.title,
      }));
      for (const s of content.identity.socialLinks) {
        linkEntries.push({ url: s.url, platform: s.platform, label: s.platform });
      }
      config.resolvedData = linkEntries;
      config.resolvedTitle = "Connect With Me";
    } else if (moduleId.startsWith("footer.")) {
      config.copyright = config.copyright || `© ${content.identity.name} — CreatorStore`;
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
    } else if (moduleId.startsWith("faq.")) {
      config.resolvedData = content.faq.map((f) => ({
        question: f.question,
        answer: f.answer,
        q: f.question,
        a: f.answer,
        category: f.category,
      }));
      config.resolvedTitle = "FAQ";
    } else if (moduleId.startsWith("timeline.")) {
      config.resolvedData = content.timeline.map((t) => ({
        year: t.year,
        title: t.title,
        name: t.title,
        description: t.description,
        imageUrl: t.imageUrl,
      }));
      config.resolvedTitle = "Timeline";
    } else if (moduleId.startsWith("games.")) {
      config.resolvedData = (content.games ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        logoUrl: g.logoUrl,
        description: g.description,
        genre: g.genre,
      }));
      config.resolvedTitle = "Games";
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
    } else if (moduleId.startsWith("courses.")) {
      config.resolvedData = (content.courses ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        price: c.price,
        imageUrl: c.imageUrl,
        category: c.category,
      }));
      config.resolvedTitle = "Courses";
    } else if (moduleId.startsWith("services.")) {
      config.resolvedData = (content.services ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        price: s.price,
        duration: s.duration,
        imageUrl: s.imageUrl,
        category: s.category,
      }));
      config.resolvedTitle = "Services";
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
      sections: page.sections.map((section) => {
        const moduleId = resolveModuleId(section.moduleId);
        return {
          id: section.id,
          moduleId,
          config: this.composeSectionConfig(moduleId, section.config, snapshot.content),
          order: section.order,
          visible: section.visible,
        };
      }),
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
