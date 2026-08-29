import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { THEME_EXPERIENCES } from "@/modules/theme/runtime/experience/theme-experience";
import { ExperienceSection } from "@/modules/theme/runtime/experience/section-runtime";
import { PageExperience, PageExperienceBackground } from "@/modules/theme/runtime/experience/page-background-runtime";
import { buildRuntimeSnapshot, EMPTY_AGGREGATE } from "@/lib/storefront/build-snapshot";
import { layoutEngine } from "@/lib/storefront/layout-engine/LayoutEngine";
import type { BuilderPage } from "@/lib/builder/types";
import React from "react";

function read(p: string) {
  return readFileSync(resolve(p), "utf8");
}

const eightSectionPages: BuilderPage[] = [
  {
    id: "p1",
    name: "Home",
    slug: "/",
    order: 0,
    isHome: true,
    theme: "",
    metadata: {},
    sections: [
      { id: "s-hero", name: "Hero", order: 0, visible: true, locked: false, slots: [{ id: "slot-hero", moduleId: "hero.default" as any, parentId: "s-hero", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
      { id: "s-products", name: "Products", order: 1, visible: true, locked: false, slots: [{ id: "slot-products", moduleId: "products.grid" as any, parentId: "s-products", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
      { id: "s-gallery", name: "Gallery", order: 2, visible: true, locked: false, slots: [{ id: "slot-gallery", moduleId: "gallery.grid" as any, parentId: "s-gallery", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
      { id: "s-timeline", name: "Timeline", order: 3, visible: true, locked: false, slots: [{ id: "slot-timeline", moduleId: "timeline.default" as any, parentId: "s-timeline", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
      { id: "s-testimonials", name: "Testimonials", order: 4, visible: true, locked: false, slots: [{ id: "slot-testimonials", moduleId: "testimonials.default" as any, parentId: "s-testimonials", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
      { id: "s-faq", name: "FAQ", order: 5, visible: true, locked: false, slots: [{ id: "slot-faq", moduleId: "faq.default" as any, parentId: "s-faq", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
      { id: "s-contact", name: "Contact", order: 6, visible: true, locked: false, slots: [{ id: "slot-contact", moduleId: "contact.default" as any, parentId: "s-contact", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
      { id: "s-footer", name: "Footer", order: 7, visible: true, locked: false, slots: [{ id: "slot-footer", moduleId: "footer.default" as any, parentId: "s-footer", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
    ],
  },
];

describe("RCCF-BUILDER-06D — Continuous Page Composition & Background Ownership", () => {
  it("1. Page background is rendered once via PageExperience", () => {
    const src = read("src/modules/theme/runtime/experience/page-background-runtime.tsx");
    expect(src).toContain("PageExperienceBackground");
    expect(src).toContain("PageExperience");
    expect(src).toContain('data-testid="page-experience-background"');
    expect(src).toContain('aria-hidden');
    expect(src).toContain("pointer-events-none");
    // Page owns background + decoration once — not per section
    expect(src).toContain("ExperienceBackground");
    expect(src).toContain("DecorationLayer");

    const exp = THEME_EXPERIENCES.aurora;
    const html = renderToStaticMarkup(
      React.createElement(PageExperience, { experience: exp }, React.createElement("div", null, "content")),
    );
    // Exactly one page-experience-background
    const count = (html.match(/page-experience-background/g) || []).length;
    expect(count).toBe(1);
    expect(html).toContain('data-testid="page-experience"');
  });

  it("2. ExperienceSection does not duplicate page background for shared/bleed flows", () => {
    const src = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(src).toContain("shouldRenderBackground");
    expect(src).toContain("isIsolated");
    expect(src).toContain("shouldRenderDecoration");

    // Render shared section — should NOT contain page background markers
    const exp = THEME_EXPERIENCES.minimal; // defaultFlow shared
    const sharedHtml = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: exp, index: 0, variant: "default" }, React.createElement("div", null, "inner")),
    );
    // Shared: no per-section background repaint (ExperienceBackground absolute not present)
    // ExperienceBackground for solid/minimal returns Layers only (glow/pattern) but we made it conditional on isIsolated
    // For minimal.shared, isIsolated false → no ExperienceBackground rendered
    expect(sharedHtml).not.toContain("pointer-events-none absolute inset-0");

    // Brutalist isolated should still paint its own background
    const brutal = THEME_EXPERIENCES.brutalist;
    const isolatedHtml = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: brutal, index: 0, variant: "default", flow: "isolated" as any }, React.createElement("div", null, "inner")),
    );
    expect(isolatedHtml).toContain("pointer-events-none absolute inset-0");
  });

  it("3. Shared sections remain transparent (no surface class)", () => {
    const exp = THEME_EXPERIENCES.minimal;
    const html = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: exp, index: 1, variant: "default" }, React.createElement("div", null, "shared")),
    );
    // minimal + shared → useSurface false → no xp-surface-* class
    expect(html).not.toContain("xp-surface-");
    // also no alternate surface for shared (only isolated)
    expect(html).not.toContain("bg-white/[0.015]");
  });

  it("4. Bleed sections preserve continuous background (no per-section background)", () => {
    const exp = THEME_EXPERIENCES.aurora; // defaultFlow bleed
    const html = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: exp, index: 1, variant: "default", flow: "bleed" as any }, React.createElement("div", null, "bleed")),
    );
    expect(html).not.toContain("pointer-events-none absolute inset-0");
    expect(html).not.toContain("xp-surface-");
  });

  it("5. SoftSeparator does not create a hard border (h-px white/[0.06])", () => {
    const exp = THEME_EXPERIENCES.luxury;
    const htmlSoft = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: exp, index: 1, variant: "default", flow: "softSeparator" as any }, React.createElement("div", null, "soft")),
    );
    // softSeparator → effectiveDivider soft → renders h-12 soft gradient, not h-px fade
    expect(htmlSoft).toContain("h-12");
    expect(htmlSoft).not.toContain("h-px");

    // shared/bleed should have no divider at all
    const htmlShared = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: exp, index: 1, variant: "default", flow: "shared" as any }, React.createElement("div", null, "shared")),
    );
    expect(htmlShared).not.toContain("h-px");
    expect(htmlShared).not.toContain("h-12");
  });

  it("6. Overlap remains bounded (clamp + no arbitrary negative margins)", () => {
    const src = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(src).toContain("clamp(-2rem");
    expect(src).not.toContain("mt-[-123px]");
    expect(src).not.toContain("-100px");
    const exp = THEME_EXPERIENCES.creator;
    const html = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: exp, index: 2, variant: "default", flow: "overlap" as any }, React.createElement("div", null, "overlap")),
    );
    expect(html).toContain("clamp(-2rem");
  });

  it("7. fullBleed does not introduce horizontal overflow (no w-screen, no overflow-x-hidden hack)", () => {
    const sec = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(sec).not.toContain("w-screen");
    expect(sec).not.toContain("100vw");
    expect(sec).not.toContain("overflow-x-hidden");
    // fullBleed uses w-full only
    expect(sec).toContain('w-full');
    const layout = read("src/lib/storefront/layout-engine/LayoutEngine.ts");
    expect(layout).not.toContain("overflow-x-hidden");
  });

  it("8. Eight-section rich fixture renders without repeated page backgrounds", () => {
    const exp = THEME_EXPERIENCES.aurora;
    // Build snapshot like production
    const snap = buildRuntimeSnapshot({
      websiteId: "w-06d",
      correlationId: "test-06d",
      builderPages: eightSectionPages,
      aggregate: EMPTY_AGGREGATE,
      navItems: [],
      themePackageId: "com.creatos.streaming-purple",
      themeColors: {},
      themeFonts: {},
      themeConfig: {},
      experience: exp,
    });
    const doc = layoutEngine.resolve(snap);
    expect(doc.pages[0].sections.length).toBe(8);

    // Render PageExperience + 8 ExperienceSections → only one page background
    const sections = doc.pages[0].sections;
    const pageHtml = renderToStaticMarkup(
      React.createElement(
        PageExperience,
        { experience: exp },
        ...sections.map((s, i) =>
          React.createElement(ExperienceSection, {
            key: s.id,
            experience: exp,
            index: i,
            variant: i === 0 ? "hero" : i === 7 ? "footer" : "default",
            flow: (doc.renderingHints.flow as any)?.[s.id] as any,
          }, React.createElement("div", null, s.id)),
        ),
      ),
    );
    const bgCount = (pageHtml.match(/page-experience-background/g) || []).length;
    expect(bgCount).toBe(1);
    // Sections with bleed (aurora default) should not add per-section backgrounds
    // Only page background exists, not 8 repeats
    expect(pageHtml).not.toMatch(/ExperienceBackground.*ExperienceBackground.*ExperienceBackground/s);
  });

  it("9. Brutalist intentional isolation remains supported", () => {
    expect(THEME_EXPERIENCES.brutalist.defaultFlow).toBe("isolated");
    const brutal = THEME_EXPERIENCES.brutalist;
    const html = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: brutal, index: 0, variant: "default" }, React.createElement("div", null, "brutal")),
    );
    // isolated → should render background and allow surface/decoration
    expect(html).toContain("pointer-events-none absolute inset-0");
    // brutalist divider is none per pack → no hard border still, but surface isolation allowed
    expect(brutal.divider).toBe("none");
    expect(brutal.surface).toBe("flat");
  });

  it("10. Builder/Preview/Published runtime contracts remain unchanged (single pipeline)", () => {
    const storefront = read("src/components/storefront/StorefrontPage.tsx");
    expect(storefront).toContain("PageExperience");
    expect(storefront).toContain("layoutEngine.resolve");
    expect(storefront).toContain("ExperienceSection");
    expect(storefront).toContain("buildRuntimeSnapshot");
    expect(storefront).not.toContain("secondResolver");

    const canvas = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(canvas).toContain("PageExperience");
    expect(canvas).toContain("ExperienceSection");
    expect(canvas).toContain("layoutEngine.resolve");
    expect(canvas).toContain("experienceRegistry.resolve");
    expect(canvas).toContain("applyExperienceOverride");
    expect(canvas).toContain("resolveExperienceForCapabilities");

    // Storefront still uses builderPagesToLayoutSnapshot + themeResolver + renderingHints.flow
    const snapSrc = read("src/lib/storefront/build-snapshot.ts");
    expect(snapSrc).toContain("renderingHints");
    expect(snapSrc).toContain("flowHints");
    expect(snapSrc).toContain("defaultFlow");
  });

  it("decorative layers remain aria-hidden pointer-events-none and respect flow", () => {
    const pageSrc = read("src/modules/theme/runtime/experience/page-background-runtime.tsx");
    expect(pageSrc).toContain('aria-hidden');
    expect(pageSrc).toContain('pointer-events-none');

    const secSrc = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    // per-section decoration only for isolated, and page decoration always aria-hidden
    expect(secSrc).toContain('aria-hidden');
  });

  it("theme family defaultFlow semantics preserved (10 families)", () => {
    expect(THEME_EXPERIENCES.minimal.defaultFlow).toBe("shared");
    expect(THEME_EXPERIENCES.editorial.defaultFlow).toBe("shared");
    expect(THEME_EXPERIENCES.executive.defaultFlow).toBe("shared");
    expect(THEME_EXPERIENCES.creator.defaultFlow).toBe("shared");
    expect(THEME_EXPERIENCES.glass.defaultFlow).toBe("shared");
    expect(THEME_EXPERIENCES.aurora.defaultFlow).toBe("bleed");
    expect(THEME_EXPERIENCES.luxury.defaultFlow).toBe("bleed");
    expect(THEME_EXPERIENCES.cyber.defaultFlow).toBe("bleed");
    expect(THEME_EXPERIENCES.midnight.defaultFlow).toBe("bleed");
    expect(THEME_EXPERIENCES.brutalist.defaultFlow).toBe("isolated");
  });
});
