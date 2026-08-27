import { describe, it, expect } from "vitest";
import { THEME_EXPERIENCES } from "@/modules/theme/runtime/experience/theme-experience";
import { buildRuntimeSnapshot } from "@/lib/storefront/build-snapshot";
import { layoutEngine } from "@/lib/storefront/layout-engine/LayoutEngine";
import { EMPTY_AGGREGATE } from "@/lib/storefront/build-snapshot";
import type { BuilderPage } from "@/lib/builder/types";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(p: string) { return readFileSync(resolve(p), "utf8"); }

describe("RCCF-BUILDER-05B — Continuous Section Composition", () => {
  it("legacy undefined flow defaults to shared (no migration)", () => {
    const minimal = THEME_EXPERIENCES.minimal;
    expect(minimal.defaultFlow).toBe("shared");
    // build snapshot with minimal experience and sections without explicit flow
    const pages: BuilderPage[] = [
      { id: "p1", name: "Home", slug: "/", order: 0, isHome: true, theme: "", metadata: {}, sections: [
        { id: "s1", name: "Hero", order: 0, visible: true, locked: false, slots: [{ id: "slot1", moduleId: "hero.default" as any, parentId: "s1", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
        { id: "s2", name: "Products", order: 1, visible: true, locked: false, slots: [{ id: "slot2", moduleId: "products.grid" as any, parentId: "s2", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
      ]},
    ];
    const snap = buildRuntimeSnapshot({
      websiteId: "w1", correlationId: "test", builderPages: pages, aggregate: EMPTY_AGGREGATE, navItems: [], themePackageId: "com.creatos.neon-dark", themeColors: {}, themeFonts: {}, themeConfig: {}, experience: minimal,
    });
    expect(snap.renderingHints.flow?.s1).toBe("shared");
    expect(snap.renderingHints.flow?.s2).toBe("shared");
    const doc = layoutEngine.resolve(snap);
    expect(doc.renderingHints.flow?.s1).toBe("shared");
    // no section disappearing
    expect(doc.pages[0].sections.length).toBe(2);
  });

  it("family defaults produce distinct flow per pack", () => {
    expect(THEME_EXPERIENCES.editorial.defaultFlow).toBe("shared");
    expect(THEME_EXPERIENCES.brutalist.defaultFlow).toBe("isolated");
    expect(THEME_EXPERIENCES.aurora.defaultFlow).toBe("bleed");
    expect(THEME_EXPERIENCES.luxury.defaultFlow).toBe("bleed");
    expect(THEME_EXPERIENCES.midnight.defaultFlow).toBe("bleed");
    expect(THEME_EXPERIENCES.glass.defaultFlow).toBe("shared");
  });

  it("per-section flow via THEME_EXPERIENCES sections (if configured) overrides defaultFlow", () => {
    // aurora has sections.hero with no flow override but heroBlend true — flow still default bleed
    const aurora = THEME_EXPERIENCES.aurora;
    expect(aurora.sections?.hero?.divider).toBe("none");
    // brutalist has isolated default, so hero also isolated
    expect(THEME_EXPERIENCES.brutalist.defaultFlow).toBe("isolated");
  });

  it("bleed and overlap are bounded and mobile-safe (no arbitrary negative margins)", () => {
    const src = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(src).toContain("clamp(-2rem");
    expect(src).toContain("shared");
    expect(src).toContain("bleed");
    expect(src).toContain("overlap");
    expect(src).toContain("softSeparator");
    expect(src).not.toContain("-100px");
    expect(src).not.toContain("100vw");
  });

  it("no horizontal overflow via w-screen hacks", () => {
    const sec = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(sec).not.toContain("w-screen");
    expect(sec).not.toContain("100vw");
    const layout = read("src/lib/storefront/layout-engine/LayoutEngine.ts");
    expect(layout).not.toContain("overflow-x-hidden");
  });

  it("surface ownership is flow-aware (shared/bleed no isolated card)", () => {
    const sec = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(sec).toContain("useSurface");
    expect(sec).toContain("isShared");
    expect(sec).toContain("isBleed");
    expect(sec).toContain("surfaceClass(surface)");
  });

  it("divider is flow-aware (shared/bleed none, softSeparator soft, isolated preserves)", () => {
    const sec = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(sec).toContain('isShared || isBleed ? "none"');
    expect(sec).toContain('isSoftSeparator ? "soft"');
  });

  it("preview/published parity via renderingHints.flow", () => {
    const snap = buildRuntimeSnapshot({
      websiteId: "w1", correlationId: "test2", builderPages: [
        { id: "p1", name: "Home", slug: "/", order: 0, isHome: true, theme: "", metadata: {}, sections: [
          { id: "s1", name: "Hero", order: 0, visible: true, locked: false, slots: [{ id: "slot1", moduleId: "hero.default" as any, parentId: "s1", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
        ]},
      ], aggregate: EMPTY_AGGREGATE, navItems: [], themePackageId: null, themeColors: {}, themeFonts: {}, themeConfig: {}, experience: THEME_EXPERIENCES.creator,
    });
    const doc = layoutEngine.resolve(snap);
    // same hints in snapshot and document
    expect(doc.renderingHints.flow?.s1).toBe(snap.renderingHints.flow?.s1);
  });

  it("no section disappears due to flow", () => {
    const pages: BuilderPage[] = [
      { id: "p1", name: "Home", slug: "/", order: 0, isHome: true, theme: "", metadata: {}, sections: [
        { id: "s1", name: "Hero", order: 0, visible: true, locked: false, slots: [{ id: "slot1", moduleId: "hero.default" as any, parentId: "s1", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
        { id: "s2", name: "FAQ", order: 1, visible: true, locked: false, slots: [{ id: "slot2", moduleId: "faq.default" as any, parentId: "s2", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
        { id: "s3", name: "Footer", order: 2, visible: true, locked: false, slots: [{ id: "slot3", moduleId: "footer.default" as any, parentId: "s3", order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} },
      ]},
    ];
    const snap = buildRuntimeSnapshot({ websiteId: "w1", correlationId: "t", builderPages: pages, aggregate: EMPTY_AGGREGATE, navItems: [], themePackageId: null, themeColors: {}, themeFonts: {}, experience: THEME_EXPERIENCES.editorial });
    const doc = layoutEngine.resolve(snap);
    expect(doc.pages[0].sections.length).toBe(3);
  });

  it("no second resolver introduced", () => {
    const expReg = read("src/modules/theme/runtime/experience/experience-registry.ts");
    // still single ExperienceRegistry.resolve, not duplicated
    expect((expReg.match(/class ExperienceRegistry/g) || []).length).toBe(1);
    const snap = read("src/lib/storefront/build-snapshot.ts");
    expect(snap).toContain("input.experience");
    expect(snap).not.toContain("secondResolver");
  });
});
