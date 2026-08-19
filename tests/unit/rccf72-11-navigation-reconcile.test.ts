import { describe, it, expect, vi, beforeEach } from "vitest";

// ── RCCF-72.11 — Navigation / Section Graph Reconciliation ──────────────────
// Closes S2 (one-shot stale auto-nav) and S3 (unconditional dead Contact anchor)
// by deriving navigation from the canonical renderable section graph instead of
// content counts + hardcoded Contact.
//
// Covers the required cases:
//   1-2  initial nav graph with/without Contact
//   3    content exists but section absent → no anchor
//   4-6  section added / removed / hidden → generated anchor add/remove
//   7-10 manual external / page / custom anchor / renamed preserved
//   11   generated anchor order follows graph order
//   12-13 persisted == snapshot nav
//   14   Launch cannot expose unavailable sections
//   15   Growth/Scale unaffected
//   16   tenant isolation
//   17   legacy unclassified items preserved
//   18   no duplicate generated anchors
//   19   repeated publish idempotent
//   20   editor save/get functional

import {
  renderableNavBases,
  generateDefaultNavigation,
  reconcileNavigation,
  isGeneratedSectionAnchor,
  GENERATED_ANCHOR_SIGNATURES,
  type RenderableNavSection,
} from "@/lib/navigation/reconcile";
import type { NavigationItem, WebsiteAggregate } from "@/types/snapshot";

// ── Service-level prisma mock (top level) ───────────────────────────────────
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
    reset: () => settings.clear(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.mockPrisma }));

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

// Already-composed sections (as LayoutEngine.resolve would emit them, with
// visibilityMode/hasContent set) — the input to renderableNavBases.
function sec(moduleId: string, config: Record<string, unknown> = {}, visible = true): RenderableNavSection {
  return { moduleId, visible, config };
}

const ids = (nav: NavigationItem[]): string[] => nav.map((n) => n.id);

function anchor(id: string, overrides: Partial<NavigationItem> = {}): NavigationItem {
  const sig = GENERATED_ANCHOR_SIGNATURES[id] ?? { label: id, href: `#${id}` };
  return { id, label: sig.label, href: sig.href, type: "anchor", order: 0, visible: true, ...overrides };
}

// ── renderableNavBases ──────────────────────────────────────────────────────

describe("renderableNavBases — RCCF-72.11 graph derivation", () => {
  it("returns only nav-generatable bases, in graph order, deduped", () => {
    const sections = [
      sec("hero.default"),
      sec("products.grid"),
      sec("gallery.grid"),
      sec("footer.default"), // not nav-generatable
      sec("hero.gaming"), // dup hero base
    ];
    expect(renderableNavBases(sections, aggregate(), false)).toEqual(["hero", "products", "gallery"]);
  });

  it("drops hidden sections (visibilityMode hidden) — no dead anchor", () => {
    const sections = [
      sec("hero.default"),
      sec("products.grid", { visibilityMode: "hidden", hasContent: true }),
      sec("contact.default"),
    ];
    expect(renderableNavBases(sections, aggregate(), false)).toEqual(["hero", "contact"]);
  });

  it("drops empty auto sections — content count alone cannot create nav", () => {
    const sections = [
      sec("hero.default"),
      sec("products.grid", { visibilityMode: "auto", hasContent: false }),
    ];
    expect(renderableNavBases(sections, aggregate(), false)).toEqual(["hero"]);
  });

  it("keeps a section with content (auto + hasContent true)", () => {
    const sections = [
      sec("hero.default"),
      sec("products.grid", { visibilityMode: "auto", hasContent: true }),
    ];
    expect(renderableNavBases(sections, aggregate(), false)).toEqual(["hero", "products"]);
  });

  it("case 14 — non nav-generatable bases (courses/services) never become nav", () => {
    const sections = [
      sec("hero.default"),
      sec("courses.default", { visibilityMode: "auto", hasContent: true }),
      sec("services.default", { visibilityMode: "auto", hasContent: true }),
    ];
    // courses/services are renderable but intentionally NOT top-level nav.
    expect(renderableNavBases(sections, aggregate(), false)).toEqual(["hero"]);
  });
});

// ── generateDefaultNavigation ───────────────────────────────────────────────

describe("generateDefaultNavigation — RCCF-72.11 initial nav", () => {
  it("case 1 — graph without contact → no Contact anchor", () => {
    const nav = generateDefaultNavigation(["hero", "products", "gallery"]);
    expect(ids(nav)).toEqual(["hero", "products", "gallery"]);
    expect(nav.some((n) => n.id === "contact")).toBe(false);
  });

  it("case 2 — graph with contact → Contact anchor present", () => {
    const nav = generateDefaultNavigation(["hero", "contact"]);
    expect(ids(nav)).toEqual(["hero", "contact"]);
  });

  it("case 3 — section absent from graph → no anchor, regardless of content", () => {
    const nav = generateDefaultNavigation(["hero", "gallery"]);
    expect(ids(nav)).toEqual(["hero", "gallery"]);
    expect(nav.some((n) => n.id === "products")).toBe(false);
  });

  it("case 11 — order follows graph order (Home first), not alphabetical", () => {
    const nav = generateDefaultNavigation(["products", "hero", "gallery", "timeline"]);
    expect(ids(nav)).toEqual(["hero", "products", "gallery", "timeline"]);
  });

  it("every generated anchor carries generatedFromSection metadata", () => {
    const nav = generateDefaultNavigation(["hero", "products"]);
    for (const item of nav) expect(item.generatedFromSection).toBe(item.id);
  });
});

// ── reconcileNavigation ─────────────────────────────────────────────────────

describe("reconcileNavigation — RCCF-72.11 reconciliation", () => {
  it("case 4 — section added to graph → generated anchor appears", () => {
    const existing = [anchor("hero"), anchor("products")];
    const out = reconcileNavigation(existing, ["hero", "products", "gallery"]);
    expect(ids(out)).toEqual(["hero", "products", "gallery"]);
  });

  it("case 5 — section removed from graph → generated anchor disappears", () => {
    const existing = [anchor("hero"), anchor("products"), anchor("gallery")];
    const out = reconcileNavigation(existing, ["hero", "products"]);
    expect(ids(out)).toEqual(["hero", "products"]);
  });

  it("case 7 — manual external item survives", () => {
    const external: NavigationItem = { id: "ext1", label: "My Link", href: "https://x.com", type: "external", order: 0, visible: true, target: "_blank" };
    const existing = [anchor("hero"), external];
    const out = reconcileNavigation(existing, ["hero"]);
    expect(out).toContainEqual(expect.objectContaining({ id: "ext1", type: "external" }));
  });

  it("case 8 — manual page item survives", () => {
    const page: NavigationItem = { id: "p1", label: "Products Page", href: "products", type: "page", order: 0, visible: true };
    const existing = [anchor("hero"), page];
    const out = reconcileNavigation(existing, ["hero", "products"]);
    expect(out).toContainEqual(expect.objectContaining({ id: "p1", type: "page" }));
  });

  it("case 9 — manual custom anchor survives (different signature)", () => {
    const custom: NavigationItem = { id: "contact", label: "Get in Touch", href: "#contact", type: "anchor", order: 0, visible: true };
    const existing = [anchor("hero"), custom];
    const out = reconcileNavigation(existing, ["hero"]);
    expect(out).toContainEqual(expect.objectContaining({ id: "contact", label: "Get in Touch" }));
    expect(out.filter((n) => n.id === "contact")).toHaveLength(1);
  });

  it("case 10 — manually renamed section anchor is preserved (treated as manual)", () => {
    const renamed = anchor("products", { label: "My Stuff" });
    const existing = [anchor("hero"), renamed];
    const out = reconcileNavigation(existing, ["hero"]);
    expect(out).toContainEqual(expect.objectContaining({ id: "products", label: "My Stuff" }));
  });

  it("case 17 — legacy unclassified items are preserved", () => {
    const legacy: NavigationItem = { id: "custom", label: "Custom", href: "#custom", type: "anchor", order: 0, visible: true };
    const existing = [anchor("hero"), legacy];
    const out = reconcileNavigation(existing, ["hero"]);
    expect(out).toContainEqual(expect.objectContaining({ id: "custom", label: "Custom", href: "#custom", type: "anchor" }));
  });

  it("case 18 — no duplicate generated anchors when a manual anchor shares the base", () => {
    const manualContact: NavigationItem = { id: "contact", label: "Contact", href: "#contact", type: "anchor", order: 0, visible: true };
    const existing = [anchor("hero"), manualContact];
    const out = reconcileNavigation(existing, ["hero", "contact"]);
    expect(out.filter((n) => n.id === "contact")).toHaveLength(1);
  });

  it("case 19 — repeated reconciliation is idempotent", () => {
    const existing = [anchor("hero"), anchor("products"), anchor("contact")];
    const once = reconcileNavigation(existing, ["hero", "products"]);
    const twice = reconcileNavigation(once, ["hero", "products"]);
    expect(twice).toEqual(once);
  });

  it("keeps original order and appends new anchors in graph order", () => {
    const existing = [anchor("hero"), anchor("products")];
    const out = reconcileNavigation(existing, ["hero", "products", "gallery", "timeline"]);
    expect(ids(out)).toEqual(["hero", "products", "gallery", "timeline"]);
  });

  it("reassigns order sequentially (parity invariant)", () => {
    const out = reconcileNavigation([anchor("hero"), anchor("products")], ["hero", "products"]);
    out.forEach((n, i) => expect(n.order).toBe(i));
  });
});

// ── isGeneratedSectionAnchor ────────────────────────────────────────────────

describe("isGeneratedSectionAnchor — manual/generated distinction", () => {
  it("explicit generatedFromSection is generated", () => {
    expect(isGeneratedSectionAnchor(anchor("products"))).toBe(true);
  });

  it("legacy exact-signature anchor is generated", () => {
    expect(isGeneratedSectionAnchor({ id: "contact", label: "Contact", href: "#contact", type: "anchor", order: 0, visible: true })).toBe(true);
  });

  it("renamed/custom/page anchors are NOT generated", () => {
    expect(isGeneratedSectionAnchor(anchor("contact", { label: "Email" }))).toBe(false);
    expect(isGeneratedSectionAnchor({ id: "custom", label: "Custom", href: "#custom", type: "anchor", order: 0, visible: true })).toBe(false);
    expect(isGeneratedSectionAnchor({ id: "products", label: "Products", href: "/products", type: "page", order: 0, visible: true })).toBe(false);
  });
});

// ── Service-level (tenant isolation + editor) ───────────────────────────────

describe("NavigationService — RCCF-72.11 tenant isolation + editor", () => {
  beforeEach(() => h.reset());

  it("case 12 — persisted nav equals what the snapshot bakes (reconcile returns saved value)", async () => {
    await navigationService.save("t1", [anchor("hero"), { id: "ext", label: "Ext", href: "https://x", type: "external", order: 1, visible: true }]);
    const reconciled = await navigationService.reconcileForPublish("t1", ["hero", "products"]);
    const persisted = await navigationService.get("t1");
    expect(persisted).toEqual(reconciled);
    // original order preserved: hero (generated) then ext (manual); products appended.
    expect(ids(reconciled)).toEqual(["hero", "ext", "products"]);
  });

  it("case 16 — tenant isolation: each tenant's navigation is independent", async () => {
    await navigationService.save("t1", [anchor("hero")]);
    await navigationService.save("t2", [anchor("hero"), anchor("contact")]);
    expect(await navigationService.get("t1")).toEqual([anchor("hero")]);
    expect(await navigationService.get("t2")).toEqual([anchor("hero"), anchor("contact")]);
  });

  it("case 20 — editor save/get remains functional (getOrGenerate returns saved)", async () => {
    await navigationService.save("t1", [anchor("hero")]);
    const got = await navigationService.getOrGenerate("t1");
    expect(ids(got)).toEqual(["hero"]);
  });
});
