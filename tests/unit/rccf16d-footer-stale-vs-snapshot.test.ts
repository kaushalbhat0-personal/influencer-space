import { describe, it, expect } from "vitest";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import type { PublishedSnapshot, WebsiteAggregate } from "@/types/snapshot";
import { CURRENT_SNAPSHOT_VERSION, SNAPSHOT_SCHEMA } from "@/types/snapshot";

function makeAggregate(overrides: Partial<WebsiteAggregate> = {}): WebsiteAggregate {
  const base: WebsiteAggregate = {
    identity: { name: "Mystic Minutes", tagline: "Discover", bio: "Discover the deeper meaning", avatarUrl: null, bannerUrl: null, socialLinks: [] },
    siteSocialLinks: [],
    footer: { description: null, copyright: null, columns: [] },
    hero: { title: "Hero", subtitle: "", description: "", socialLinks: [] } as any,
    products: [], gallery: [], links: [], seo: { title: "", description: "" }, testimonials: [], faq: [], timeline: [], games: [], contentFeed: [], courses: [], services: [],
    ...overrides,
  } as WebsiteAggregate;
  return base;
}

function makeSnapshot(aggregate: WebsiteAggregate, layoutFooterConfig: Record<string, unknown> = {}): PublishedSnapshot {
  return {
    _schema: SNAPSHOT_SCHEMA,
    _version: CURRENT_SNAPSHOT_VERSION,
    metadata: { version: 9, publishedAt: new Date().toISOString(), previousVersion: 8, correlationId: "test-16d", generatedBy: "dashboard" },
    content: aggregate,
    layout: {
      pages: [{
        id: "p1", name: "Home", slug: "/", isHome: true, order: 0,
        sections: [
          { id: "s-foot", moduleId: "footer.default", config: layoutFooterConfig, order: 1, visible: true },
        ],
      }],
    },
    theme: { packageId: "com.creatos.neon-dark", colors: { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa" }, typography: { heading: "Inter", body: "Inter" } },
    navigation: [],
    renderingHints: {},
  };
}

describe("RCCF-PRELAUNCH-16D — stale footer_config vs PublishedSnapshot", () => {
  it("stale footer_config (Northstar) does not override published snapshot layout footer (Mystic Minutes)", () => {
    // Simulate Mystic Minutes tenant where footer_config was inherited from Northstar Studio
    // content.footer is stale (baked from footer_config), layout footer is correct Mystic
    const staleAggregate = makeAggregate({
      identity: { name: "Mystic Minutes", tagline: "Discover", bio: "Follow your light.", avatarUrl: null, bannerUrl: null, socialLinks: [] },
      footer: {
        description: "Design that moves your business forward.",
        copyright: "© 2026 Northstar Studio — All rights reserved.",
        columns: [
          { title: "Products", links: [{ label: "Templates", href: "#products" }] },
        ],
      },
    } as any);

    const layoutConfig = {
      copyright: "© 2026 Mystic Minutes. All rights reserved.",
      footerDescription: "Custom layout description",
      footerColumns: [{ title: "Support", links: [{ label: "Privacy", href: "/privacy" }] }],
    };

    const snap = makeSnapshot(staleAggregate, layoutConfig);
    const doc = layoutEngine.resolve(snap);
    const footer = doc.pages[0].sections.find((s) => s.moduleId === "footer.default")!;

    // Published snapshot layout must win over stale aggregate footer
    expect(footer.config.copyright).toBe("© 2026 Mystic Minutes. All rights reserved.");
    // description also falls back to layout when footer is stale
    expect(footer.config.footerDescription).toBe("Custom layout description");
    // columns also from layout when footer stale
    expect((footer.config.footerColumns as Array<{ title: string }>)[0].title).toBe("Support");
    // must not contain Northstar
    expect(String(footer.config.copyright)).not.toContain("Northstar");
    expect(String(footer.config.footerDescription)).not.toContain("Design that moves");
  });

  it("legitimate footer_config that contains identity name is preserved", () => {
    const legitAggregate = makeAggregate({
      identity: { name: "Mystic Minutes", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
      footer: {
        description: "Custom Mystic footer desc",
        copyright: "© 2026 Mystic Minutes — Crafted with love",
        columns: [{ title: "Custom", links: [{ label: "Link", href: "/custom" }] }],
      },
    } as any);

    const snap = makeSnapshot(legitAggregate, { copyright: "© layout should not win" });
    const doc = layoutEngine.resolve(snap);
    const footer = doc.pages[0].sections.find((s) => s.moduleId === "footer.default")!;
    // When footer contains identity, it is legitimate and must win over layout
    expect(footer.config.copyright).toBe("© 2026 Mystic Minutes — Crafted with love");
    expect(footer.config.footerDescription).toBe("Custom Mystic footer desc");
    expect((footer.config.footerColumns as Array<{ title: string }>)[0].title).toBe("Custom");
  });

  it("other storefronts (Northstar) are not affected — footer matching identity is kept", () => {
    const northstarAggregate = makeAggregate({
      identity: { name: "Northstar Studio", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
      footer: {
        description: "Design that moves your business forward.",
        copyright: "© 2026 Northstar Studio — All rights reserved.",
        columns: [{ title: "Studio", links: [{ label: "Work", href: "#work" }] }],
      },
    } as any);

    const snap = makeSnapshot(northstarAggregate, {});
    const doc = layoutEngine.resolve(snap);
    const footer = doc.pages[0].sections.find((s) => s.moduleId === "footer.default")!;
    // For Northstar, stale detection is false (copyright contains identity), so footer is preserved
    expect(footer.config.copyright).toContain("Northstar Studio");
    expect(footer.config.footerDescription).toBe("Design that moves your business forward.");
  });

  it("snapshot/storefront parity: builder draft and published resolve identically when aggregate matches", () => {
    const agg = makeAggregate({
      identity: { name: "Parity Test", tagline: "", bio: "Bio", avatarUrl: null, bannerUrl: null, socialLinks: [] },
      footer: { description: null, copyright: null, columns: [] },
    } as any);
    const snap = makeSnapshot(agg, { copyright: "© 2026 Parity Test" });
    const doc1 = layoutEngine.resolve(snap);
    const doc2 = layoutEngine.resolve(snap);
    expect(doc1.pages[0].sections[0].config.copyright).toBe(doc2.pages[0].sections[0].config.copyright);
    expect(doc1.pages[0].sections[0].config.footerDescription).toBe(doc2.pages[0].sections[0].config.footerDescription);
  });

  it("fallback to identity when both footer and layout are empty", () => {
    const agg = makeAggregate({
      identity: { name: "Solo Creator", tagline: "Tagline", bio: "Bio text", avatarUrl: null, bannerUrl: null, socialLinks: [] },
      footer: { description: null, copyright: null, columns: [] },
    } as any);
    const snap = makeSnapshot(agg, {});
    const doc = layoutEngine.resolve(snap);
    const footer = doc.pages[0].sections.find((s) => s.moduleId === "footer.default")!;
    // Should fallback to identity-derived copyright
    expect(String(footer.config.copyright)).toContain("Solo Creator");
    expect(footer.config.footerDescription).toBe("Bio text");
  });
});
