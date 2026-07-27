// ── LayoutEngine ──────────────────────────────────────────
// Pure transformation: PublishedSnapshot → StorefrontDocument.
// No side effects. No DB access. No services. No rendering.
// Deterministic. Immutable input.

import type { PublishedSnapshot } from "@/types/snapshot";
import type { StorefrontDocument } from "@/types/storefront";

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

  private buildNavigation(snapshot: PublishedSnapshot): StorefrontDocument["navigation"] {
    const hasProducts = snapshot.content.products.length > 0;
    const hasGallery = snapshot.content.gallery.length > 0;
    const hasLinks = snapshot.content.links.length > 0;

    const nav: StorefrontDocument["navigation"] = [];

    for (const page of snapshot.layout.pages) {
      nav.push({
        id: page.id,
        label: page.name,
        enabled: true,
      });
    }

    if (hasProducts) {
      nav.push({ id: "products", label: "Products", enabled: true });
    }
    if (hasGallery) {
      nav.push({ id: "gallery", label: "Gallery", enabled: true });
    }
    if (hasLinks) {
      nav.push({ id: "links", label: "Links", enabled: true });
    }

    for (const item of snapshot.navigation) {
      const existing = nav.find((n) => n.id === item.label.toLowerCase());
      if (existing) {
        existing.enabled = item.enabled ?? true;
      }
    }

    return nav;
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

  // ── Pages ──────────────────────────────────────────────

  private buildPages(snapshot: PublishedSnapshot): StorefrontDocument["pages"] {
    return snapshot.layout.pages.map((page) => ({
      id: page.id,
      name: page.name,
      slug: page.slug,
      isHome: page.isHome,
      sections: page.sections.map((section) => ({
        id: section.id,
        moduleId: section.moduleId,
        config: { ...section.config },
        order: section.order,
        visible: section.visible,
      })),
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
