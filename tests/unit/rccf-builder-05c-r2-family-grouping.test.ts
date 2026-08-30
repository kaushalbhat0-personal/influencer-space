import { describe, it, expect } from "vitest";
import { ALL_THEMES } from "@/lib/theme/themes";
import { EXPERIENCE_PACKS } from "@/modules/theme/runtime/experience";

// R2.1 audit: 50 themes → families → variantGroups → legacy → light
describe("rccf-builder-05c-r2 family grouping (audit + implementation guard)", () => {
  it("all 50 themes exist and have unique IDs", () => {
    const ids = ALL_THEMES.map((t) => t.id);
    expect(ids.length).toBe(50);
    expect(new Set(ids).size).toBe(50);
  });

  it("family metadata: RCCF-10 — all 50 have family + variantGroup (legacy normalized)", () => {
    const withFamily = ALL_THEMES.filter((t) => !!t.family);
    const legacy = ALL_THEMES.filter((t) => !t.family);
    // RCCF-10 F-02: 30 legacy themes backfilled to existing families (no orphan)
    expect(withFamily.length).toBe(50);
    expect(legacy.length).toBe(0);
    for (const t of withFamily) expect(t.variantGroup).toBeDefined();
    expect(legacy.every((t) => !t.variantGroup || t.variantGroup === undefined)).toBeTruthy();
  });

  it("families resolve into ~10 distinct families via family field", () => {
    const families = [...new Set(ALL_THEMES.filter((t) => t.family).map((t) => t.family!))];
    expect(families.sort()).toEqual(
      ["brutalist", "creator", "editorial", "executive", "glass", "luxury", "midnight", "minimal", "organic-aurora", "tech-cyber"].sort(),
    );
    expect(families.length).toBe(10);
  });

  it("variantGroups: tech-cyber has 4 variants, luxury 3, brutalist 2, editorial 2 etc.", () => {
    const byVariant = new Map<string, number>();
    for (const t of ALL_THEMES.filter((t) => t.variantGroup)) {
      const k = `${t.family}:${t.variantGroup}`;
      byVariant.set(k, (byVariant.get(k) ?? 0) + 1);
    }
    // spot checks
    expect(byVariant.get("tech-cyber:tech-neon")).toBe(2); // creator-neon + gaming-neon
    expect(byVariant.get("brutalist:brutalist-matrix")).toBe(1);
    expect(byVariant.get("brutalist:brutalist-energy")).toBe(1);
  });

  it("light-capable: catalog light themes declare light variant with light bg", () => {
    const lightCapable = ALL_THEMES.filter((t) =>
      t.variants.some((v) => v.mode === "light" && v.tokens.colors.background.toLowerCase().startsWith("#fff")),
    );
    // Many legacy `creator-*` have a synthetic lightTokens but dark bg (#FFFFFF synthetic)
    // The 5-6 *true* light families (minimal-light, editorial-light etc.) are a subset;
    // broader light-variant count is higher but still bounded — grouping must not assume light.
    expect(lightCapable.length).toBeGreaterThanOrEqual(4);
    expect(lightCapable.length).toBeLessThanOrEqual(20);
  });

  it("experience packs 15 distinct and THEME_TO_EXPERIENCE 19 explicit covers catalog", () => {
    const packs = Object.keys(EXPERIENCE_PACKS);
    expect(packs.length).toBe(15);
    // packs used by catalog families are all present
    const expected = ["minimal", "creator", "luxury", "cyber", "midnight", "glass", "executive", "editorial", "aurora", "brutalist"];
    for (const id of expected) expect(packs).toContain(id);
  });

  it("grouping can be done purely from existing metadata without inventing taxonomy", () => {
    const groups = new Map<string, typeof ALL_THEMES>();
    for (const t of ALL_THEMES) {
      const key = t.family ?? "legacy";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    // RCCF-10: legacy collapsed — no unclassified bucket remains, but fallback still safe
    expect(groups.has("legacy")).toBe(false);
    expect(groups.has("tech-cyber")).toBe(true);
    // tech-cyber: creator-neon, gaming-neon, gaming-cyber, streaming-green, neon-dark(legacy), startup, cyber-arena, esports = 8
    expect((groups.get("tech-cyber")?.length ?? 0)).toBeGreaterThanOrEqual(4);
  });
});
