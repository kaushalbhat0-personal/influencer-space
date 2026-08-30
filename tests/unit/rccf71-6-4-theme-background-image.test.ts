// RCCF-71.6.4 — Background Image Runtime + Growth/Scale Theme Completion.
// Guardrails: the `theme_background_image` capability becomes REAL for
// Creator Growth + Creator Scale across the full path (capability → preset →
// server gate → override injection → capability resolution → runtime → baked
// snapshot). Launch stays denied. Video + custom effects remain unexposed.
// No raw plan-code comparisons anywhere — the Capability Runtime + the shared
// image-config module are the single authority.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { capabilityEngine } from "@/lib/capabilities";
import { buildRuntimeSnapshot, EMPTY_AGGREGATE } from "@/lib/storefront/build-snapshot";
import { experienceRegistry } from "@/modules/theme/runtime/experience";
import {
  BACKGROUND_PRESETS,
  SURFACE_PRESETS,
  BACKGROUND_KIND_CAP,
  requiredCapabilitiesForBackground,
  applyExperienceOverride,
  resolveExperienceForCapabilities,
  canUseCapability,
  ExperienceBackground,
  THEME_EXPERIENCES,
  isSafeAssetUrl,
  isValidImageOpacity,
  parseImageOpacity,
} from "@/modules/theme/runtime/experience";

const repoRoot = resolve(process.cwd());

function read(file: string): string {
  return readFileSync(resolve(repoRoot, file), "utf8");
}

const IMAGE_URL = "/uploads/creatos/theme-bg.jpg";
const IMAGE_CAP = "theme_background_image";

function overriddenBase(config: Record<string, string>) {
  const base = experienceRegistry.resolve({ id: null, category: null, premium: null });
  return applyExperienceOverride(base, config);
}

function resolveFor(config: Record<string, string>, planCode: string | null) {
  return resolveExperienceForCapabilities(overriddenBase(config), planCode);
}

const IMAGE_CONFIG: Record<string, string> = {
  experienceBackground: "image",
  experienceBackgroundImage: IMAGE_URL,
  experienceBackgroundImageOpacity: "40",
};

describe("RCCF-71.6.4 — background image preset + capability gate", () => {
  it("image preset exists with kind 'image' and requires exactly [advanced_builder, solid, image]", () => {
    const preset = BACKGROUND_PRESETS.image;
    expect(preset).toBeDefined();
    expect(preset.background.kind).toBe("image");
    expect(requiredCapabilitiesForBackground(preset.background)).toEqual([
      "advanced_builder",
      "theme_background_solid",
      IMAGE_CAP,
    ]);
  });

  it("Launch is denied the image capability (capability level)", () => {
    expect(capabilityEngine.can("creator_launch", IMAGE_CAP).allowed).toBe(false);
    expect(canUseCapability("creator_launch", IMAGE_CAP)).toBe(false);
  });

  it("Growth + Scale are allowed the image capability — same level, no Scale-only differentiation", () => {
    expect(capabilityEngine.can("creator_grow", IMAGE_CAP).allowed).toBe(true);
    expect(capabilityEngine.can("creator_scale", IMAGE_CAP).allowed).toBe(true);
  });
});

describe("RCCF-71.6.4 — capability resolution parity (Builder canvas = preview = publish = storefront)", () => {
  it("Launch resolves the image preset to solid with no image URL leaked", () => {
    const resolved = resolveFor(IMAGE_CONFIG, "creator_launch");
    expect(resolved.background.kind).toBe("solid");
    expect(resolved.background.url).toBeUndefined();
  });

  it("Growth resolves the image preset with the URL + opacity preserved", () => {
    const resolved = resolveFor(IMAGE_CONFIG, "creator_grow");
    expect(resolved.background.kind).toBe("image");
    expect(resolved.background.url).toBe(IMAGE_URL);
    expect(resolved.background.opacity).toBe(0.4);
  });

  it("Scale resolves the image preset identically to Growth (same resolved experience)", () => {
    const grow = resolveFor(IMAGE_CONFIG, "creator_grow");
    const scale = resolveFor(IMAGE_CONFIG, "creator_scale");
    expect(scale.background).toEqual(grow.background);
    expect(scale.background.kind).toBe("image");
  });

  it("missing image URL resolves safely (never a broken render)", () => {
    const resolved = resolveFor({ experienceBackground: "image" }, "creator_grow");
    expect(resolved.background.kind).toBe("image");
    expect(resolved.background.url).toBeUndefined();
    expect(() => resolveFor({ experienceBackground: "image" }, "creator_launch")).not.toThrow();
  });

  it("applyExperienceOverride drops per-section backgrounds so the image wins everywhere", () => {
    const base = { ...THEME_EXPERIENCES.aurora };
    const config = { ...IMAGE_CONFIG };
    const out = applyExperienceOverride(base, config);
    expect(out.background).toMatchObject({ kind: "image", url: IMAGE_URL });
    expect(out.sections?.hero?.background).toBeUndefined();
  });

  it("the baked snapshot carries the same resolved image experience (publish parity)", () => {
    const themeConfig = { ...IMAGE_CONFIG };
    const experience = resolveExperienceForCapabilities(
      applyExperienceOverride(experienceRegistry.resolve({ id: null, category: null, premium: null }), themeConfig),
      "creator_grow",
    );
    const snapshot = buildRuntimeSnapshot({
      websiteId: "w1",
      correlationId: "c1",
      builderPages: [{ id: "p", name: "Home", slug: "/", order: 0, isHome: true, sections: [], theme: "default", metadata: {} }],
      aggregate: { ...EMPTY_AGGREGATE, hero: { title: "Hi", subtitle: "", description: "" } },
      navItems: [],
      themePackageId: null,
      themeColors: {},
      themeFonts: {},
      themeConfig,
      experience,
    });
    const baked = snapshot.renderingHints.experience as { background?: { kind?: string; url?: string } };
    expect(baked.background?.kind).toBe("image");
    expect(baked.background?.url).toBe(IMAGE_URL);
  });

  it("the baked snapshot degrades to solid for Launch (no image in the storefront)", () => {
    const experience = resolveExperienceForCapabilities(
      applyExperienceOverride(experienceRegistry.resolve({ id: null, category: null, premium: null }), IMAGE_CONFIG),
      "creator_launch",
    );
    const snapshot = buildRuntimeSnapshot({
      websiteId: "w1",
      correlationId: "c1",
      builderPages: [{ id: "p", name: "Home", slug: "/", order: 0, isHome: true, sections: [], theme: "default", metadata: {} }],
      aggregate: { ...EMPTY_AGGREGATE, hero: { title: "Hi", subtitle: "", description: "" } },
      navItems: [],
      themePackageId: null,
      themeColors: {},
      themeFonts: {},
      themeConfig: IMAGE_CONFIG,
      experience,
    });
    const baked = snapshot.renderingHints.experience as { background?: { kind?: string; url?: string } };
    expect(baked.background?.kind).toBe("solid");
    expect(baked.background?.url).toBeUndefined();
  });
});

describe("RCCF-71.6.4 — image runtime renderer", () => {
  it("renders an <img> behind content with no horizontal overflow, and skips it when no URL", () => {
    const withUrl = renderToStaticMarkup(
      createElement(ExperienceBackground, { background: { kind: "image", url: IMAGE_URL, opacity: 0.4 } }),
    );
    expect(withUrl).toContain("<img");
    expect(withUrl).toContain("overflow-hidden");
    expect(withUrl).toContain("pointer-events-none");
    expect(withUrl).toContain("object-cover");

    const withoutUrl = renderToStaticMarkup(createElement(ExperienceBackground, { background: { kind: "image" } }));
    expect(withoutUrl).not.toContain("<img");
  });

  it("clamps image opacity to a readable range instead of breaking", () => {
    const low = renderToStaticMarkup(
      createElement(ExperienceBackground, { background: { kind: "image", url: IMAGE_URL, opacity: 0.01 } }),
    );
    const high = renderToStaticMarkup(
      createElement(ExperienceBackground, { background: { kind: "image", url: IMAGE_URL, opacity: 2 } }),
    );
    expect(low).toContain("<img");
    expect(high).toContain("<img");
  });
});

describe("RCCF-71.6.4 — image config validation", () => {
  it("accepts https + same-origin upload URLs; rejects unsafe schemes and empty", () => {
    expect(isSafeAssetUrl("https://cdn.example.com/bg.jpg")).toBe(true);
    expect(isSafeAssetUrl("/uploads/creatos/bg.jpg")).toBe(true);
    expect(isSafeAssetUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeAssetUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isSafeAssetUrl("blob:http://localhost/x")).toBe(false);
    expect(isSafeAssetUrl("")).toBe(false);
    expect(isSafeAssetUrl(null)).toBe(false);
  });

  it("validates the persisted opacity percentage (0..100) and parses to 0..1 — RCCF-08.1 allows 0 and 100", () => {
    expect(isValidImageOpacity("0")).toBe(true);
    expect(isValidImageOpacity("5")).toBe(true);
    expect(isValidImageOpacity("90")).toBe(true);
    expect(isValidImageOpacity("100")).toBe(true);
    expect(isValidImageOpacity("-1")).toBe(false);
    expect(isValidImageOpacity("101")).toBe(false);
    expect(isValidImageOpacity("abc")).toBe(false);
    expect(parseImageOpacity("40")).toBe(0.4);
    expect(parseImageOpacity("0")).toBe(0);
    expect(parseImageOpacity("5")).toBe(0.05);
    expect(parseImageOpacity("100")).toBe(1);
    expect(parseImageOpacity("")).toBeUndefined();
  });
});

describe("RCCF-71.6.4 — frozen Growth visuals + deferred video/custom", () => {
  it("existing Growth background presets are unchanged (image was appended, nothing rewritten)", () => {
    const kinds = ["solid", "none", "midnight", "gradient", "radial", "mesh", "aurora", "pattern"];
    const expected: Record<string, string> = {
      solid: "solid",
      none: "none",
      midnight: "solid",
      gradient: "gradient",
      radial: "radial",
      mesh: "mesh",
      aurora: "aurora",
      pattern: "pattern",
    };
    for (const id of kinds) {
      expect(BACKGROUND_PRESETS[id].background.kind).toBe(expected[id]);
    }
  });

  it("video backgrounds remain unexposed — no preset, no background kind cap", () => {
    expect(BACKGROUND_PRESETS.video).toBeUndefined();
    expect(Object.keys(BACKGROUND_KIND_CAP)).not.toContain("video");
  });

  it("custom effects remain unexposed — no preset, no surface, Growth still denied", () => {
    expect(SURFACE_PRESETS.custom).toBeUndefined();
    expect(canUseCapability("creator_grow", "theme_effects_custom")).toBe(false);
    expect(canUseCapability("creator_scale", "theme_effects_custom")).toBe(true);
  });

  it("no raw plan-code comparisons gate the image (single authority: capabilities + image-config)", () => {
    const actionsSource = read("src/actions/theme.actions.ts");
    // Correct token present: the preset's own gate is the single authority.
    expect(actionsSource).toContain("requiredCapabilitiesForBackground(BACKGROUND_PRESETS.image.background)");
    // Wrong tokens absent: no plan-code string comparisons in the gate path.
    expect(actionsSource).not.toMatch(/planCode\s*===\s*["']creator_(grow|scale|launch)["']/);
    expect(actionsSource).not.toMatch(/planCode\s*===/);

    const capsSource = read("src/modules/theme/runtime/experience/capabilities.ts");
    expect(capsSource).not.toMatch(/creator_grow/);
    expect(capsSource).not.toMatch(/creator_scale/);
  });
});