// RCCF-71.6.2 — Partner Theme Experience capability alignment.
// Partner uses the canonical capability keys and the same runtime authority as
// Creator; no Partner-specific plan checks or renderer path are permitted.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { capabilitiesForPlan } from "@/config/commerce/plans";
import { capabilityService } from "@/lib/capabilities";
import { planTierFor } from "@/lib/capabilities/plan-resolution";
import { themeEntitlementDecision } from "@/lib/theme/entitlement";
import {
  experienceAvailableForPlan,
  requiredCapabilitiesForBackground,
  requiredCapabilitiesForSurface,
  THEME_EXPERIENCES,
  BACKGROUND_PRESETS,
  SURFACE_PRESETS,
} from "@/modules/theme/runtime/experience";

const repoRoot = resolve(process.cwd());

function read(file: string): string {
  return readFileSync(resolve(repoRoot, file), "utf8");
}

const GROWTH_THEME_CAPABILITIES = [
  "theme_background_solid",
  "theme_background_gradient",
  "theme_background_image",
  "theme_background_animation",
  "theme_effects_particles",
  "theme_effects_glow",
  "theme_effects_noise",
  "theme_effects_blur",
] as const;

const SCALE_THEME_CAPABILITIES = [...GROWTH_THEME_CAPABILITIES, "theme_background_video", "theme_effects_custom"] as const;

describe("RCCF-71.6.2 — Partner canonical capability bundles", () => {
  it("keeps Partner Free basic and paid Partner plans premium", () => {
    expect(capabilityService.can("partner_free", "template_library").allowed).toBe(true);
    expect(capabilityService.can("partner_free", "premium_themes").allowed).toBe(false);
    expect(capabilityService.can("partner_solo", "premium_themes").allowed).toBe(true);
    // RCCF-MKT-04-R1: partner_growth is retired — it no longer resolves as an
    // active plan, so no capability can be granted through it.
    expect(capabilityService.can("partner_growth", "premium_themes").allowed).toBe(false);
    expect(capabilityService.can("partner_scale", "premium_themes").allowed).toBe(true);
    expect(capabilityService.can("partner_enterprise", "premium_themes").allowed).toBe(true);
  });

  it("maps Partner Solo to the existing Growth-level visual keys", () => {
    for (const plan of ["partner_solo"]) {
      expect(capabilitiesForPlan(plan)).toEqual(expect.arrayContaining(GROWTH_THEME_CAPABILITIES));
      expect(capabilityService.can(plan, "advanced_builder").allowed).toBe(true);
      expect(planTierFor(plan)).toBe("business");
    }
  });

  it("maps Partner Scale/Enterprise to existing Scale keys without adding new keys", () => {
    for (const plan of ["partner_scale", "partner_enterprise"]) {
      expect(capabilitiesForPlan(plan)).toEqual(expect.arrayContaining(SCALE_THEME_CAPABILITIES));
      expect(capabilityService.can(plan, "advanced_builder").allowed).toBe(true);
    }
  });

  it("keeps Partner Free outside custom Appearance while retaining basic solid runtime", () => {
    expect(capabilityService.can("partner_free", "advanced_builder").allowed).toBe(false);
    expect(capabilityService.can("partner_free", "theme_background_solid").allowed).toBe(true);
    expect(capabilityService.can("partner_free", "theme_effects_blur").allowed).toBe(false);
  });

  it("uses the same canonical theme tier decision for Partner packages", () => {
    expect(themeEntitlementDecision("free", "partner_free").allowed).toBe(true);
    expect(themeEntitlementDecision("business", "partner_solo").allowed).toBe(true);
    // RCCF-MKT-04-R1: partner_growth no longer resolves — decision is denied.
    expect(themeEntitlementDecision("business", "partner_growth").allowed).toBe(false);
    expect(themeEntitlementDecision("business", "partner_free").allowed).toBe(false);
  });
});

describe("RCCF-71.6.2 — granular Theme Experience requirements", () => {
  it("requires the existing advanced_builder key for creator-selected backgrounds", () => {
    const gradient = requiredCapabilitiesForBackground(BACKGROUND_PRESETS.gradient.background);
    const pattern = requiredCapabilitiesForBackground(BACKGROUND_PRESETS.pattern.background);
    expect(gradient).toContain("advanced_builder");
    expect(gradient).toContain("theme_background_gradient");
    expect(pattern).toContain("theme_effects_noise");
  });

  it("requires advanced_builder plus blur for premium surfaces", () => {
    expect(requiredCapabilitiesForSurface("flat")).toEqual(["advanced_builder"]);
    expect(requiredCapabilitiesForSurface(SURFACE_PRESETS.glass.surface)).toEqual(expect.arrayContaining(["advanced_builder", "theme_effects_blur"]));
  });

  it("resolves the same named experiences for Creator Growth and the business-tier Partner plan", () => {
    // RCCF-MKT-04-R1: equivalence is asserted against partner_solo (the
    // business-tier Partner plan) now that partner_growth is retired.
    for (const experience of Object.values(THEME_EXPERIENCES)) {
      expect(experienceAvailableForPlan(experience, "creator_grow")).toBe(experienceAvailableForPlan(experience, "partner_solo"));
    }
  });

  it("does not falsely claim video/custom behavior for current Growth-level Partner plans", () => {
    expect(capabilityService.can("partner_solo", "theme_background_video").allowed).toBe(false);
    expect(capabilityService.can("partner_growth", "theme_effects_custom").allowed).toBe(false);
  });
});

describe("RCCF-71.6.2 — server mutation and parity authority", () => {
  it("separates premium package selection from custom Appearance mutation", () => {
    const src = read("src/actions/theme.actions.ts");
    const updateSection = src.split("export async function applyThemePackage")[0]!;
    const applySection = src.slice(src.indexOf("export async function applyThemePackage"));
    expect(updateSection).toContain('rejectMissing(["advanced_builder"])');
    expect(updateSection).not.toContain('if (!entitlementService.has(resolved.code, "premium_themes"))');
    expect(applySection).toContain("themeEntitlementDecision(tier, resolved.code)");
  });

  it("derives the Builder Appearance lock from advanced_builder", () => {
    expect(read("src/actions/builder-overview.actions.ts")).toContain('entitlementService.has(planResolved.code, "advanced_builder")');
    expect(read("src/features/builder/components/appearance-panel.tsx")).toContain("const locked = !advancedBuilder");
    expect(read("src/features/builder/components/appearance-panel.tsx")).not.toContain("const locked = !premiumThemes");
  });

  it("keeps preview, publish, and storefront on the shared resolver chain", () => {
    expect(read("src/features/builder/canvas/interactive-canvas.tsx")).toContain("resolveExperienceForCapabilities(");
    // Guardrail modernized (RCCF-MKT-04-R1): since RCCF-02 the published
    // storefront is SNAPSHOT-ONLY — the experience is resolved into the
    // snapshot by the publish pipeline and re-resolved as a runtime fallback
    // by the storefront page; the loader itself performs zero business reads.
    expect(read("src/lib/publishing/service.ts")).toContain("resolveExperienceForCapabilities(overridden");
    const loader = read("src/lib/storefront/storefront-loader.ts");
    expect(loader).toContain("SNAPSHOT-ONLY");
    expect(read("src/components/storefront/StorefrontPage.tsx")).toContain("bakedExperience");
  });

  it("contains no Partner-specific plan checks in the client Appearance surface", () => {
    const panel = read("src/features/builder/components/appearance-panel.tsx");
    expect(panel).not.toMatch(/partner_free|partner_solo|partner_growth|partner_scale|partner_enterprise/);
    expect(panel).not.toMatch(/creator_launch|creator_grow|creator_scale/);
  });
});
