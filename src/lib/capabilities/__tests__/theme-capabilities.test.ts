// ── Theme Capability Enforcement — RCCF-LAUNCH-POLISH-06 (Phases 4/5/6/7/10)
// Capability Runtime is the single authority for what a plan may visually
// render. Free (Launch) = solid backgrounds only; Grow = gradients/images/
// effects; Scale = everything (incl. video + advanced effects).

import { describe, it, expect } from "vitest";
import { capabilityEngine, entitlementService } from "@/lib/capabilities";
import {
  THEME_EXPERIENCES,
  resolveExperienceForCapabilities,
  experienceAvailableForPlan,
  requiredCapabilitiesForExperience,
  isExperienceAvailableForPlan,
} from "@/modules/theme/runtime/experience";

const CAP = {
  solid: "theme_background_solid",
  gradient: "theme_background_gradient",
  image: "theme_background_image",
  video: "theme_background_video",
  animation: "theme_background_animation",
  particles: "theme_effects_particles",
  glow: "theme_effects_glow",
  noise: "theme_effects_noise",
  blur: "theme_effects_blur",
  custom: "theme_effects_custom",
};

describe("theme capability matrix (Phase 5/6/7)", () => {
  it("Creator Launch has solid only — no gradients, images, video, animation or effects", () => {
    expect(capabilityEngine.can("creator_launch", CAP.solid).allowed).toBe(true);
    for (const c of [CAP.gradient, CAP.image, CAP.video, CAP.animation, CAP.particles, CAP.glow, CAP.noise, CAP.blur, CAP.custom]) {
      expect(capabilityEngine.can("creator_launch", c).allowed).toBe(false);
    }
  });

  it("Creator Grow unlocks gradients, images, animation and decorative effects", () => {
    for (const c of [CAP.solid, CAP.gradient, CAP.image, CAP.animation, CAP.particles, CAP.glow, CAP.noise, CAP.blur]) {
      expect(capabilityEngine.can("creator_grow", c).allowed).toBe(true);
    }
    expect(capabilityEngine.can("creator_grow", CAP.video).allowed).toBe(false);
    expect(capabilityEngine.can("creator_grow", CAP.custom).allowed).toBe(false);
  });

  it("Creator Scale unlocks everything including video + advanced effects", () => {
    for (const c of Object.values(CAP)) {
      expect(capabilityEngine.can("creator_scale", c).allowed).toBe(true);
    }
  });

  it("no plan (null/unknown) has no theme capabilities", () => {
    expect(capabilityEngine.can("", CAP.solid).allowed).toBe(false);
  });

  it("RCCF-71.6.4 — entitlementService.has() resolves theme granular caps (server gate parity)", () => {
    // theme.actions gates server-side via entitlementService.has(); it must
    // resolve the theme_* feature keys exactly like capabilityService.can().
    expect(entitlementService.has("creator_launch", CAP.image)).toBe(false);
    expect(entitlementService.has("creator_launch", CAP.gradient)).toBe(false);
    expect(entitlementService.has("creator_grow", CAP.image)).toBe(true);
    expect(entitlementService.has("creator_grow", CAP.gradient)).toBe(true);
    expect(entitlementService.has("creator_scale", CAP.image)).toBe(true);
    expect(entitlementService.has("creator_scale", CAP.video)).toBe(true);
  });
});

describe("required capabilities + availability (Phase 4)", () => {
  it("minimal experience requires only the solid background capability", () => {
    expect(requiredCapabilitiesForExperience(THEME_EXPERIENCES.minimal)).toEqual([CAP.solid]);
    expect(experienceAvailableForPlan(THEME_EXPERIENCES.minimal, "creator_launch")).toBe(true);
  });

  it("premium experiences require premium capabilities", () => {
    const caps = requiredCapabilitiesForExperience(THEME_EXPERIENCES.aurora);
    expect(caps).toContain(CAP.gradient);
    expect(caps).toContain(CAP.glow);
    expect(caps).toContain(CAP.particles);
  });

  it("aurora is available to Grow+ but not Launch", () => {
    expect(experienceAvailableForPlan(THEME_EXPERIENCES.aurora, "creator_launch")).toBe(false);
    expect(experienceAvailableForPlan(THEME_EXPERIENCES.aurora, "creator_grow")).toBe(true);
    expect(experienceAvailableForPlan(THEME_EXPERIENCES.aurora, "creator_scale")).toBe(true);
  });

  it("isExperienceAvailableForPlan routes through the capability engine (no raw plan tiers)", () => {
    expect(isExperienceAvailableForPlan("aurora", "creator_launch")).toBe(false);
    expect(isExperienceAvailableForPlan("aurora", "creator_grow")).toBe(true);
    expect(isExperienceAvailableForPlan("minimal", "creator_launch")).toBe(true);
    expect(isExperienceAvailableForPlan("cyber", "creator_grow")).toBe(true); // all cyber layers are Grow caps
  });
});

describe("storefront fallback (Phase 10)", () => {
  it("free plan: premium experience downgrades to solid / minimal / static / flat", () => {
    const r = resolveExperienceForCapabilities(THEME_EXPERIENCES.aurora, "creator_launch");
    expect(r.background.kind).toBe("solid");
    expect(r.background.glow).toBeUndefined();
    expect(r.decoration).toBe("minimal");
    expect(r.motion).toBe("static");
    expect(r.surface).toBe("flat");
    expect(r.divider).toBe("fade");
  });

  it("grow plan: premium experience keeps its full visual layers", () => {
    const r = resolveExperienceForCapabilities(THEME_EXPERIENCES.aurora, "creator_grow");
    expect(r.background.kind).toBe("aurora");
    expect(r.decoration).toBe("blobs");
    expect(r.motion).toBe("gradient-shift");
    expect(r.surface).toBe("glass");
  });

  it("scale plan: unchanged", () => {
    const r = resolveExperienceForCapabilities(THEME_EXPERIENCES.aurora, "creator_scale");
    expect(r).toEqual(THEME_EXPERIENCES.aurora);
  });

  it("no plan: falls back to the free tier (no broken render)", () => {
    const r = resolveExperienceForCapabilities(THEME_EXPERIENCES.cyber, null);
    expect(r.background.kind).toBe("solid");
    expect(r.decoration).toBe("minimal");
  });
});
