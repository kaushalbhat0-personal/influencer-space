import { describe, it, expect } from "vitest";
import {
  type PublishedSnapshot,
  CURRENT_SNAPSHOT_VERSION,
  SNAPSHOT_SCHEMA,
} from "@/types/snapshot";
import { LayoutEngine } from "@/lib/storefront/layout-engine/LayoutEngine";
import { HERO_SOCIAL_PLATFORMS } from "@/config/hero";

const engine = new LayoutEngine();

function snapshotWithHero(hero: Record<string, unknown>, layout: Array<{ moduleId: string; id: string }>): PublishedSnapshot {
  return {
    _schema: SNAPSHOT_SCHEMA,
    _version: CURRENT_SNAPSHOT_VERSION,
    metadata: { version: 1, publishedAt: "2026-01-01T00:00:00Z", previousVersion: null, correlationId: "h1", generatedBy: "dashboard" },
    content: {
      identity: { name: "Creator", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
      hero: { title: "Hi", subtitle: "", description: "", ...(hero as object) },
      products: [],
      gallery: [],
      links: [{ id: "legacy1", title: "LEGACY SHOP", url: "https://example.com/legacy" }],
      seo: { title: "", description: "" },
    },
    layout: {
      pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: layout.map((s) => ({ id: s.id, moduleId: s.moduleId, config: {}, order: 0, visible: true })) }],
    },
    theme: {
      packageId: "neon-dark",
      colors: { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa" },
      typography: { heading: "Inter", body: "Inter" },
    },
    navigation: [],
    renderingHints: {},
  };
}

describe("Hero unification (IMPLEMENTATION-18A) — Hero owns social links", () => {
  it("HERO_SOCIAL_PLATFORMS covers the required platforms", () => {
    const platforms = HERO_SOCIAL_PLATFORMS.map((p) => p.value);
    for (const required of ["youtube", "instagram", "x", "facebook", "linkedin", "discord", "telegram", "whatsapp", "kick", "twitch", "website", "email", "phone", "custom"]) {
      expect(platforms).toContain(required);
    }
  });

  it("Links section renders ONLY hero.socialLinks (AffiliateLink is ignored)", () => {
    const socialLinks = [
      { platform: "youtube", url: "https://youtube.com/@farah" },
      { platform: "instagram", url: "https://instagram.com/farah" },
    ];
    const snap = snapshotWithHero({ socialLinks }, [{ moduleId: "links.default", id: "s-links" }]);
    const doc = engine.resolve(snap);
    const linksSection = doc.pages[0].sections.find((s) => s.moduleId === "links.default");
    const resolved = linksSection?.config.resolvedData as Array<{ url: string; platform: string }>;
    expect(resolved).toHaveLength(2);
    expect(resolved.map((r) => r.url)).toEqual(["https://youtube.com/@farah", "https://instagram.com/farah"]);
    // The legacy AffiliateLink row must NOT appear.
    expect(resolved.some((r) => r.url.includes("legacy"))).toBe(false);
  });

  it("Hero section config carries hero.socialLinks", () => {
    const socialLinks = [{ platform: "twitch", url: "https://twitch.tv/farah" }];
    const snap = snapshotWithHero({ socialLinks }, [{ moduleId: "hero.default", id: "s-hero" }]);
    const doc = engine.resolve(snap);
    const heroSection = doc.pages[0].sections.find((s) => s.moduleId === "hero.default");
    const heroConfig = heroSection?.config as Record<string, unknown>;
    expect(heroConfig.socialLinks).toEqual(socialLinks);
  });

  it("Footer receives hero.socialLinks and renders them", () => {
    const socialLinks = [{ platform: "x", url: "https://x.com/farah" }];
    const snap = snapshotWithHero({ socialLinks }, [{ moduleId: "footer.default", id: "s-footer" }]);
    const doc = engine.resolve(snap);
    const footer = doc.pages[0].sections.find((s) => s.moduleId === "footer.default");
    expect((footer?.config.socialLinks as Array<{ url: string }>).map((l) => l.url)).toEqual(["https://x.com/farah"]);
  });

  it("empty hero.socialLinks renders an empty Links section (no legacy data)", () => {
    const snap = snapshotWithHero({ socialLinks: [] }, [{ moduleId: "links.default", id: "s-links" }]);
    const doc = engine.resolve(snap);
    const linksSection = doc.pages[0].sections.find((s) => s.moduleId === "links.default");
    expect((linksSection?.config.resolvedData as unknown[]).length).toBe(0);
  });
});
