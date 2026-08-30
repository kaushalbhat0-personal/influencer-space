import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  reconcileNavigation,
  renderableNavBases,
  GENERATED_ANCHOR_SIGNATURES,
  type RenderableNavSection,
} from "@/lib/navigation/reconcile";
import type { NavigationItem, WebsiteAggregate } from "@/types/snapshot";

// ── Service-level prisma mock ──────────────────────────────────────────
const h = vi.hoisted(() => {
  const settings = new Map<string, NavigationItem[]>();
  return {
    mockPrisma: {
      setting: {
        findUnique: vi.fn(async ({ where }: { where: { tenantId_key: { tenantId: string } } }) => {
          const v = settings.get(where.tenantId_key.tenantId);
          return v ? { value: JSON.parse(JSON.stringify(v)) } : null;
        }),
        upsert: vi.fn(async ({ where, update, create }: { where: { tenantId_key: { tenantId: string } }; update: { value: NavigationItem[] }; create: { tenantId: string; value: NavigationItem[] } }) => {
          const tenantId = where.tenantId_key.tenantId;
          settings.set(tenantId, JSON.parse(JSON.stringify((update?.value ?? create.value) as NavigationItem[])));
        }),
      },
    },
    settings,
    reset: () => settings.clear(),
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: h.mockPrisma }));
// Goals runtime mock — preview graph derivation needs it
vi.mock("@/modules/goals-runtime", () => ({
  goalProfileService: { getProfile: vi.fn(async () => null) },
}));

import { navigationService } from "@/lib/navigation/service";

function aggregate(): WebsiteAggregate {
  return {
    identity: { name: "C", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
    hero: { title: "Hi", subtitle: "", description: "" },
    products: [],
    gallery: [],
    links: [],
    seo: { title: "", description: "" },
    testimonials: [],
    faq: [],
    timeline: [],
    games: [],
    contentFeed: [],
    courses: [],
    services: [],
  };
}

function sec(moduleId: string, config: Record<string, unknown> = {}, visible = true): RenderableNavSection {
  return { moduleId, visible, config };
}
const ids = (nav: NavigationItem[]): string[] => nav.map((n) => n.id);
function anchor(id: string, overrides: Partial<NavigationItem> = {}): NavigationItem {
  const sig = GENERATED_ANCHOR_SIGNATURES[id] ?? { label: id, href: `#${id}` };
  return { id, label: sig.label, href: sig.href, type: "anchor", order: 0, visible: true, generatedFromSection: id, ...overrides };
}

// ── RCCF-08 Preview Parity ─────────────────────────────────────────────

describe("RCCF-08 — Preview navigation parity", () => {
  beforeEach(() => h.reset());

  it("Test 1 — removed section: draft with no Contact → preview has no Contact", () => {
    const persisted: NavigationItem[] = [anchor("hero"), anchor("products"), anchor("contact")];
    const graphBases = ["hero", "products", "gallery"]; // contact removed
    const preview = reconcileNavigation(persisted, graphBases);
    expect(preview.some((n) => n.id === "contact")).toBe(false);
    expect(ids(preview)).toEqual(["hero", "products", "gallery"]);
  });

  it("Test 2 — added section: draft adds Games → preview contains Games", () => {
    const persisted: NavigationItem[] = [anchor("hero"), anchor("products")];
    const graphBases = ["hero", "products", "games"];
    const preview = reconcileNavigation(persisted, graphBases);
    expect(preview.some((n) => n.id === "games")).toBe(true);
    expect(ids(preview)).toContain("games");
    // appended in graph order after existing
    expect(ids(preview)).toEqual(["hero", "products", "games"]);
  });

  it("Test 3 — no persistence: preview reconciliation must NOT mutate persisted Setting", async () => {
    const tenantId = "rccf08-preview-no-persist";
    const persisted: NavigationItem[] = [anchor("hero"), anchor("products"), anchor("contact")];
    await navigationService.save(tenantId, persisted);
    const before = await navigationService.get(tenantId);

    // Simulate preview reconciliation IN-MEMORY (same as storefront-loader.ts)
    const graphBases = ["hero", "products", "games"]; // draft removed Contact, added Games
    const previewNav = reconcileNavigation(before, graphBases);

    // Preview result correct
    expect(previewNav.some((n) => n.id === "contact")).toBe(false);
    expect(previewNav.some((n) => n.id === "games")).toBe(true);

    // Persisted unchanged — preview GET is side-effect free
    const after = await navigationService.get(tenantId);
    expect(after).toEqual(before);
    expect(after.some((n) => n.id === "contact")).toBe(true);
    expect(after.some((n) => n.id === "games")).toBe(false);

    // Pin: reconcileNavigation is pure — input array not mutated
    expect(before).toEqual(persisted);
  });

  it("Test 4 — publish/preview semantic parity: same graph → equivalent navigation", async () => {
    const tenantId = "rccf08-parity";
    const existing: NavigationItem[] = [anchor("hero"), anchor("products"), { id: "ext1", label: "Ext", href: "https://example.com", type: "external", order: 2, visible: true }];
    await navigationService.save(tenantId, existing);
    const graphBases = ["hero", "products", "gallery", "contact"];

    // Publish path: reconcileForPublish (persists)
    const publishNav = await navigationService.reconcileForPublish(tenantId, graphBases);

    // Reset to original persisted to simulate preview (preview does not persist)
    await navigationService.save(tenantId, existing);
    const persistedForPreview = await navigationService.get(tenantId);
    // Preview path: pure reconcileNavigation (no persist)
    const previewNav = reconcileNavigation(persistedForPreview, graphBases);

    // Must be equivalent (order, ids, hrefs)
    expect(ids(previewNav)).toEqual(ids(publishNav));
    expect(previewNav.map((n) => n.href)).toEqual(publishNav.map((n) => n.href));
    // Preview did not persist — persisted still the original
    const stillPersisted = await navigationService.get(tenantId);
    expect(stillPersisted).toEqual(existing);
  });

  it("Preview uses same renderableNavBases → reconcileNavigation chain as publish (derived graph)", () => {
    const sections = [sec("hero.default"), sec("products.grid"), sec("games.default", { visibilityMode: "auto", hasContent: true })];
    const bases = renderableNavBases(sections, aggregate(), false);
    expect(bases).toEqual(["hero", "products", "games"]);
    const persisted: NavigationItem[] = [anchor("hero"), anchor("products")];
    const preview = reconcileNavigation(persisted, bases);
    expect(ids(preview)).toEqual(["hero", "products", "games"]);
  });
});

// ── Navigation href integrity ──────────────────────────────────────────

describe("RCCF-08 — Navigation anchor href integrity", () => {
  it("every generated anchor receives href === '#<base>'", () => {
    for (const [base, sig] of Object.entries(GENERATED_ANCHOR_SIGNATURES)) {
      expect(sig.href).toBe(`#${base}`);
    }
    const graph = ["hero", "products", "gallery", "timeline", "contact", "games", "contentFeed", "links", "testimonials", "faq"];
    const nav = reconcileNavigation([], graph);
    for (const item of nav) {
      expect(item.type).toBe("anchor");
      expect(item.href).toBe(`#${item.id}`);
      expect(item.href.startsWith("#")).toBe(true);
    }
  });

  it("no generated anchor has undefined or null href", () => {
    const nav = reconcileNavigation([anchor("hero")], ["hero", "products", "gallery"]);
    for (const n of nav) {
      expect(n.href).toBeDefined();
      expect(n.href).not.toBeNull();
      expect(typeof n.href).toBe("string");
      expect(n.href.length).toBeGreaterThan(1);
    }
  });

  it("StorefrontNav renders anchor href natively (not undefined)", async () => {
    // Source-level guardrail — the bug was `href={isAnchor ? undefined : s.href}`
    const { readFileSync } = await import("fs");
    const src = readFileSync("src/components/storefront/StorefrontNav.tsx", "utf-8");
    // No occurrence of anchor href being set to undefined
    expect(src).not.toMatch(/href=\{isAnchor \? undefined/);
    expect(src).not.toMatch(/href=\{!isAnchor \? s\.href : undefined/);
    // Must use s.href for anchors
    expect(src).toContain("href={s.href}");
    // Must keep smooth-scroll onClick with preventDefault
    expect(src).toContain("e.preventDefault(); handleClick(s)");
  });
});

// ── Footer legal URLs ──────────────────────────────────────────────────

describe("RCCF-08 — Footer legal links platform-absolute", () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_APP_URL;
  beforeEach(() => {
    vi.resetModules();
  });

  it("FooterRenderer default legal links are platform-absolute, not tenant-relative", async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync("src/lib/registry/components/renderers.tsx", "utf-8");
    // Must use platformUrl helper, not hard-coded '/privacy' strings for defaults
    expect(src).toContain("platformUrl");
    expect(src).toContain("platformLegal");
    // Default Support column must not contain bare '/privacy' etc as literal alone — they are wrapped
    // via platformLegal("/privacy")
    expect(src).toContain('platformLegal("/privacy")');
    expect(src).toContain('platformLegal("/terms")');
    expect(src).toContain('platformLegal("/refund")');
    // Bottom bar also platform-absolute
    expect(src).toContain('href={platformLegal("/privacy")}');
    expect(src).toContain('href={platformLegal("/terms")}');
    expect(src).toContain('href={platformLegal("/refund")}');
  });

  it("FooterRenderer uses canonical platform config (NEXT_PUBLIC_APP_URL / getPlatformConfig), not hardcoded prod domain", async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync("src/lib/registry/components/renderers.tsx", "utf-8");
    expect(src).toContain("getPlatformConfig");
    expect(src).not.toMatch(/influencer-space-alpha\.vercel\.app.*\/privacy/);
    expect(src).not.toMatch(/creatorspace\.app.*\/privacy/);
    // Ensure the file imports from canonical location
    expect(src).toContain('from "@/lib/config/platform"');
  });

  it("storefront-loader preview reconciliation is in-memory and does not call save (source guardrail)", async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync("src/lib/storefront/storefront-loader.ts", "utf-8");
    // Preview branch must use reconcileNavigation directly, not reconcileForPublish
    expect(src).toContain("reconcileNavigation(persistedNav, graphBases)");
    // Must NOT persist in preview branch — check for actual service call
    const previewBlock = src.slice(src.indexOf("if (preview &&"), src.indexOf("// RCCF-02: published storefront is SNAPSHOT-ONLY"));
    expect(previewBlock).not.toContain("navigationService.reconcileForPublish");
    expect(previewBlock).not.toContain("await navigationService.save");
    // Preview loads persisted via get (not getOrGenerate) and reconciles purely
    expect(previewBlock).toContain("navigationService.get(");
    expect(previewBlock).not.toContain("navigationService.getOrGenerate");
  });
});

// ── RCCF-07 compatibility guardrails ───────────────────────────────────

describe("RCCF-08 — RCCF-07A footer ownership + 07C mobile nav preserved", () => {
  it("Footer still owned (footer_config), not Hero-derived", async () => {
    const { readFileSync } = await import("fs");
    const footerSrc = readFileSync("src/lib/storefront/layout-engine/LayoutEngine.ts", "utf-8");
    // Footer owned path: cast to { footer?: ... } then .footer — check for that pattern
    expect(footerSrc).toContain(".footer");
    expect(footerSrc).toContain("footer?.columns");
    expect(footerSrc).toContain("siteSocialLinks");
    // Hero CTA must not flow into footer branch
    const footerBranch = footerSrc.slice(footerSrc.indexOf('startsWith("footer.")'));
    expect(footerBranch).not.toContain("ctaText");
    // FooterRenderer still uses footerColumns owned config
    const rendSrc = readFileSync("src/lib/registry/components/renderers.tsx", "utf-8");
    expect(rendSrc).toContain("footerColumns");
  });

  it("Mobile nav architecture untouched (fixed, safe-area, 4+More, token)", async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync("src/components/storefront/StorefrontNav.tsx", "utf-8");
    expect(src).toContain("fixed bottom-0");
    expect(src).toContain("env(safe-area-inset-bottom)");
    expect(src).toContain("MAX_PRIMARY = 5");
    expect(src).toContain("More navigation options");
    expect(src).toContain("--mobile-nav-height");
  });
});
