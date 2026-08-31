// ── RCCF-71.3 — Hero Presentation ──────────────────────────────────────────
// Guardrails for the creator-controlled Hero presentation presets (text
// alignment, content width, overlay strength) that reach the CANONICAL runtime
// — Builder panel → updateTheme → Website.themeConfig → buildRuntimeSnapshot /
// canvas merge → snapshot.content.hero → HeroRenderer — identically in Builder
// canvas, the preview route, publish and the settings preview. Includes the
// background focal-point fix (B→A) and the frozen-surface guardrails: hero_data
// content ownership, schema version 1, optional-only snapshot fields, no plan
// strings in the client, no second Hero authority, no Prisma/billing changes.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildRuntimeSnapshot, EMPTY_AGGREGATE } from "@/lib/storefront/build-snapshot";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import {
  HERO_TEXT_ALIGN_VALUES,
  HERO_CONTENT_WIDTH_VALUES,
  HERO_OVERLAY_VALUES,
  HERO_TEXT_ALIGN_OPTIONS,
  HERO_CONTENT_WIDTH_OPTIONS,
  HERO_OVERLAY_OPTIONS,
  heroTextAlignClass,
  heroContentWidthClass,
  heroOverlayClass,
  applyHeroPresentation,
} from "@/lib/hero/presentation-options";

const repoRoot = resolve(process.cwd());

function read(file: string): string {
  return readFileSync(resolve(repoRoot, file), "utf8");
}

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    websiteId: "w1",
    correlationId: "c1",
    builderPages: [{ id: "p", name: "Home", slug: "/", order: 0, isHome: true, sections: [], theme: "default", metadata: {} }],
    aggregate: { ...EMPTY_AGGREGATE, hero: { title: "Hi", subtitle: "", description: "" } },
    navItems: [],
    themePackageId: "com.creatos.neon-dark",
    themeColors: {},
    themeFonts: {},
    ...overrides,
  };
}

function snapshotWithHeroSection(themeConfig: Record<string, string>) {
  return buildRuntimeSnapshot(
    baseInput({
      themeConfig,
      builderPages: [{
        id: "p",
        name: "Home",
        slug: "/",
        order: 0,
        isHome: true,
        theme: "default",
        metadata: {},
        sections: [{
          id: "sec-hero",
          name: "Hero",
          order: 0,
          visible: true,
          locked: false,
          metadata: {},
          slots: [{
            id: "s-hero",
            moduleId: "hero.default",
            parentId: "sec-hero",
            order: 0,
            visible: true,
            locked: false,
            config: {},
            metadata: {},
          }],
        }],
      }],
    }),
  );
}

// ── Priority 1: pure registry + merge rule ────────────────────────────────

describe("RCCF-71.3 — hero presentation option registry (single pure authority)", () => {
  it("the registry is the canonical source for the three presets", () => {
    expect(HERO_TEXT_ALIGN_OPTIONS.map((o) => o.value)).toEqual(["left", "center", "right"]);
    expect(HERO_CONTENT_WIDTH_OPTIONS.map((o) => o.value)).toEqual(["narrow", "medium", "wide"]);
    expect(HERO_OVERLAY_OPTIONS.map((o) => o.value)).toEqual(["none", "soft", "medium", "strong"]);
  });

  it("each registry exposes a Set of valid values for validation", () => {
    expect(HERO_TEXT_ALIGN_VALUES.has("left")).toBe(true);
    expect(HERO_TEXT_ALIGN_VALUES.has("sideways")).toBe(false);
    expect(HERO_CONTENT_WIDTH_VALUES.has("wide")).toBe(true);
    expect(HERO_CONTENT_WIDTH_VALUES.has("full")).toBe(false);
    expect(HERO_OVERLAY_VALUES.has("strong")).toBe(true);
    expect(HERO_OVERLAY_VALUES.has("red")).toBe(false);
  });

  it("text alignment maps to controlled classes with the EXACT current centered default", () => {
    expect(heroTextAlignClass("left")).toBe("text-left mr-auto");
    expect(heroTextAlignClass("center")).toBe("text-center mx-auto");
    expect(heroTextAlignClass("right")).toBe("text-right ml-auto");
    // undefined / unknown → today's centered look (old snapshots unchanged).
    expect(heroTextAlignClass(undefined)).toBe("text-center mx-auto");
    expect(heroTextAlignClass("bogus")).toBe("text-center mx-auto");
  });

  it("content width maps to bounded presets with the EXACT current max-w-2xl default", () => {
    expect(heroContentWidthClass("narrow")).toBe("max-w-xl");
    expect(heroContentWidthClass("medium")).toBe("max-w-2xl");
    expect(heroContentWidthClass("wide")).toBe("max-w-3xl");
    expect(heroContentWidthClass(undefined)).toBe("max-w-2xl");
    expect(heroContentWidthClass("full")).toBe("max-w-2xl");
    // guardrail: wide never exceeds max-w-3xl (no unbounded full-width hero).
    expect(heroContentWidthClass("wide")).not.toContain("max-w-4xl");
    expect(heroContentWidthClass("wide")).not.toContain("w-full");
  });

  it("overlay maps to controlled preset classes; none renders no overlay", () => {
    expect(heroOverlayClass("none")).toBeNull();
    expect(heroOverlayClass("soft")).toBe("bg-gradient-to-b from-black/25 via-transparent to-zinc-950/60");
    // medium is EXACTLY today's current gradient.
    expect(heroOverlayClass("medium")).toBe("bg-gradient-to-b from-black/50 via-transparent to-zinc-950");
    expect(heroOverlayClass("strong")).toBe("bg-gradient-to-b from-black/80 via-black/40 to-zinc-950");
    expect(heroOverlayClass(undefined)).toBe("bg-gradient-to-b from-black/50 via-transparent to-zinc-950");
    expect(heroOverlayClass("fire")).toBe("bg-gradient-to-b from-black/50 via-transparent to-zinc-950");
  });

  it("strong overlay keeps the media dark enough for white text (readability)", () => {
    expect(heroOverlayClass("strong")).toContain("from-black/80");
  });

  it("the overlay classes are literal strings so Tailwind JIT emits them", () => {
    const src = read("src/lib/hero/presentation-options.ts");
    expect(src).toContain('soft: "bg-gradient-to-b from-black/25 via-transparent to-zinc-950/60"');
    expect(src).toContain('medium: "bg-gradient-to-b from-black/50 via-transparent to-zinc-950"');
    expect(src).toContain('strong: "bg-gradient-to-b from-black/80 via-black/40 to-zinc-950"');
  });

  it("applyHeroPresentation merges only valid keys and never mutates the hero", () => {
    const hero = { title: "Hi" };
    const merged = applyHeroPresentation(hero, {
      heroTextAlign: "left",
      heroContentWidth: "wide",
      heroOverlay: "strong",
    });
    expect(merged).toEqual({ title: "Hi", textAlign: "left", contentWidth: "wide", overlay: "strong" });
    // input untouched (pure).
    expect(hero).toEqual({ title: "Hi" });
  });

  it("applyHeroPresentation ignores undefined and unknown values (no-op)", () => {
    expect(applyHeroPresentation({ title: "Hi" }, {})).toEqual({ title: "Hi" });
    expect(applyHeroPresentation({ title: "Hi" }, { heroTextAlign: "tilted", heroContentWidth: "ultra", heroOverlay: "black" }))
      .toEqual({ title: "Hi" });
  });

  it("the registry module is pure (no plan codes, no capability logic, no client strings)", () => {
    const src = read("src/lib/hero/presentation-options.ts");
    expect(src).not.toMatch(/creator_launch|creator_grow|creator_scale/i);
    expect(src).not.toContain("prisma");
    expect(src).not.toContain('"use client"');
    expect(src).not.toContain('"use server"');
  });
});

// ── Priority 2: snapshot baking (publish + preview route) ─────────────────

describe("RCCF-71.3 — snapshot bakes hero presentation from Website.themeConfig", () => {
  it("buildRuntimeSnapshot merges persisted hero presets onto content.hero", () => {
    const snapshot = buildRuntimeSnapshot(
      baseInput({ themeConfig: { heroTextAlign: "left", heroContentWidth: "wide", heroOverlay: "strong" } }),
    );
    expect(snapshot.content.hero.textAlign).toBe("left");
    expect(snapshot.content.hero.contentWidth).toBe("wide");
    expect(snapshot.content.hero.overlay).toBe("strong");
  });

  it("invalid / unknown persisted values are never baked into the snapshot", () => {
    const snapshot = buildRuntimeSnapshot(
      baseInput({ themeConfig: { heroTextAlign: "float", heroContentWidth: "infinity", heroOverlay: "rainbow" } }),
    );
    expect(snapshot.content.hero.textAlign).toBeUndefined();
    expect(snapshot.content.hero.contentWidth).toBeUndefined();
    expect(snapshot.content.hero.overlay).toBeUndefined();
  });

  it("old snapshots (no themeConfig hero keys) keep hero content unchanged", () => {
    const snapshot = buildRuntimeSnapshot(baseInput());
    expect(snapshot.content.hero.textAlign).toBeUndefined();
    expect(snapshot.content.hero.contentWidth).toBeUndefined();
    expect(snapshot.content.hero.overlay).toBeUndefined();
    // content fields are NEVER touched by the presentation merge.
    expect(snapshot.content.hero.title).toBe("Hi");
  });

  it("homepageAggregate hero receives the same merge rule", () => {
    const snapshot = buildRuntimeSnapshot(
      baseInput({
        themeConfig: { heroTextAlign: "right", heroContentWidth: "narrow", heroOverlay: "none" },
        homepageAggregate: { ...EMPTY_AGGREGATE, hero: { title: "Home", subtitle: "", description: "" } },
      }),
    );
    expect(snapshot.homepageContent?.hero.textAlign).toBe("right");
    expect(snapshot.homepageContent?.hero.contentWidth).toBe("narrow");
    expect(snapshot.homepageContent?.hero.overlay).toBe("none");
  });

  it("LayoutEngine composes hero sections with the baked presentation (Object.assign path)", () => {
    const snapshot = snapshotWithHeroSection({ heroTextAlign: "left", heroContentWidth: "wide", heroOverlay: "strong" });
    const doc = layoutEngine.resolve(snapshot);
    const heroSection = doc.pages[0].sections.find((s) => s.moduleId === "hero.default");
    expect(heroSection?.config.textAlign).toBe("left");
    expect(heroSection?.config.contentWidth).toBe("wide");
    expect(heroSection?.config.overlay).toBe("strong");
  });

  it("old snapshots compose hero sections with NO presentation fields (renderer fallback)", () => {
    const snapshot = snapshotWithHeroSection({});
    const doc = layoutEngine.resolve(snapshot);
    const heroSection = doc.pages[0].sections.find((s) => s.moduleId === "hero.default");
    expect(heroSection?.config.textAlign).toBeUndefined();
    expect(heroSection?.config.contentWidth).toBeUndefined();
    expect(heroSection?.config.overlay).toBeUndefined();
  });

  it("the snapshot schema stays version 1 with optional-only hero fields", () => {
    const snapshot = buildRuntimeSnapshot(baseInput());
    expect(snapshot._version).toBe(1);
    const type = read("src/types/snapshot.ts");
    expect(type).toContain("textAlign?: \"left\" | \"center\" | \"right\"");
    expect(type).toContain("contentWidth?: \"narrow\" | \"medium\" | \"wide\"");
    expect(type).toContain("overlay?: \"none\" | \"soft\" | \"medium\" | \"strong\"");
  });
});

// ── Priority 3: updateTheme persistence + premium gate ────────────────────

describe("RCCF-71.3 — updateTheme persists hero presentation behind the premium_themes gate", () => {
  it("updateTheme accepts and validates the three hero presentation keys", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src).toContain("HERO_TEXT_ALIGN_VALUES.has(updates.heroTextAlign)");
    expect(src).toContain("HERO_CONTENT_WIDTH_VALUES.has(updates.heroContentWidth)");
    expect(src).toContain("HERO_OVERLAY_VALUES.has(updates.heroOverlay)");
  });

  it("valid values persist into Website.themeConfig (never into hero_data)", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src).toContain("themeConfig.heroTextAlign = updates.heroTextAlign");
    expect(src).toContain("themeConfig.heroContentWidth = updates.heroContentWidth");
    expect(src).toContain("themeConfig.heroOverlay = updates.heroOverlay");
  });

  it("the premium_themes gate runs BEFORE the hero presentation writes (Launch locked)", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src.indexOf('entitlementService.has(resolved.code, "premium_themes")'))
      .toBeLessThan(src.indexOf("HERO_TEXT_ALIGN_VALUES.has(updates.heroTextAlign)"));
  });

  it("updateTheme never imports the hero_data content authority", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src).not.toMatch(/from "@\/config\/hero"/);
    expect(src).not.toMatch(/from "@\/actions\/settings/);
  });
});

// ── Priority 4: renderer consumes the presets + background focal fix ──────

describe("RCCF-71.3 — HeroRenderer consumes the controlled presets", () => {
  it("the renderer resolves the presets through the shared registry helpers", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).toContain("heroTextAlignClass(");
    expect(src).toContain("heroContentWidthClass(");
    expect(src).toContain("heroOverlayClass(");
    expect(src).toContain("from \"@/lib/hero/presentation-options\"");
  });

  it("the hardcoded centered wrapper is gone (controlled textAlign + contentWidth)", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).not.toContain("mx-auto max-w-2xl px-4 pb-12 pt-2 text-center");
    expect(src).toContain("contentWidthClass} ${textAlignClass} px-4 pb-12 pt-2");
  });

  it("the fixed overlay is gone (controlled overlay, none renders no overlay)", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).not.toContain("absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-zinc-950");
    expect(src).toContain("overlayClass && <div");
  });

  it("the background fallback honors the saved image focal point (B→A fix)", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).toContain('const alignment = resolvedMedia === "video" ? videoAlign : imageAlign;');
    expect(src).not.toContain('resolvedMedia === "background" ? "object-center"');
  });
});

// ── Priority 5: publish == preview route == Builder canvas == settings ────

describe("RCCF-71.3 — parity across publish, preview route, canvas and settings preview", () => {
  it("publish threads Website.themeConfig into the snapshot builder", () => {
    const src = read("src/lib/publishing/service.ts");
    expect(src).toContain("themeConfig: websiteThemeConfig");
  });

  it("the preview route threads Website.themeConfig into the snapshot builder", () => {
    const src = read("src/lib/storefront/storefront-loader.ts");
    expect(src).toContain("themeConfig: (website.themeConfig");
  });

  it("the Builder live-preview action returns themeConfig so the canvas can merge", () => {
    const src = read("src/actions/builder-preview.actions.ts");
    expect(src).toContain("themeConfig: (website?.themeConfig");
  });

  it("the Builder canvas applies the SAME pure merge rule before resolving", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain("applyHeroPresentation");
    expect(src).toContain("contentForRender");
    expect(src).toContain("hero: applyHeroPresentation(");
  });

  it("the settings preview renders the canonical HeroRenderer with the persisted presets", () => {
    const src = read("src/features/settings/components/settings-live-preview.tsx");
    expect(src).toContain("textAlign?: string");
    expect(src).toContain("contentWidth?: string");
    expect(src).toContain("overlay?: string");
    expect(src).toContain("textAlign,");
    expect(src).toContain("contentWidth,");
    expect(src).toContain("overlay,");
    expect(src).toContain("HeroRenderer");
  });

  it("the settings form threads the persisted presentation into the preview", () => {
    const src = read("src/features/settings/components/settings-form.tsx");
    expect(src).toContain("heroPresentation?.textAlign");
    expect(src).toContain("heroPresentation?.contentWidth");
    expect(src).toContain("heroPresentation?.overlay");
  });

  it("the settings server page reads themeConfig and normalizes via the canonical Sets", () => {
    const src = read("src/app/admin/settings/page.tsx");
    expect(src).toContain("themeConfig: true");
    expect(src).toContain("HERO_TEXT_ALIGN_VALUES.has(cfg.heroTextAlign)");
    expect(src).toContain("HERO_CONTENT_WIDTH_VALUES.has(cfg.heroContentWidth)");
    expect(src).toContain("HERO_OVERLAY_VALUES.has(cfg.heroOverlay)");
    expect(src).toContain("heroPresentation={heroPresentation}");
  });

  it("the overview action surfaces the current hero presentation values to the Builder", () => {
    const src = read("src/actions/builder-overview.actions.ts");
    expect(src).toContain('heroTextAlign: dbConfig.heroTextAlign ?? "center"');
    expect(src).toContain('heroContentWidth: dbConfig.heroContentWidth ?? "medium"');
    expect(src).toContain('heroOverlay: dbConfig.heroOverlay ?? "medium"');
  });

  it("the Builder panel surfaces all three controls and wires them to updateTheme", () => {
    const src = read("src/features/builder/components/appearance-panel.tsx");
    expect(src).toContain("HERO_TEXT_ALIGN_OPTIONS");
    expect(src).toContain("HERO_CONTENT_WIDTH_OPTIONS");
    expect(src).toContain("HERO_OVERLAY_OPTIONS");
    expect(src).toContain("applyChange({ heroTextAlign: a.value })");
    expect(src).toContain("applyChange({ heroContentWidth: w.value })");
    expect(src).toContain("applyChange({ heroOverlay: o.value })");
    expect(src).toContain("const locked = !advancedBuilder");
  });

  it("the Website panel passes the current hero presentation values into the panel", () => {
    const src = read("src/features/builder/components/website-panel.tsx");
    expect(src).toContain("heroTextAlign: overview.appearance.heroTextAlign");
    expect(src).toContain("heroContentWidth: overview.appearance.heroContentWidth");
    expect(src).toContain("heroOverlay: overview.appearance.heroOverlay");
  });
});

// ── Priority 6: frozen surfaces + no second authority ─────────────────────

describe("RCCF-71.3 — hero_data content ownership and frozen surfaces stay intact", () => {
  it("settings.actions (the content authority) gains NO hero presentation fields", () => {
    const src = read("src/actions/settings.actions.ts");
    expect(src).not.toMatch(/heroTextAlign|heroContentWidth|heroOverlay/);
  });

  it("the snapshot builder never imports the hero_data content authority", () => {
    const src = read("src/lib/storefront/build-snapshot.ts");
    expect(src).not.toMatch(/from "@\/config\/hero"/);
  });

  it("presentation-options is the single merge authority imported by every consumer", () => {
    for (const file of [
      "src/lib/storefront/build-snapshot.ts",
      "src/features/builder/canvas/interactive-canvas.tsx",
      "src/lib/registry/components/renderers.tsx",
      "src/actions/theme.actions.ts",
      "src/features/builder/components/appearance-panel.tsx",
      "src/app/admin/settings/page.tsx",
    ]) {
      expect(read(file)).toContain('from "@/lib/hero/presentation-options"');
    }
  });

  it("no plan codes are hardcoded into the new client surfaces", () => {
    for (const file of [
      "src/lib/hero/presentation-options.ts",
      "src/features/settings/components/settings-live-preview.tsx",
      "src/features/builder/canvas/interactive-canvas.tsx",
    ]) {
      expect(read(file)).not.toMatch(/creator_launch|creator_grow|creator_scale/i);
    }
  });

  it("the snapshot schema version is unchanged (no Prisma/migration required)", () => {
    expect(read("src/lib/storefront/build-snapshot.ts")).toContain("_version: 1");
    expect(read("src/types/snapshot.ts")).toContain("headingWeight?: string");
  });
});

// ── Priority 7: responsive parity + no horizontal overflow ────────────────

describe("RCCF-71.3 — responsive parity across the canonical frame widths", () => {
  it("the Builder canvas keeps the canonical device frame widths", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain("mobile: 375");
    expect(src).toContain("tablet: 768");
    expect(src).toContain("desktop: 1200");
  });

  it("the settings preview keeps the named container boundary (320/1024)", () => {
    const src = read("src/features/settings/components/settings-live-preview.tsx");
    expect(src).toContain("isMobile ? 320 : 1024");
    expect(src).toContain("@container/main");
  });

  it("the appearance panel chips wrap so the new controls never overflow the rail", () => {
    expect(read("src/features/builder/components/appearance-panel.tsx")).toContain("flex-wrap");
  });

  it("content-width presets stay bounded (narrow/medium/wide ≤ max-w-3xl)", () => {
    expect(heroContentWidthClass("narrow")).toBe("max-w-xl");
    expect(heroContentWidthClass("wide")).toBe("max-w-3xl");
  });
});
