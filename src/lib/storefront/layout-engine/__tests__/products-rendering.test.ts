// ── Product Rendering — RCCF-LAUNCH-POLISH-06 (Phase 2)
// The storefront product card renders name, description, price, image and CTA.
// Description comes from the canonical product.description (composed by the
// LayoutEngine into resolvedData) — never a placeholder or a duplicated field.

import { describe, it, expect } from "vitest";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import type { PublishedSnapshot, WebsiteAggregate } from "@/types/snapshot";

function product(overrides: Partial<{ name: string; description: string | null; price: number }>) {
  return {
    id: "p1",
    name: overrides.name ?? "Test Product",
    description: overrides.description ?? null,
    price: overrides.price ?? 1999,
    imageUrl: null,
    images: [],
    slug: "test-product",
    isFeatured: false,
    isActive: true,
  };
}

function snapshot(content: Pick<WebsiteAggregate, "products">): PublishedSnapshot {
  const aggregate = {
    identity: { name: "Test", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
    hero: { title: "", imageUrl: null, posterUrl: null } as WebsiteAggregate["hero"],
    seo: { title: "", description: "" },
    products: content.products,
    gallery: [],
    links: [],
    testimonials: [],
    faq: [],
    timeline: [],
    games: [],
    contentFeed: [],
    courses: [],
    services: [],
  } as unknown as WebsiteAggregate;
  return {
    _schema: "creatorstore.snapshot",
    _version: 1,
    metadata: { version: 1, publishedAt: new Date().toISOString(), previousVersion: null, correlationId: "test", generatedBy: "dashboard" },
    content: aggregate,
    theme: {
      packageId: "com.creatos.neon-dark",
      colors: { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa" },
      typography: { heading: "Inter", body: "Inter" },
    },
    layout: {
      pages: [{
        id: "p", name: "Home", slug: "/", isHome: true, order: 0,
        sections: [{
          id: "s1", moduleId: "products.grid", order: 1, visible: true,
          config: { presentation: { titleOverride: "Menu" } },
        }],
      }],
    },
    navigation: [],
    renderingHints: {},
  };
}

describe("LayoutEngine product composition (Phase 2)", () => {
  it("carries the canonical product description into the resolved card data", () => {
    const doc = layoutEngine.resolve(snapshot({
      identity: { name: "A" },
      products: [product({ name: "Cup", description: "Hand-made ceramic cup." })],
    } as unknown as WebsiteAggregate));
    const products = doc.pages[0]!.sections[0]!.config.resolvedData as Record<string, unknown>[];
    expect(products[0]).toMatchObject({ name: "Cup", description: "Hand-made ceramic cup.", price: 1999 });
  });

  it("keeps the presentation title override (canonical ids unchanged)", () => {
    const doc = layoutEngine.resolve(snapshot({
      identity: { name: "A" },
      products: [product({ name: "Cup" })],
    } as unknown as WebsiteAggregate));
    const section = doc.pages[0]!.sections[0]!;
    expect(section.moduleId).toBe("products.grid");
    expect(section.config.resolvedTitle).toBe("Menu");
  });
});
