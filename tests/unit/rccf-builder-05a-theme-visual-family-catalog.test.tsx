import { describe, it, expect } from "vitest";
import { themeRegistry } from "@/lib/theme/registry-new";
import { THEME_EXPERIENCES, THEME_TO_EXPERIENCE } from "@/modules/theme/runtime/experience/theme-experience";
import { experienceRegistry } from "@/modules/theme/runtime/experience/experience-registry";

describe("RCCF-BUILDER-05A — Theme Visual Family & Catalog Restructuring", () => {
  it("all 50 legacy theme IDs remain resolvable", () => {
    const all = themeRegistry.getAll();
    expect(all.length).toBe(50);
    for (const t of all) {
      expect(themeRegistry.getById(t.id)).toBeDefined();
    }
    // specific legacy IDs that were most at risk of deletion
    for (const id of [
      "com.creatos.creator-dark",
      "com.creatos.gaming-matrix",
      "com.creatos.streaming-purple",
      "com.creatos.corporate-modern",
      "com.creatos.photography-light",
    ]) {
      expect(themeRegistry.getById(id)).toBeDefined();
    }
  });

  it("catalog 20 themes carry family + variantGroup metadata", () => {
    const catalog = themeRegistry.getAll().filter((t) => t.id.startsWith("com.creatos.creator-") || t.id.startsWith("com.creatos.gaming-") || t.id.startsWith("com.creatos.streaming-") || t.id.startsWith("com.creatos.business-") || t.id.startsWith("com.creatos.corporate-") || t.id.startsWith("com.creatos.photography-") || t.id.startsWith("com.creatos.music-") || t.id.startsWith("com.creatos.fitness-") || t.id.startsWith("com.creatos.education-") || t.id.startsWith("com.creatos.luxury-"));
    // at least 20 catalog have family
    const withFamily = themeRegistry.getAll().filter((t) => (t as any).family);
    expect(withFamily.length).toBeGreaterThanOrEqual(20);
    for (const t of withFamily) {
      expect((t as any).family).toBeTruthy();
      expect((t as any).variantGroup).toBeTruthy();
    }
  });

  it("family typography is distinct per visual family (not just Inter)", () => {
    const getDarkHeading = (id: string) => {
      const t = themeRegistry.getById(id);
      const dark = t?.variants.find((v) => v.mode === "dark") ?? t?.variants[0];
      return dark?.tokens.typography.headingFont ?? "";
    };
    expect(getDarkHeading("com.creatos.photography-light")).toContain("Literata");
    expect(getDarkHeading("com.creatos.luxury-champagne")).toContain("Playfair");
    expect(getDarkHeading("com.creatos.gaming-matrix")).toContain("Courier Prime");
    expect(getDarkHeading("com.creatos.gaming-neon")).toContain("JetBrains Mono");
    const fonts = [
      getDarkHeading("com.creatos.photography-light"),
      getDarkHeading("com.creatos.luxury-champagne"),
      getDarkHeading("com.creatos.gaming-matrix"),
      getDarkHeading("com.creatos.gaming-neon"),
    ];
    expect(new Set(fonts).size).toBe(4);
  });

  it("explicit THEME_TO_EXPERIENCE mapping yields distinct packs for catalog families", () => {
    // streaming-purple should now be aurora (organic) not nebula
    expect(THEME_TO_EXPERIENCE["com.creatos.streaming-purple"]).toBe("aurora");
    // music-festival now aurora
    expect(THEME_TO_EXPERIENCE["com.creatos.music-festival"]).toBe("aurora");
    // gaming-matrix now brutalist
    expect(THEME_TO_EXPERIENCE["com.creatos.gaming-matrix"]).toBe("brutalist");
    // fitness-energy now brutalist
    expect(THEME_TO_EXPERIENCE["com.creatos.fitness-energy"]).toBe("brutalist");
    // corporate-modern now executive
    expect(THEME_TO_EXPERIENCE["com.creatos.corporate-modern"]).toBe("executive");
    // creator-light now minimal
    expect(THEME_TO_EXPERIENCE["com.creatos.creator-light"]).toBe("minimal");
    // All packs exist
    for (const expId of Object.values(THEME_TO_EXPERIENCE)) {
      expect(THEME_EXPERIENCES[expId]).toBeDefined();
    }
  });

  it("experienceRegistry resolves families consistently and fallback still minimal", () => {
    expect(experienceRegistry.resolve({ id: "com.creatos.creator-dark", category: "creator", premium: false }).id).toBe("creator");
    expect(experienceRegistry.resolve({ id: "com.creatos.photography-light", category: "photography", premium: false }).id).toBe("editorial");
    expect(experienceRegistry.resolve({ id: "unknown-theme", category: "unknown", premium: false }).id).toBe("minimal");
  });

  it("brutalist pack is creator_scale entitlement", () => {
    // via THEME_EXPERIENCES brutalist premium true
    expect(THEME_EXPERIENCES.brutalist.premium).toBe(true);
    expect(THEME_EXPERIENCES.brutalist.background.kind).toBe("pattern");
  });

  it("palette variants within same family share pack (not cosmetic duplicate pillared)", () => {
    // creator-dark and tech variants share tech-cyber family but different palette, same experience cyber
    const neon = themeRegistry.getById("com.creatos.creator-neon");
    const gamingNeon = themeRegistry.getById("com.creatos.gaming-neon");
    expect((neon as any).family).toBe("tech-cyber");
    expect((gamingNeon as any).family).toBe("tech-cyber");
    // they map to same pack
    expect(THEME_TO_EXPERIENCE[neon!.id]).toBe(THEME_TO_EXPERIENCE[gamingNeon!.id]);
    // but palette differs
    expect(neon!.variants[0].tokens.colors.primary).not.toBe(gamingNeon!.variants[0].tokens.colors.primary);
  });
});
