// ── Section Presentation — Unit Tests ─────────────────────
// RCCF-LAUNCH-TRACK-04B. Covers the canonical resolver, hide-empty policy,
// category-default seeding, backward compatibility and the should-render decision.

import { describe, it, expect } from "vitest";
import {
  resolveSectionPresentation,
  sectionPresentationResolver,
  sectionHasContent,
  shouldRenderSection,
  isPermanentSection,
  applySectionPresets,
  presetFor,
  presetsFor,
  packIdFor,
  PERMANENT_SECTIONS,
} from "@/modules/section-presentation";

describe("SectionPresentationResolver (Phase 1)", () => {
  it("resolves title from override, else the canonical default", () => {
    const overridden = sectionPresentationResolver.resolve({ titleOverride: "Menu" }, "Products", "products.grid");
    expect(overridden.title).toBe("Menu");
    const canonical = sectionPresentationResolver.resolve(undefined, "Products", "products.grid");
    expect(canonical.title).toBe("Products");
  });

  it("resolves description from override only", () => {
    const r = sectionPresentationResolver.resolve({ descriptionOverride: "Fresh, local." }, null, "products.grid");
    expect(r.description).toBe("Fresh, local.");
    expect(resolveSectionPresentation(undefined, null, "products.grid").description).toBeNull();
  });

  it("resolves hideTitle and visible from override (defaults false/true)", () => {
    expect(sectionPresentationResolver.resolve({ hideTitle: true }, "X", "gallery.grid").hideTitle).toBe(true);
    expect(sectionPresentationResolver.resolve(undefined, "X", "gallery.grid").hideTitle).toBe(false);
    expect(sectionPresentationResolver.resolve({ visible: false }, "X", "gallery.grid").visible).toBe(false);
    expect(sectionPresentationResolver.resolve(undefined, "X", "gallery.grid").visible).toBe(true);
  });

  it("optional sections default to hide-when-empty (auto), permanent sections render always", () => {
    expect(resolveSectionPresentation(undefined, "Gallery", "gallery.grid").visibilityMode).toBe("auto");
    expect(resolveSectionPresentation(undefined, "Gallery", "hero.default").visibilityMode).toBe("always");
    expect(resolveSectionPresentation(undefined, "Get In Touch", "contact.default").visibilityMode).toBe("always");
  });

  it("permanent sections ignore hideWhenEmpty but respect an explicit visible=false", () => {
    const permanent = sectionPresentationResolver.resolve({ hideWhenEmpty: true }, "Hero", "hero.default");
    expect(permanent.visibilityMode).toBe("always");
    expect(permanent.hideWhenEmpty).toBe(false);
    const hidden = sectionPresentationResolver.resolve({ visible: false }, "Hero", "hero.default");
    expect(hidden.visibilityMode).toBe("hidden");
  });

  it("creator can force an optional section to always render or to hide when empty", () => {
    expect(sectionPresentationResolver.resolve({ hideWhenEmpty: false }, "Gallery", "gallery.grid").visibilityMode).toBe("always");
    expect(sectionPresentationResolver.resolve({ hideWhenEmpty: true }, "Gallery", "gallery.grid").visibilityMode).toBe("auto");
    expect(sectionPresentationResolver.resolve({ hideWhenEmpty: true }, "Hero", "hero.default").visibilityMode).toBe("always");
  });

  it("backward compatible: no overrides → identical defaults (zero migration)", () => {
    const r = resolveSectionPresentation(undefined, "Testimonials", "testimonials.default");
    expect(r).toEqual({
      title: "Testimonials",
      description: null,
      hideTitle: false,
      visible: true,
      hideWhenEmpty: true,
      visibilityMode: "auto",
    });
  });
});

describe("isPermanentSection + PERMANENT_SECTIONS (Phase 6)", () => {
  it("documents the canonical permanent list", () => {
    expect(PERMANENT_SECTIONS).toEqual(["hero", "footer", "navigation", "contact", "about"]);
  });

  it("classifies base ids correctly", () => {
    expect(isPermanentSection("hero.default")).toBe(true);
    expect(isPermanentSection("footer.default")).toBe(true);
    expect(isPermanentSection("contact.default")).toBe(true);
    expect(isPermanentSection("products.grid")).toBe(false);
  });
});

describe("sectionHasContent (Phase 5)", () => {
  it("products/gallery/timeline/testimonials/faq/games check their arrays", () => {
    expect(sectionHasContent("products", { products: [{ id: "1" }] })).toBe(true);
    expect(sectionHasContent("products", { products: [] })).toBe(false);
    expect(sectionHasContent("gallery", { gallery: [{ url: "x" }] })).toBe(true);
    expect(sectionHasContent("timeline", { timeline: [] })).toBe(false);
    expect(sectionHasContent("testimonials", { testimonials: [] })).toBe(false);
    expect(sectionHasContent("faq", { faq: [] })).toBe(false);
    expect(sectionHasContent("games", { games: [] })).toBe(false);
  });

  it("courses + content_feed read both courses and contentFeed", () => {
    expect(sectionHasContent("courses", { courses: [{ id: "c" }] })).toBe(true);
    expect(sectionHasContent("content_feed", { contentFeed: [{ id: "f" }] })).toBe(true);
    expect(sectionHasContent("courses", {})).toBe(false);
  });

  it("pricing reads plans/pricingPlans; contact/newsletter always have content", () => {
    expect(sectionHasContent("pricing", { plans: [{ name: "Pro" }] })).toBe(true);
    expect(sectionHasContent("pricing", { pricingPlans: [{ name: "Pro" }] })).toBe(true);
    expect(sectionHasContent("pricing", {})).toBe(false);
    expect(sectionHasContent("contact", {})).toBe(true);
    expect(sectionHasContent("newsletter", {})).toBe(true);
  });
});

describe("shouldRenderSection (Phase 5/10)", () => {
  it("hides explicitly-hidden sections", () => {
    expect(shouldRenderSection({ visibilityMode: "hidden" })).toBe(false);
  });

  it("hides empty auto sections, renders non-empty auto sections", () => {
    expect(shouldRenderSection({ visibilityMode: "auto", hasContent: false })).toBe(false);
    expect(shouldRenderSection({ visibilityMode: "auto", hasContent: true })).toBe(true);
  });

  it("always-renders always sections even when empty", () => {
    expect(shouldRenderSection({ visibilityMode: "always", hasContent: false })).toBe(true);
  });

  it("defaults to always when no decision is present", () => {
    expect(shouldRenderSection({})).toBe(true);
  });
});

describe("Category presets driven by knowledge packs (Phase 7)", () => {
  it("seeds the canonical industry mappings", () => {
    expect(presetFor("Restaurant", "products")?.titleOverride).toBe("Menu");
    expect(presetFor("Educator", "products")?.titleOverride).toBe("Courses");
    expect(presetFor("Fitness", "services")?.titleOverride).toBe("Programs");
    expect(presetFor("Photographer", "gallery")?.titleOverride).toBe("Portfolio");
    expect(presetFor("Photography", "gallery")?.titleOverride).toBe("Portfolio");
    expect(presetFor("Designer", "gallery")?.titleOverride).toBe("Case Studies");
    expect(presetFor("Creator", "products")?.titleOverride).toBe("Resources");
  });

  it("only ever seeds titleOverride", () => {
    for (const [category, base] of [["Restaurant", "products"], ["Designer", "gallery"], ["Creator", "products"]] as const) {
      const preset = presetFor(category, base);
      expect(Object.keys(preset ?? {})).toEqual(["titleOverride"]);
    }
  });

  it("unknown categories resolve to the default creator pack", () => {
    expect(packIdFor("default")).toBe("creator");
    expect(presetFor("something-unheard-of", "products")?.titleOverride).toBe("Resources");
  });

  it("presetsFor returns the full pack map", () => {
    expect(presetsFor("restaurant").products?.titleOverride).toBe("Menu");
    expect(Object.keys(presetsFor("creator"))).toContain("products");
  });
});

describe("applySectionPresets (Phase 7 seeding)", () => {
  it("merges titleOverride into slot config.presentation without touching canonical ids", () => {
    const slots: Array<{ baseId: string; config: Record<string, unknown> }> = [
      { baseId: "products", config: { columns: 3 } },
      { baseId: "faq", config: { columns: 2 } },
    ];
    applySectionPresets("Restaurant", slots);
    expect((slots[0]!.config.presentation as { titleOverride: string }).titleOverride).toBe("Menu");
    expect(slots[0]!.config.columns).toBe(3);
    expect(slots[1]!.config.presentation).toBeUndefined();
  });

  it("preserves an existing presentation and merges on top", () => {
    const slots = [{ baseId: "products", config: { presentation: { hideTitle: true } } }];
    applySectionPresets("Educator", slots);
    expect(slots[0]!.config.presentation).toEqual({ hideTitle: true, titleOverride: "Courses" });
  });
});
