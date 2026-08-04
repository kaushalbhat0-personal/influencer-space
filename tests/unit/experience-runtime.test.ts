import { describe, it, expect } from "vitest";
import { experienceRegistry } from "@/modules/theme/runtime/experience/experience-registry";
import { getDecorationPack, CATEGORY_DECORATION, DECORATION_PACKS } from "@/modules/theme/runtime/experience/category-decoration-packs";
import { motionClass, surfaceClass } from "@/modules/theme/runtime/experience/motion-runtime";
import { THEME_TO_EXPERIENCE, THEME_EXPERIENCES } from "@/modules/theme/runtime/experience/theme-experience";

describe("Experience Runtime — resolution (IMPLEMENTATION-45)", () => {
  it("maps a premium theme id to its named experience", () => {
    const exp = experienceRegistry.resolve({ id: "com.creatos.creator-neon", category: "creator", premium: true });
    expect(exp.name).toBe("Cyber");
    expect(exp.background.kind).toBe("mesh");
    expect(exp.decoration).toBe("hexagons");
  });

  it("falls back to a category experience with the category decoration pack", () => {
    // Unmapped fitness-category theme → category experience + fitness pack.
    const exp = experienceRegistry.resolve({ id: "com.creatos.fitness-unmapped", category: "health", premium: true });
    expect(exp.name).toBe("Velocity");
    expect(exp.decoration).toBe(CATEGORY_DECORATION.fitness);
  });

  it("theme-id mapping takes precedence over category", () => {
    const exp = experienceRegistry.resolve({ id: "com.creatos.fitness-energy", category: "health", premium: true });
    expect(exp.name).toBe("Arena");
  });

  it("returns the Minimal experience deterministically for unknown themes", () => {
    const exp = experienceRegistry.resolve({ id: "unknown.theme", category: "unknown", premium: false });
    expect(exp.name).toBe("Minimal");
    expect(exp.decoration).toBe("minimal");
    expect(exp.motion).toBe("static");
    expect(exp.divider).toBe("fade");
  });

  it("resolves null theme to Minimal (never throws)", () => {
    const exp = experienceRegistry.resolve(null);
    expect(exp.name).toBe("Minimal");
    const exp2 = experienceRegistry.resolve(undefined);
    expect(exp2.name).toBe("Minimal");
  });

  it("defines all premium packs referenced by theme mapping", () => {
    for (const expId of Object.values(THEME_TO_EXPERIENCE)) {
      expect(THEME_EXPERIENCES[expId]).toBeDefined();
    }
  });
});

describe("Experience Runtime — decoration packs", () => {
  it("returns the matching pack for a valid key", () => {
    const pack = getDecorationPack("constellation");
    expect(pack.elements.length).toBeGreaterThan(0);
  });

  it("returns the Minimal (empty) pack for unknown keys", () => {
    const pack = getDecorationPack(undefined);
    expect(pack.elements).toEqual([]);
  });

  it("category mapping is deterministic", () => {
    expect(CATEGORY_DECORATION.gaming).toBe("hexagons");
    expect(CATEGORY_DECORATION.music).toBe("waves");
    expect(DECORATION_PACKS.gaming.elements.length).toBeGreaterThan(0);
  });
});

describe("Experience Runtime — motion + surface", () => {
  it("maps motion presets to CSS classes", () => {
    expect(motionClass("static")).toBe("");
    expect(motionClass("float")).toBe("xp-float");
    expect(motionClass("gradient-shift")).toBe("xp-gradient-shift");
    expect(motionClass("particle-drift")).toBe("xp-particle-drift");
  });

  it("maps surface presets to CSS classes", () => {
    expect(surfaceClass("flat")).toBe("");
    expect(surfaceClass("glass")).toBe("xp-surface-glass");
    expect(surfaceClass("gradient-border")).toBe("xp-surface-gradient-border");
    expect(surfaceClass("floating")).toBe("xp-surface-floating");
  });
});
