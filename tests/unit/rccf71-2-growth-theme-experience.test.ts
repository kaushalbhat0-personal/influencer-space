// ── RCCF-71.2 — Growth Theme Experience (Phase 2) ────────────────────────
// Guardrails that the creator-controlled Theme Experience capabilities
// (background preset, surface preset) and controlled Growth typography
// (font selection, heading weight) reach the CANONICAL runtime — persistence
// → snapshot → LayoutEngine → CSS vars / ExperienceSection → renderer —
// identically in Builder preview, the preview route and the published
// storefront. No Builder-only CSS, no second theme authority, no plan/
// capability changes, no client-side capability authority.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildRuntimeSnapshot, EMPTY_AGGREGATE } from "@/lib/storefront/build-snapshot";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import {
  applyExperienceOverride,
  BACKGROUND_PRESETS,
  SURFACE_PRESETS,
  resolveExperienceForCapabilities,
  THEME_EXPERIENCES,
} from "@/modules/theme/runtime/experience";
import type { ExperienceBackgroundKind } from "@/modules/theme/runtime/experience";

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

// ── Priority 1: background preset override ───────────────────────────────

describe("RCCF-71.2 — background preset override reaches the canonical runtime", () => {
  it("applyExperienceOverride pins the chosen preset background onto the base experience", () => {
    const out = applyExperienceOverride(THEME_EXPERIENCES.minimal, { experienceBackground: "aurora" });
    expect(out.background.kind).toBe("aurora");
  });

  it("overriding the page background drops per-section hero background so the preset wins", () => {
    const out = applyExperienceOverride(THEME_EXPERIENCES.aurora, { experienceBackground: "solid" });
    expect(out.background.kind).toBe("solid");
    expect(out.sections?.hero?.background).toBeUndefined();
  });

  it("every background preset maps to a kind the runtime renders (image added by RCCF-71.6.4)", () => {
    const kinds = new Set<ExperienceBackgroundKind>(["solid", "gradient", "mesh", "radial", "pattern", "multi-radial", "aurora", "image", "none"]);
    for (const p of Object.values(BACKGROUND_PRESETS)) {
      expect(kinds.has(p.background.kind)).toBe(true);
    }
  });

  it("publish applies the override BEFORE capability resolution (bake path)", () => {
    const src = read("src/lib/publishing/service.ts");
    expect(src).toContain("applyExperienceOverride");
    expect(src).toContain("resolveExperienceForCapabilities(overridden");
  });

  it("the preview loader bakes the override-applied experience into the preview snapshot", () => {
    const src = read("src/lib/storefront/storefront-loader.ts");
    expect(src).toContain("applyExperienceOverride");
    expect(src).toContain("experience,");
  });

  it("the Builder canvas applies the override before capability resolution", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain("applyExperienceOverride");
    expect(src).toContain("resolveExperienceForCapabilities(");
  });

  it("the published storefront prefers the baked experience in both paths", () => {
    const src = read("src/components/storefront/StorefrontPage.tsx");
    expect(src).toContain("bakedExperience");
    expect(src).toContain("?? resolveExperienceForCapabilities");
  });

  it("old snapshots without a baked experience fall back to capability resolution", () => {
    const snapshot = buildRuntimeSnapshot(baseInput());
    expect(snapshot.renderingHints?.experience).toBeUndefined();
  });

  it("a free plan degrades a premium background override to the safe solid look", () => {
    const overridden = applyExperienceOverride(THEME_EXPERIENCES.minimal, { experienceBackground: "aurora" });
    const resolved = resolveExperienceForCapabilities(overridden, "creator_launch");
    expect(resolved.background.kind).toBe("solid");
  });

  it("a Growth plan preserves the aurora background override", () => {
    const overridden = applyExperienceOverride(THEME_EXPERIENCES.minimal, { experienceBackground: "aurora" });
    const resolved = resolveExperienceForCapabilities(overridden, "creator_grow");
    expect(resolved.background.kind).toBe("aurora");
  });

  it("updateTheme validates the background key against the preset registry", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src).toContain("BACKGROUND_PRESETS[updates.experienceBackground]");
  });

  it("an unknown background key is never stored (no parallel model)", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src).toMatch(/if \(updates\.experienceBackground !== undefined && BACKGROUND_PRESETS\[updates\.experienceBackground\]\) \{/);
  });
});

// ── Priority 1: surface preset override ──────────────────────────────────

describe("RCCF-71.2 — surface preset override reaches the canonical runtime", () => {
  it("applyExperienceOverride pins the chosen surface onto the base experience", () => {
    const out = applyExperienceOverride(THEME_EXPERIENCES.minimal, { experienceSurface: "glass" });
    expect(out.surface).toBe("glass");
  });

  it("every surface preset maps to an existing runtime ExperienceSurface", () => {
    for (const s of Object.values(SURFACE_PRESETS)) {
      expect(["flat", "glass", "elevated", "gradient-border", "soft-glow", "floating", "luxury", "neon", "minimal"]).toContain(s.surface);
    }
  });

  it("a free plan degrades a premium surface override to flat", () => {
    const overridden = applyExperienceOverride(THEME_EXPERIENCES.minimal, { experienceSurface: "glass" });
    const resolved = resolveExperienceForCapabilities(overridden, "creator_launch");
    expect(resolved.surface).toBe("flat");
  });

  it("a Growth plan preserves the glass surface override", () => {
    const overridden = applyExperienceOverride(THEME_EXPERIENCES.minimal, { experienceSurface: "glass" });
    const resolved = resolveExperienceForCapabilities(overridden, "creator_grow");
    expect(resolved.surface).toBe("glass");
  });

  it("updateTheme validates the surface key against the preset registry", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src).toContain("SURFACE_PRESETS[updates.experienceSurface]");
  });

  it("the override helper is a pure, no-op when no valid keys are set", () => {
    const base = THEME_EXPERIENCES.minimal;
    expect(applyExperienceOverride(base, undefined)).toBe(base);
    expect(applyExperienceOverride(base, { experienceBackground: "nope" })).toBe(base);
  });

  it("the override helper is exported from the single experience authority (index)", () => {
    const src = read("src/modules/theme/runtime/experience/index.ts");
    expect(src).toContain("applyExperienceOverride");
    expect(src).toContain("BACKGROUND_PRESETS");
    expect(src).toContain("SURFACE_PRESETS");
  });

  it("no plan codes are hardcoded into the override presets (capability runtime stays the authority)", () => {
    const src = read("src/modules/theme/runtime/experience/experience-overrides.ts");
    expect(src).not.toMatch(/creator_launch|creator_grow|creator_scale/i);
  });

  it("the build snapshot pipeline still carries no plan/tier/quota logic", () => {
    const src = read("src/lib/storefront/build-snapshot.ts");
    expect(src).not.toMatch(/plan|tier|quota/i);
  });

  it("the LayoutEngine still carries no plan/tier/quota logic", () => {
    const src = read("src/lib/storefront/layout-engine/LayoutEngine.ts");
    expect(src).not.toMatch(/plan|tier|quota/i);
  });

  it("updateTheme uses the canonical advanced_builder gate while package selection keeps premium_themes", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src).toContain('rejectMissing(["advanced_builder"])');
    expect(src).toContain("themeEntitlementDecision(tier, resolved.code)");
    expect(src.indexOf('rejectMissing(["advanced_builder"])'))
      .toBeLessThan(src.indexOf("BACKGROUND_PRESETS[updates.experienceBackground]"));
  });

  it("the snapshot contract remains schema-version 1 (no breaking schema change)", () => {
    expect(read("src/types/snapshot.ts")).toContain("CURRENT_SNAPSHOT_VERSION = 1");
  });
});

// ── Priority 3: typography — font selection ──────────────────────────────

describe("RCCF-71.2 — font selection reaches the canonical runtime (no Builder-only CSS)", () => {
  it("updateTheme persists the chosen font through the shared FONT_MAP", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src).toContain("FONT_MAP[updates.font]");
    expect(src).toContain('from "@/lib/theme/font-options"');
  });

  it("the resolved heading/body fonts reach LayoutEngine CSS vars", () => {
    const snapshot = buildRuntimeSnapshot(
      baseInput({ themeFonts: { heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" } }),
    );
    const vars = layoutEngine.resolve(snapshot).theme;
    expect(vars["--brand-font-heading"]).toContain("Inter");
    expect(vars["--brand-font-body"]).toContain("Inter");
  });

  it("the Builder canvas resolves fonts through the SAME resolver overrides", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain("themeFonts.heading");
    expect(src).toContain("themeFonts.body");
    expect(src).toContain("themeResolver.resolveForSnapshot");
  });

  it("the build snapshot threads fonts through the resolver (preview == publish parity)", () => {
    const src = read("src/lib/storefront/build-snapshot.ts");
    expect(src).toContain("input.themeFonts.heading");
    expect(src).toContain("input.themeFonts.body");
  });

  it("the shared font options module exposes the canonical option set", () => {
    const src = read("src/lib/theme/font-options.ts");
    expect(src).toContain("geist");
    expect(src).toContain("inter");
    expect(src).toContain("plex");
    expect(src).toContain("mono");
    expect(src).toContain("FONT_REVERSE_MAP");
  });

  it("no plan codes are hardcoded into the font options module", () => {
    expect(read("src/lib/theme/font-options.ts")).not.toMatch(/creator_launch|creator_grow|creator_scale/i);
  });

  it("font selection sits behind the same premium_themes entitlement gate", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src.indexOf('entitlementService.has(resolved.code, "premium_themes")'))
      .toBeLessThan(src.indexOf("FONT_MAP[updates.font]"));
  });

  it("the Builder overview returns the current font as a server-derived value (no client plan logic)", () => {
    const src = read("src/actions/builder-overview.actions.ts");
    expect(src).toContain("FONT_REVERSE_MAP[dbFonts.heading");
    expect(src).toContain("appearance:");
    expect(src).toContain("capabilities: { premiumThemes, advancedBuilder }");
  });
});

// ── Priority 3: typography — controlled heading weight ───────────────────

describe("RCCF-71.2 — controlled heading weight reaches the canonical runtime", () => {
  it("persisted themeConfig.headingWeight is baked into snapshot.theme.typography.headingWeight", () => {
    const snapshot = buildRuntimeSnapshot(baseInput({ themeConfig: { headingWeight: "800" } }));
    expect(snapshot.theme.typography.headingWeight).toBe("800");
  });

  it("LayoutEngine emits --brand-font-weight-heading when configured", () => {
    const snapshot = buildRuntimeSnapshot(baseInput({ themeConfig: { headingWeight: "800" } }));
    const vars = layoutEngine.resolve(snapshot).theme;
    expect(vars["--brand-font-weight-heading"]).toBe("800");
  });

  it("old snapshots without headingWeight emit no var (renderer fallback applies)", () => {
    const snapshot = buildRuntimeSnapshot(baseInput());
    expect(snapshot.theme.typography.headingWeight).toBeUndefined();
    const vars = layoutEngine.resolve(snapshot).theme;
    expect(vars["--brand-font-weight-heading"]).toBeUndefined();
  });

  it("the resolver owns headingWeight overrides alongside theme-package resolution", () => {
    const src = read("src/lib/theme/resolver-new.ts");
    expect(src).toContain("headingWeight?: string");
    expect(src).toContain("headingWeight ?? base.typography.headingWeight");
  });

  it("the Builder canvas threads headingWeight through the same resolver", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain("themeConfig.headingWeight");
    expect(src).toContain("typography.headingWeight");
  });

  it("the build snapshot threads headingWeight through the resolver authority", () => {
    const src = read("src/lib/storefront/build-snapshot.ts");
    expect(src).toContain("input.themeConfig?.headingWeight");
    expect(src).toContain("resolvedTheme?.typography.headingWeight");
  });

  it("renderers consume the canonical var with a 700 fallback (no hardcoded font-bold on headings)", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).toContain("font-[var(--brand-font-weight-heading,700)]");
    // The hero h1 and SectionHeading no longer hardcode font-bold.
    expect(src).not.toContain('h1 className="text-3xl font-bold tracking-tight');
    expect(src).not.toContain('h2 className="text-2xl font-bold text-[var(--text-primary,#FAFAFA)]"');
  });

  it("ThemeSnapshot gains headingWeight additively and optional", () => {
    expect(read("src/types/snapshot.ts")).toContain("headingWeight?: string");
  });

  it("updateTheme validates headingWeight against the canonical weight presets", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src).toContain("HEADING_WEIGHT_VALUES.has(updates.headingWeight)");
  });

  it("heading weight sits behind the same premium_themes gate (Launch locked)", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src.indexOf('entitlementService.has(resolved.code, "premium_themes")'))
      .toBeLessThan(src.indexOf("HEADING_WEIGHT_VALUES.has(updates.headingWeight)"));
  });

  it("no plan codes are hardcoded into the heading weight options", () => {
    expect(read("src/lib/theme/font-options.ts")).not.toMatch(/creator_launch|creator_grow|creator_scale/i);
  });

  it("the Builder appearance panel surfaces the heading weight options", () => {
    const src = read("src/features/builder/components/appearance-panel.tsx");
    expect(src).toContain("HEADING_WEIGHT_OPTIONS");
    expect(src).toContain("headingWeight");
  });
});

// ── Builder UX: locked state from server-derived capability data ─────────

describe("RCCF-71.2 — Builder appearance panel (no client-side capability authority)", () => {
  it("the panel renders locked from the server-derived advancedBuilder prop", () => {
    const src = read("src/features/builder/components/appearance-panel.tsx");
    expect(src).toContain("advancedBuilder");
    expect(src).toContain("const locked = !advancedBuilder");
    expect(src).toContain('href="/admin/billing"');
  });

  it("the panel persists through the canonical updateTheme action", () => {
    const src = read("src/features/builder/components/appearance-panel.tsx");
    expect(src).toContain('from "@/actions/theme.actions"');
    expect(src).toContain("updateTheme(tenantId, partial)");
  });

  it("the panel emits appearance:changed so the canvas refetches (preview == publish)", () => {
    const src = read("src/features/builder/components/appearance-panel.tsx");
    expect(src).toContain('builderEvents.emit("appearance:changed"');
  });

  it("the canvas subscribes to appearance:changed to refetch the live preview", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain('subscribe("appearance:changed"');
  });

  it("the builder event bus declares the appearance:changed event type", () => {
    const src = read("src/lib/builder/events/types.ts");
    expect(src).toContain('"appearance:changed"');
    expect(src).toContain('"appearance:changed": { timestamp: number }');
  });

  it("the overview action derives premiumThemes via the Capability Runtime", () => {
    const src = read("src/actions/builder-overview.actions.ts");
    expect(src).toContain('entitlementService.has(planResolved.code, "premium_themes")');
    expect(src).toContain('entitlementService.has(planResolved.code, "advanced_builder")');
  });

  it("the WebsitePanel renders the AppearancePanel only when overview is loaded", () => {
    const src = read("src/features/builder/components/website-panel.tsx");
    expect(src).toContain("AppearancePanel");
    expect(src).toContain("overview?.appearance && overview.capabilities");
  });

  it("the workspace threads tenantId to the properties rail (desktop + mobile)", () => {
    const src = read("src/features/builder/components/workspace.tsx");
    expect(src).toContain("tenantId={overviewData?.tenant.id ?? null}");
  });
});

// ── Responsive: no horizontal overflow across the frame widths ───────────

describe("RCCF-71.2 — responsive parity (Builder frame == live viewport)", () => {
  it("the canvas keeps the canonical device frame widths", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain("mobile: 375");
    expect(src).toContain("tablet: 768");
    expect(src).toContain("desktop: 1200");
  });

  it("the right properties rail stays within the frozen ~260px width", () => {
    const src = read("src/features/builder/components/workspace.tsx");
    expect(src).toContain("defaultWidth={260}");
  });

  it("the appearance panel chips wrap so they never overflow the rail", () => {
    const src = read("src/features/builder/components/appearance-panel.tsx");
    expect(src).toContain("flex-wrap");
  });

  it("renderers keep the named @container/main breakpoints (frame == viewport)", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).toContain("@sm/main:");
    expect(src).toContain("@lg/main:");
  });

  it("both storefront main and builder canvas carry the theme-root + @container/main boundary", () => {
    const storefront = read("src/components/storefront/StorefrontPage.tsx");
    const canvas = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(storefront).toMatch(/@container\/main theme-root/);
    expect(canvas).toMatch(/@container\/main theme-root/);
  });
});

// ── No second theme authority / no Builder-only CSS ──────────────────────

describe("RCCF-71.2 — single theme authority (no parallel model)", () => {
  it("the override presets live in the experience module, not a new theme model", () => {
    expect(read("src/modules/theme/runtime/experience/index.ts")).toContain("experience-overrides");
  });

  it("applyExperienceOverride is the single override entry point used by all three resolution sites", () => {
    expect(read("src/lib/publishing/service.ts")).toContain("applyExperienceOverride");
    expect(read("src/lib/storefront/storefront-loader.ts")).toContain("applyExperienceOverride");
    expect(read("src/features/builder/canvas/interactive-canvas.tsx")).toContain("applyExperienceOverride");
  });

  it("the new controls persist into the EXISTING Website.themeConfig JSON (no new column/model)", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src).toContain("themeConfig.experienceBackground");
    expect(src).toContain("themeConfig.experienceSurface");
    expect(src).toContain("themeConfig.headingWeight");
  });

  it("the AppearanceState surface does not duplicate hero content (Builder = presentation only)", () => {
    const src = read("src/features/builder/components/appearance-panel.tsx");
    expect(src).not.toContain('from "@/config/hero"');
    expect(src).not.toContain('settings.actions');
    expect(src).not.toContain("videoUrl");
    expect(src).not.toContain("posterUrl");
  });
});
