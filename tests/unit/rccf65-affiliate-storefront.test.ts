import { describe, it, expect, vi } from "vitest";

// renderers.tsx → AffiliateGrid → affiliate.actions → storage.service imports
// supabase, which throws at module load when env vars are absent in the node
// test environment. Mock it (hoisted) so the builtin registration test can
// import the renderer tree without a real Supabase client.
vi.mock("@/lib/supabase", () => ({
  BUCKET: "influencer-images",
  supabaseClient: {},
  supabaseAdmin: {},
}));
import {
  type PublishedSnapshot,
  CURRENT_SNAPSHOT_VERSION,
  SNAPSHOT_SCHEMA,
} from "@/types/snapshot";
import { LayoutEngine } from "@/lib/storefront/layout-engine/LayoutEngine";
import { registerBuiltinComponents } from "@/lib/registry/components/builtins";
import { componentRegistry } from "@/lib/registry/components/registry";
import { safeUrl } from "@/lib/registry/components/safe-url";

const engine = new LayoutEngine();

function snapshotWith(links: PublishedSnapshot["content"]["links"], sections: Array<{ moduleId: string; id: string }>): PublishedSnapshot {
  return {
    _schema: SNAPSHOT_SCHEMA,
    _version: CURRENT_SNAPSHOT_VERSION,
    metadata: { version: 1, publishedAt: "2026-01-01T00:00:00Z", previousVersion: null, correlationId: "r65", generatedBy: "dashboard" },
    content: {
      identity: { name: "Creator", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
      hero: { title: "Hi", subtitle: "", description: "", socialLinks: [{ platform: "youtube", url: "https://youtube.com/@creator" }] },
      products: [],
      gallery: [],
      links,
      seo: { title: "", description: "" },
    },
    layout: {
      pages: [{ id: "p1", name: "Home", slug: "/", isHome: true, order: 0, sections: sections.map((s) => ({ id: s.id, moduleId: s.moduleId, config: {}, order: 0, visible: true })) }],
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

describe("RCCF-65.2 — Affiliate Links storefront completion", () => {
  it("resolves an affiliateLinks section from the persisted aggregate (id/title/url/imageUrl/clicks)", () => {
    const links = [
      { id: "a1", title: "Keyboard", url: "https://gear.example.com/keeb", imageUrl: "https://cdn.example.com/keeb.jpg", clicks: 7 },
      { id: "a2", title: "Mouse", url: "https://gear.example.com/mouse", imageUrl: null, clicks: 0 },
    ];
    const snap = snapshotWith(links, [{ moduleId: "affiliateLinks.default", id: "s-aff" }]);
    const doc = engine.resolve(snap);
    const section = doc.pages[0].sections.find((s) => s.moduleId === "affiliateLinks.default");
    expect(section).toBeDefined();
    const resolved = section?.config.resolvedData as Array<{ id: string; title: string; url: string; imageUrl: string | null; clicks: number }>;
    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toEqual({ id: "a1", title: "Keyboard", url: "https://gear.example.com/keeb", imageUrl: "https://cdn.example.com/keeb.jpg", clicks: 7 });
    expect(resolved[1]).toEqual({ id: "a2", title: "Mouse", url: "https://gear.example.com/mouse", imageUrl: null, clicks: 0 });
    // Presentation-only metadata is untouched.
    expect(section?.config.resolvedTitle).toBe("Affiliate Links");
  });

  it("keeps links.default wired to hero.socialLinks (affiliate data must NOT leak into it)", () => {
    const snap = snapshotWith(
      [{ id: "a1", title: "Keyboard", url: "https://gear.example.com/keeb", imageUrl: null, clicks: 3 }],
      [
        { moduleId: "links.default", id: "s-links" },
        { moduleId: "affiliateLinks.default", id: "s-aff" },
      ],
    );
    const doc = engine.resolve(snap);
    const linksSection = doc.pages[0].sections.find((s) => s.moduleId === "links.default");
    const resolved = linksSection?.config.resolvedData as Array<{ url: string; platform: string }>;
    // Hero social links only — the persisted affiliate row is invisible here.
    expect(resolved).toHaveLength(1);
    expect(resolved[0].url).toBe("https://youtube.com/@creator");
    expect(resolved.some((r) => r.url.includes("gear.example.com"))).toBe(false);

    // The affiliate section is independently populated.
    const affSection = doc.pages[0].sections.find((s) => s.moduleId === "affiliateLinks.default");
    expect((affSection?.config.resolvedData as unknown[]).length).toBe(1);
  });

  it("resolves an empty affiliateLinks section when the aggregate has no links", () => {
    const snap = snapshotWith([], [{ moduleId: "affiliateLinks.default", id: "s-aff" }]);
    const doc = engine.resolve(snap);
    const section = doc.pages[0].sections.find((s) => s.moduleId === "affiliateLinks.default");
    expect((section?.config.resolvedData as unknown[]).length).toBe(0);
    expect(section?.config.hasContent).toBe(false);
  });

  it("registers affiliateLinks.default as a links-category builtin with a renderer", () => {
    registerBuiltinComponents();
    const def = componentRegistry.get("affiliateLinks.default");
    expect(def).toBeDefined();
    expect(def?.type).toBe("affiliateLinks");
    expect(def?.category).toBe("links");
    expect(def?.name).toBe("Affiliate Links");
    expect(def?.renderer).toBeTypeOf("function");
  });

  it("safeUrl drops non-http(s) schemes so the storefront never opens them", () => {
    expect(safeUrl("https://gear.example.com/keeb")).toBe("https://gear.example.com/keeb");
    expect(safeUrl("http://gear.example.com/keeb")).toBe("http://gear.example.com/keeb");
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
    expect(safeUrl("")).toBe("");
    expect(safeUrl("  https://gear.example.com/keeb  ")).toBe("https://gear.example.com/keeb");
  });
});
