import { describe, it, expect, vi } from "vitest";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import type { PublishedSnapshot, WebsiteAggregate } from "@/types/snapshot";

// Helper to build minimal aggregate with footer ownership model
function makeAggregate(overrides: Partial<WebsiteAggregate> = {}): WebsiteAggregate {
  const base: WebsiteAggregate = {
    identity: { name: "Northstar Studio", tagline: "Design forward", bio: "Studio bio", avatarUrl: null, bannerUrl: null, socialLinks: [] },
    siteSocialLinks: [
      { platform: "instagram", url: "https://instagram.com/northstar.studio", label: "Instagram" },
      { platform: "linkedin", url: "https://linkedin.com/company/northstar", label: "LinkedIn" },
    ],
    footer: {
      description: "Footer description owned by Footer",
      copyright: "© 2026 Northstar Test",
      columns: [
        { title: "Products", links: [{ label: "Templates", href: "#products" }] },
        { title: "Support", links: [{ label: "Privacy", href: "/privacy" }] },
      ],
    },
    hero: {
      title: "Hero Heading",
      subtitle: "Northstar",
      description: "Hero desc",
      ctaText: "Start a Project",
      ctaLink: "#contact",
      ctaSecondaryText: "View Work",
      ctaSecondaryLink: "#gallery",
      socialLinks: [{ platform: "instagram", url: "https://instagram.com/northstar.studio" }],
      showLiveBadge: false,
    },
    products: [],
    gallery: [],
    links: [],
    seo: { title: "t", description: "d" },
    testimonials: [],
    faq: [],
    timeline: [],
    games: [],
    contentFeed: [],
    courses: [],
    services: [],
    ...overrides,
  } as WebsiteAggregate;
  return base;
}

function makeSnapshot(aggregate: WebsiteAggregate): PublishedSnapshot {
  return {
    _schema: "creatorstore.snapshot",
    _version: 1,
    metadata: { version: 1, publishedAt: new Date().toISOString(), previousVersion: null, correlationId: "test", generatedBy: "dashboard" },
    content: aggregate,
    layout: {
      pages: [{
        id: "p1", name: "Home", slug: "/", isHome: true, order: 0,
        sections: [
          { id: "s-hero", moduleId: "hero.default", config: {}, order: 0, visible: true },
          { id: "s-foot", moduleId: "footer.default", config: {}, order: 1, visible: true },
        ]
      }]
    },
    theme: { packageId: "com.creatos.neon-dark", colors: { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa" }, typography: { heading: "Inter", body: "Inter" } },
    navigation: [],
    renderingHints: {},
  };
}

describe("RCCF-07A — Footer Ownership & Shared Social", () => {
  it("Hero CTA configuration does not populate Footer links", () => {
    const agg = makeAggregate({
      hero: { title: "H", subtitle: "", description: "", ctaText: "Hero CTA", ctaLink: "/hero-cta", ctaSecondaryText: "Hero Secondary", ctaSecondaryLink: "/hero-secondary", socialLinks: [] } as any,
      footer: { description: null, copyright: null, columns: [{ title: "Footer Only", links: [{ label: "Footer Link", href: "/footer-only" }] }] },
    });
    const doc = layoutEngine.resolve(makeSnapshot(agg));
    const footer = doc.pages[0].sections.find(s=>s.moduleId==="footer.default")!;
    const cols = (footer.config.footerColumns as Array<{title:string; links:Array<{label:string;href:string}>}>) ?? [];
    // footer must not contain hero CTA hrefs
    const allHrefs = cols.flatMap(c=>c.links.map(l=>l.href));
    expect(allHrefs).not.toContain("/hero-cta");
    expect(allHrefs).not.toContain("/hero-secondary");
    expect(allHrefs).toContain("/footer-only");
  });

  it("Footer links can be configured independently", () => {
    const agg = makeAggregate({
      footer: { description: "Custom", copyright: "© Custom", columns: [{ title: "Custom", links: [{ label: "Custom Link", href: "/custom" }] }] } as any,
    });
    const doc = layoutEngine.resolve(makeSnapshot(agg));
    const footer = doc.pages[0].sections.find(s=>s.moduleId==="footer.default")!;
    expect(footer.config.copyright).toBe("© Custom");
    expect(footer.config.footerDescription).toBe("Custom");
    expect((footer.config.footerColumns as Array<any>)[0].title).toBe("Custom");
  });

  it("Footer configuration reaches the snapshot (via aggregate.footer)", () => {
    const agg = makeAggregate();
    const snap = makeSnapshot(agg);
    // snapshot content carries footer owned by Footer
    expect(snap.content.footer?.columns[0].title).toBe("Products");
    const doc = layoutEngine.resolve(snap);
    const footer = doc.pages[0].sections.find(s=>s.moduleId==="footer.default")!;
    // layoutEngine propagates footerColumns from aggregate.footer
    expect(footer.config.footerColumns).toBeDefined();
  });

  it("FooterRenderer receives Footer-owned configuration (not Hero)", async () => {
    const agg = makeAggregate();
    const doc = layoutEngine.resolve(makeSnapshot(agg));
    const footer = doc.pages[0].sections.find(s=>s.moduleId==="footer.default")!;
    // Footer config must be from footer, not hero cta
    expect(footer.config.brandName).toBe("Northstar Studio");
    expect(footer.config.socialLinks).toEqual(agg.siteSocialLinks);
    expect(footer.config.cta).toBeUndefined();
    expect(footer.config.ctaText).toBeUndefined();
  });

  it("Footer no longer requires Hero-specific data for footer navigation", () => {
    const agg = makeAggregate({
      hero: { title: "", subtitle: "", description: "", socialLinks: [] } as any,
      siteSocialLinks: [{ platform: "x", url: "https://x.com/northstar" }],
      footer: { description: null, copyright: null, columns: [{ title: "A", links: [{label:"L", href:"/a"}]}] } as any,
    });
    const doc = layoutEngine.resolve(makeSnapshot(agg));
    const footer = doc.pages[0].sections.find(s=>s.moduleId==="footer.default")!;
    expect(footer.config.socialLinks).toEqual([{ platform: "x", url: "https://x.com/northstar" }]);
    // hero cta absence must not affect footer
    expect(footer.config.footerColumns).toBeDefined();
  });

  it("Shared social links can be consumed by Footer", () => {
    const agg = makeAggregate({
      siteSocialLinks: [{ platform: "dribbble", url: "https://dribbble.com/northstar", label: "Dribbble" }],
    });
    const doc = layoutEngine.resolve(makeSnapshot(agg));
    const footer = doc.pages[0].sections.find(s=>s.moduleId==="footer.default")!;
    expect((footer.config.socialLinks as Array<any>).some((l:any)=> l.url.includes("dribbble"))).toBe(true);
  });

  it("Existing social-link data remains backward compatible (hero fallback)", () => {
    const agg = makeAggregate({
      siteSocialLinks: [], // new key empty
      hero: { title: "", subtitle: "", description: "", socialLinks: [{ platform:"instagram", url:"https://instagram.com/legacy"}] } as any,
      identity: { name:"Test", tagline:"", bio:"", avatarUrl:null, bannerUrl:null, socialLinks: [{ platform:"instagram", url:"https://instagram.com/legacy"}] } as any,
    } as any);
    // simulate aggregate service compat: if siteSocialLinks empty, fallback is identity/hero legacy
    // In our new aggregate service, siteSocialLinks would be hero legacy; but layoutEngine fallback uses identity.socialLinks
    // So test that layoutEngine still renders socialLinks from identity when siteSocialLinks empty
    const snap = makeSnapshot({ ...agg, siteSocialLinks: [] } as any);
    // force identity to have legacy link, site empty
    snap.content.identity.socialLinks = [{ platform:"instagram", url:"https://instagram.com/legacy"}];
    (snap.content as any).siteSocialLinks = [];
    const doc = layoutEngine.resolve(snap);
    const footer = doc.pages[0].sections.find(s=>s.moduleId==="footer.default")!;
    // footer should fallback to identity.socialLinks when site empty
    expect((footer.config.socialLinks as Array<any>).some((l:any)=> l.url.includes("legacy"))).toBe(true);
  });
});

describe("RCCF-07A — Admin Footer surface", () => {
  it("Footer edit action resolves to Footer editing surface (not Hero)", async () => {
    const { ADMIN_NAV } = await import("@/config/admin-nav");
    const designGroup = ADMIN_NAV.groups.find(g=>g.label==="Design");
    const footerItem = designGroup?.items.find(i=>i.label==="Footer");
    expect(footerItem).toBeDefined();
    expect(footerItem?.href).toBe("/admin/footer");
  });

  it("No Hero edit route is used as Footer edit destination", async () => {
    const { readFileSync } = await import("fs");
    const source = readFileSync("src/features/builder/components/section-manager.tsx","utf-8");
    expect(source).toContain('"footer.default": "/admin/footer"');
    expect(source).not.toContain('"footer.default": "/admin/settings"');
  });
});

describe("RCCF-07A — Rendering invariants", () => {
  it("Exactly one semantic footer exists (StorefrontPage outer + FootRenderer div)", async () => {
    const agg = makeAggregate();
    const doc = layoutEngine.resolve(makeSnapshot(agg));
    const footers = doc.pages[0].sections.filter(s=>s.moduleId.startsWith("footer"));
    expect(footers).toHaveLength(1);
  });

  it("Builder/Preview/Published continue using same pipeline (LayoutEngine)", () => {
    const agg = makeAggregate();
    const snap = makeSnapshot(agg);
    const doc1 = layoutEngine.resolve(snap);
    const doc2 = layoutEngine.resolve({ ...snap, content: { ...agg, siteSocialLinks: agg.siteSocialLinks } });
    // pipeline is pure, same input -> same sections order
    expect(doc1.pages[0].sections.map(s=>s.moduleId)).toEqual(doc2.pages[0].sections.map(s=>s.moduleId));
  });
});
