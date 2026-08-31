// RCCF-71.5.1 — Growth Visual Surfaces guardrails.
// The Builder exposes existing appearance fields; the canonical snapshot,
// resolver, preview and publish paths remain the only rendering authorities.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildRuntimeSnapshot, EMPTY_AGGREGATE } from "@/lib/storefront/build-snapshot";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import { resolveExperienceForCapabilities, THEME_EXPERIENCES } from "@/modules/theme/runtime/experience";

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

describe("RCCF-71.5.1 — radius and density persistence", () => {
  it("persists radius into the existing snapshot theme", () => {
    const snapshot = buildRuntimeSnapshot(baseInput({ themeConfig: { borderRadius: "16" } }));
    expect(snapshot.theme.borderRadius).toBe("16");
  });

  it("persists density into the existing snapshot theme", () => {
    const snapshot = buildRuntimeSnapshot(baseInput({ themeConfig: { layoutDensity: "compact" } }));
    expect(snapshot.theme.layoutDensity).toBe("compact");
  });

  it("resolves radius and density through the existing LayoutEngine variables", () => {
    const snapshot = buildRuntimeSnapshot(baseInput({ themeConfig: { borderRadius: "16", layoutDensity: "spacious" } }));
    const vars = layoutEngine.resolve(snapshot).theme;
    expect(vars["--radius-lg"]).toBe("16px");
    expect(vars["--section-spacing"]).toBe("5rem");
  });

  it("old snapshots retain the current radius and density defaults", () => {
    const snapshot = buildRuntimeSnapshot(baseInput());
    const vars = layoutEngine.resolve(snapshot).theme;
    expect(snapshot.theme.borderRadius).toBeUndefined();
    expect(snapshot.theme.layoutDensity).toBeUndefined();
    expect(vars["--radius-lg"]).toBe("8px");
    expect(vars["--section-spacing"]).toBe("3rem");
  });
});

describe("RCCF-71.5.1 — entitlement and Builder UX guardrails", () => {
  it("keeps the server advanced_builder gate before appearance writes", () => {
    const src = read("src/actions/theme.actions.ts");
    const gate = src.indexOf('["advanced_builder"]');
    expect(gate).toBeGreaterThanOrEqual(0);
    expect(gate).toBeLessThan(src.indexOf("themeConfig.borderRadius"));
    expect(gate).toBeLessThan(src.indexOf("themeConfig.layoutDensity"));
  });

  it("validates radius and density server-side without plan logic in the client", () => {
    const action = read("src/actions/theme.actions.ts");
    const panel = read("src/features/builder/components/appearance-panel.tsx");
    expect(action).toContain("radius >= 0 && radius <= 24");
    expect(action).toContain('["compact", "comfortable", "spacious"].includes(updates.layoutDensity)');
    expect(panel).not.toMatch(/creator_launch|creator_grow|creator_scale/i);
  });

  it("uses the server-derived advancedBuilder flag for Launch locked behavior", () => {
    const panel = read("src/features/builder/components/appearance-panel.tsx");
    expect(panel).toContain("const locked = !advancedBuilder");
    expect(panel).toContain("disabled={locked || pending}");
    expect(panel).toContain('href="/admin/billing"');
    expect(panel).toContain('aria-label="Requires an eligible advanced builder plan"');
  });

  it("keeps Growth enabled behavior driven by the same flag, not a client plan check", () => {
    const overview = read("src/actions/builder-overview.actions.ts");
    const panel = read("src/features/builder/components/appearance-panel.tsx");
    expect(overview).toContain('entitlementService.has(planResolved.code, "premium_themes")');
    expect(overview).toContain('entitlementService.has(planResolved.code, "advanced_builder")');
    expect(panel).toContain("advancedBuilder: boolean");
    expect(panel).not.toMatch(/planCode|planTier|capabilityService/);
  });
});

describe("RCCF-71.5.1 — premium visual presentation", () => {
  it("raises the preset intensity enough to remain perceptible on dark storefronts", () => {
    const presets = read("src/modules/theme/runtime/experience/experience-overrides.ts");
    expect(presets).toContain("rgba(129,140,248,0.18)");
    expect(presets).toContain("rgba(129,140,248,0.24)");
    expect(presets).not.toContain("rgba(99,102,241,0.06)");
  });

  it("makes premium surface classes flow into existing card tokens", () => {
    const css = read("src/app/globals.css");
    for (const token of [".xp-surface-glass", ".xp-surface-soft-glow", ".xp-surface-luxury", ".xp-surface-neon"]) {
      expect(css).toContain(token);
    }
    expect(css).toContain("--surface-card: rgba(255, 255, 255, 0.12)");
    expect(css).toContain("--surface-card: rgba(79, 70, 229, 0.16)");
    expect(css).toContain("--surface-card: rgba(120, 53, 15, 0.34)");
    expect(css).toContain("--surface-card: rgba(8, 145, 178, 0.26)");
  });

  it("keeps premium styling on the shared experience path", () => {
    const runtime = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(runtime).toContain("surfaceClass(surface)");
    expect(runtime).toContain("<ExperienceBackground background={background} />");
    expect(runtime).not.toContain("builder");
  });

  it("renders meaningful background and surface swatch registries", () => {
    const panel = read("src/features/builder/components/appearance-panel.tsx");
    expect(panel).toContain("BACKGROUND_SWATCHES");
    expect(panel).toContain("SURFACE_SWATCHES");
    expect(panel).toContain("radial-gradient");
    expect(panel).toContain("backdrop-blur-sm");
    expect(panel).toContain("gradient-border");
    expect(panel).toContain("shadow-[0_0_10px");
  });

  it("marks locked visual controls with an understandable Growth upgrade state", () => {
    const panel = read("src/features/builder/components/appearance-panel.tsx");
    expect(panel).toContain('className="text-[8px] text-amber-400"');
    expect(panel).toContain(">UPGRADE</span>");
    expect(panel).toContain("Custom appearance (typography, backgrounds, surfaces, radius, density");
  });

  it("keeps all existing appearance controls in the Builder", () => {
    const panel = read("src/features/builder/components/appearance-panel.tsx");
    for (const token of [
      "FONT_OPTIONS",
      "HEADING_WEIGHT_OPTIONS",
      "BACKGROUND_PRESETS",
      "SURFACE_PRESETS",
      "HERO_TEXT_ALIGN_OPTIONS",
      "HERO_CONTENT_WIDTH_OPTIONS",
      "HERO_OVERLAY_OPTIONS",
      "borderRadius",
      "layoutDensity",
    ]) {
      expect(panel).toContain(token);
    }
  });
});

describe("RCCF-71.5.1 — canonical preview/publish/live parity", () => {
  it("threads radius and density from overview into the Builder panel", () => {
    const src = read("src/features/builder/components/website-panel.tsx");
    expect(src).toContain("borderRadius: overview.appearance.borderRadius");
    expect(src).toContain("layoutDensity: overview.appearance.layoutDensity");
  });

  it("Builder preview receives the same themeConfig and canonical resolver fields", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain("themeConfig");
    expect(src).toContain("themeConfig.borderRadius");
    expect(src).toContain("themeConfig.layoutDensity");
    expect(src).toContain("applyExperienceOverride");
    expect(src).toContain("resolveExperienceForCapabilities(");
  });

  it("preview, publish, and storefront continue using the shared experience chain", () => {
    expect(read("src/lib/storefront/storefront-loader.ts")).toContain("applyExperienceOverride");
    expect(read("src/lib/storefront/storefront-loader.ts")).toContain("resolveExperienceForCapabilities");
    expect(read("src/lib/publishing/service.ts")).toContain("applyExperienceOverride");
    expect(read("src/lib/publishing/service.ts")).toContain("resolveExperienceForCapabilities(overridden");
    expect(read("src/components/storefront/StorefrontPage.tsx")).toContain("bakedExperience");
  });

  it("does not add Builder-only appearance CSS or a second theme authority", () => {
    const panel = read("src/features/builder/components/appearance-panel.tsx");
    expect(panel).toContain("updateTheme(tenantId, partial)");
    expect(panel).toContain('builderEvents.emit("appearance:changed"');
    expect(panel).not.toContain("document.documentElement");
    expect(panel).not.toContain("<style");
  });

  it("preserves the existing capability degradation behavior", () => {
    const premium = resolveExperienceForCapabilities(THEME_EXPERIENCES.aurora, "creator_grow");
    const launch = resolveExperienceForCapabilities(THEME_EXPERIENCES.aurora, "creator_launch");
    expect(premium.background.kind).toBe("aurora");
    expect(launch.background.kind).toBe("solid");
    expect(launch.surface).toBe("flat");
    expect(launch.motion).toBe("static");
  });
});
