// ── Storefront Section Pipeline — Section Order Parity Tests ──
// RCCF-AUDIT-10. The live storefront must render sections in their PERSISTED
// order (Builder order == published snapshot order == live DOM). The pipeline
// filters (visible/hidden/empty) but NEVER reorders — even when a goal profile
// is present. These tests guard the regression where render-time goal section
// reordering broke Builder ↔ Storefront parity.

import { describe, it, expect } from "vitest";
import { resolveRenderableSections } from "@/lib/storefront/section-pipeline";
import type { WebsiteAggregate } from "@/types/snapshot";
import type { GoalProfile } from "@/modules/goals-runtime";

// ── Fixtures ──────────────────────────────────────────────

function aggregate(overrides?: Partial<WebsiteAggregate>): WebsiteAggregate {
  return {
    identity: { name: "Creator", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
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
    ...overrides,
  };
}

/** An aggregate with at least one item in every repeatable collection. */
function richAggregate(): WebsiteAggregate {
  return aggregate({
    products: [{ id: "p", name: "P", description: null, price: 1, imageUrl: null, images: [], slug: "p", isFeatured: false, isActive: true }],
    gallery: [{ id: "g", title: "G", description: null, imageUrl: "u", mediaType: "image", videoUrl: null, altText: null, isFeatured: false }],
    links: [{ id: "l", title: "L", url: "u", imageUrl: null }],
    testimonials: [{ id: "t", author: "A", role: null, content: "C", avatarUrl: null, rating: 5, featured: false, category: "general" }],
    faq: [{ id: "f", question: "Q", answer: "A", category: "general" }],
    timeline: [{ id: "m", year: 2026, title: "T", description: null, imageUrl: null, stats: null }],
    games: [{ id: "x", name: "X", logoUrl: null, description: null, genre: null }],
    contentFeed: [{ id: "c", platform: "youtube", mediaType: "video", url: "u", thumbnailUrl: null, caption: null, permalink: null }],
    courses: [{ id: "c", title: "C", description: null, price: 1, imageUrl: null, category: null }],
    services: [{ id: "s", title: "S", description: null, price: 1, duration: null }],
  });
}

/** The exact weighted profile test-creator-1 uses (see audit report). */
const creatorProfile: GoalProfile = {
  weights: [
    { goalId: "MONETIZE_CONTENT", weight: 39 },
    { goalId: "GROW_YOUTUBE", weight: 22 },
    { goalId: "SHOW_PORTFOLIO", weight: 22 },
    { goalId: "BUILD_EMAIL_LIST", weight: 17 },
  ],
  updatedAt: "2026-08-08T20:37:46.713Z",
  source: "recommended",
  entityType: "",
};

type Section = { id: string; moduleId: string; visible?: boolean; config: Record<string, unknown> };

const sec = (id: string, moduleId: string, config: Record<string, unknown> = {}, visible = true): Section => ({
  id, moduleId, config, visible,
});

const moduleIds = (sections: Section[]): string[] => sections.map((s) => s.moduleId);

// ── RCCF-AUDIT-10: ordering preservation ──────────────────

describe("resolveRenderableSections — RCCF-AUDIT-10 section order parity", () => {
  it("preserves the persisted order exactly with a goal profile present", () => {
    // test-creator-1's actual Builder/published-snapshot order.
    const persisted = [
      sec("h", "hero.default"),
      sec("p", "products.grid"),
      sec("g", "gallery.grid"),
      sec("sv", "services.default"),
      sec("co", "courses.default"),
      sec("te", "testimonials.default"),
      sec("f", "faq.default"),
      sec("ti", "timeline.default"),
      sec("ga", "games.default"),
      sec("l", "links.default"),
      sec("fo", "footer.default"),
    ];

    const out = resolveRenderableSections(persisted, { goalProfile: creatorProfile, aggregate: richAggregate() });

    // Order is byte-for-byte the persisted order — the goal profile must not
    // pull "links" up beside "products" or reorder anything else.
    expect(moduleIds(out)).toEqual([
      "hero.default",
      "products.grid",
      "gallery.grid",
      "services.default",
      "courses.default",
      "testimonials.default",
      "faq.default",
      "timeline.default",
      "games.default",
      "links.default",
      "footer.default",
    ]);
    // Explicitly guard the regression: before the fix "links" moved to position 3.
    expect(moduleIds(out)[2]).toBe("gallery.grid");
    expect(moduleIds(out)[3]).toBe("services.default");
  });

  it("preserves order without a goal profile", () => {
    const sections = [
      sec("h", "hero.default"),
      sec("p", "products.grid"),
      sec("g", "gallery.grid"),
      sec("te", "testimonials.default"),
      sec("fo", "footer.default"),
    ];
    const out = resolveRenderableSections(sections, { goalProfile: null, aggregate: richAggregate() });
    expect(moduleIds(out)).toEqual([
      "hero.default",
      "products.grid",
      "gallery.grid",
      "testimonials.default",
      "footer.default",
    ]);
  });

  it("keeps hero first and footer last when a middle section is hidden", () => {
    const sections = [
      sec("h", "hero.default"),
      sec("p", "products.grid"),
      sec("g", "gallery.grid"),
      sec("fo", "footer.default"),
    ];
    const out = resolveRenderableSections(sections, {
      goalProfile: creatorProfile,
      // gallery is empty → adaptive visibility hides it (conditional) with a profile.
      aggregate: aggregate({ products: richAggregate().products }),
    });
    expect(moduleIds(out)).toEqual(["hero.default", "products.grid", "footer.default"]);
  });

  it("drops sections explicitly marked not visible and preserves relative order", () => {
    const sections = [
      sec("h", "hero.default"),
      sec("p", "products.grid", {}, false),
      sec("g", "gallery.grid"),
      sec("fo", "footer.default"),
    ];
    const out = resolveRenderableSections(sections, { goalProfile: null, aggregate: richAggregate() });
    expect(moduleIds(out)).toEqual(["hero.default", "gallery.grid", "footer.default"]);
  });

  it("drops empty auto sections (section presentation) preserving relative order", () => {
    const sections = [
      sec("h", "hero.default"),
      sec("p", "products.grid", { visibilityMode: "auto", hasContent: false }),
      sec("g", "gallery.grid"),
      sec("fo", "footer.default"),
    ];
    const out = resolveRenderableSections(sections, { goalProfile: null, aggregate: richAggregate() });
    expect(moduleIds(out)).toEqual(["hero.default", "gallery.grid", "footer.default"]);
  });

  it("goal-adaptive visibility hides an empty conditional section only with a profile", () => {
    const sections = [
      sec("h", "hero.default"),
      // hasContent true so section presentation alone would keep it; only the
      // goal-adaptive layer (empty products) may drop it.
      sec("p", "products.grid", { visibilityMode: "auto", hasContent: true }),
      sec("fo", "footer.default"),
    ];
    const withProfile = resolveRenderableSections(sections, {
      goalProfile: creatorProfile,
      aggregate: aggregate(), // products empty
    });
    expect(moduleIds(withProfile)).toEqual(["hero.default", "footer.default"]);

    const withoutProfile = resolveRenderableSections(sections, {
      goalProfile: null,
      aggregate: aggregate(),
    });
    expect(moduleIds(withoutProfile)).toEqual(["hero.default", "products.grid", "footer.default"]);
  });

  it("is per-page: home filtering never changes an independent page's order", () => {
    // Mirrors the audit's multi-page requirement: /products keeps its own order.
    const homeSections = [
      sec("h", "hero.default"),
      sec("p", "products.grid", {}, false), // hidden on home
      sec("g", "gallery.grid"),
      sec("fo", "footer.default"),
    ];
    const productsSections = [
      sec("p0", "products.grid"),
      sec("p1", "links.default"),
    ];

    const home = resolveRenderableSections(homeSections, { goalProfile: creatorProfile, aggregate: richAggregate() });
    const products = resolveRenderableSections(productsSections, { goalProfile: creatorProfile, aggregate: richAggregate() });

    expect(moduleIds(home)).toEqual(["hero.default", "gallery.grid", "footer.default"]);
    // The independent /products page is unaffected by home's hidden/visible state.
    expect(moduleIds(products)).toEqual(["products.grid", "links.default"]);
  });
});
