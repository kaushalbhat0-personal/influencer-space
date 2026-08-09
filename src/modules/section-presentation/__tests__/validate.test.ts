// ── Section Presentation — Runtime Validation Tests ────────
// RCCF-IMPLEMENTATION-09B (Phase 1). The stored config.presentation shape is
// validated before persistence so unknown keys / wrong types never reach the
// Block.config JSON.

import { describe, it, expect } from "vitest";
import { validateSectionPresentation, ALLOWED_PRESENTATION_KEYS } from "@/modules/section-presentation";

describe("validateSectionPresentation (Phase 1 runtime validation)", () => {
  it("accepts a clean partial presentation", () => {
    const { ok, value, errors } = validateSectionPresentation({ titleOverride: "Menu", hideTitle: true });
    expect(ok).toBe(true);
    expect(errors).toEqual([]);
    expect(value).toEqual({ titleOverride: "Menu", hideTitle: true });
  });

  it("accepts undefined/null as a no-op (nothing to persist)", () => {
    expect(validateSectionPresentation(undefined).ok).toBe(true);
    expect(validateSectionPresentation(undefined).value).toBeUndefined();
    expect(validateSectionPresentation(null).ok).toBe(true);
    expect(validateSectionPresentation(null).value).toBeUndefined();
  });

  it("rejects non-object input", () => {
    for (const bad of ["Menu", 42, true, ["x"]]) {
      const { ok, errors } = validateSectionPresentation(bad);
      expect(ok).toBe(false);
      expect(errors[0]).toBe("presentation must be an object");
    }
  });

  it("rejects unknown keys", () => {
    const { ok, errors } = validateSectionPresentation({ titleOverride: "Menu", content: "hack" });
    expect(ok).toBe(false);
    expect(errors).toContain("unknown presentation key: content");
  });

  it("rejects wrong types", () => {
    const { ok, errors } = validateSectionPresentation({ titleOverride: 42, hideTitle: "yes" });
    expect(ok).toBe(false);
    expect(errors).toContain("titleOverride must be a string");
    expect(errors).toContain("hideTitle must be a boolean");
  });

  it("trims string overrides and drops empty strings", () => {
    const { value } = validateSectionPresentation({ titleOverride: "  Menu  ", descriptionOverride: "" });
    expect(value?.titleOverride).toBe("Menu");
    expect(value?.descriptionOverride).toBeUndefined();
  });

  it("validates booleans for the three flag keys", () => {
    const { ok, value } = validateSectionPresentation({ visible: false, hideTitle: true, hideWhenEmpty: false });
    expect(ok).toBe(true);
    expect(value).toEqual({ visible: false, hideTitle: true, hideWhenEmpty: false });
  });

  it("documents the canonical allowed key set", () => {
    expect(ALLOWED_PRESENTATION_KEYS).toEqual([
      "titleOverride", "descriptionOverride",
      "hideTitle", "visible", "hideWhenEmpty",
    ]);
  });
});
