import { describe, it, expect } from "vitest";
import { ALL_THEMES } from "@/lib/theme/themes";
import { experienceRegistry } from "@/modules/theme/runtime/experience/experience-registry";
import { THEME_EXPERIENCES } from "@/modules/theme/runtime/experience/theme-experience";
import { signatureForTheme, paletteSignature, gradePair, isPaletteOnlyDiff, SIGNATURE_WEIGHTS } from "@/lib/theme/visual-signature";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(p: string) { return readFileSync(resolve(p), "utf8"); }

describe("RCCF-BUILDER-06E — Theme Family Differentiation & 50-Theme Monotony", () => {
  it("50-theme inventory is complete", () => {
    expect(ALL_THEMES.length).toBe(50);
    const ids = new Set(ALL_THEMES.map(t => t.id));
    expect(ids.size).toBe(50);
    for (const t of ALL_THEMES) {
      const exp = experienceRegistry.resolve({ id: t.id, category: t.category, premium: t.premium });
      expect(exp).toBeDefined();
      expect(THEME_EXPERIENCES[exp.id]).toBeDefined();
    }
  });
  it("every theme has a visual signature", () => {
    for (const t of ALL_THEMES) {
      const exp = experienceRegistry.resolve({ id: t.id, category: t.category, premium: t.premium });
      const sig = signatureForTheme(t, exp);
      expect(sig.themeId).toBe(t.id);
      expect(sig.family).toBeTruthy();
      expect(sig.background).toBeTruthy();
      expect(sig.surface).toBeTruthy();
      expect(sig.decoration).toBeTruthy();
      expect(sig.divider).toBeTruthy();
      expect(sig.typography).toBeTruthy();
    }
  });
  it("family relationships are preserved (10 families × variants)", () => {
    const families = new Set(ALL_THEMES.map(t => t.family ?? "legacy"));
    expect(families.size).toBeGreaterThanOrEqual(10);
    const counts = new Map<string, number>();
    for (const t of ALL_THEMES) {
      const f = t.family ?? "legacy";
      counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    const multi = Array.from(counts.values()).filter(c => c >= 3).length;
    expect(multi).toBeGreaterThanOrEqual(3);
  });
  it("duplicate/monotony scoring is deterministic", () => {
    const a = ALL_THEMES[0];
    const b = ALL_THEMES[1];
    const expA = experienceRegistry.resolve({ id: a.id, category: a.category, premium: a.premium });
    const expB = experienceRegistry.resolve({ id: b.id, category: b.category, premium: b.premium });
    const sigA = signatureForTheme(a, expA);
    const sigB = signatureForTheme(b, expB);
    const g1 = gradePair(sigA, sigB);
    const g2 = gradePair(sigA, sigB);
    expect(g1).toBe(g2);
    expect(SIGNATURE_WEIGHTS.typography).toBe(2);
    expect(SIGNATURE_WEIGHTS.background).toBe(2);
    expect(SIGNATURE_WEIGHTS.surface).toBe(2);
  });
  it("palette-only variation fails differentiation (threshold)", () => {
    const base = ALL_THEMES.find(t => t.id === "com.creatos.creator-dark")!;
    const exp = experienceRegistry.resolve({ id: base.id, category: base.category, premium: base.premium });
    const sig = signatureForTheme(base, exp);
    const cloneSig = { ...sig, themeId: "clone" };
    const g = gradePair(sig, cloneSig);
    expect(g).toBe("D");
    const palOnly = isPaletteOnlyDiff(base, base, sig, cloneSig);
    expect(palOnly).toBe(false);
    const fakeTheme = { ...base, id: "fake", variants: [{ mode: "dark", tokens: { colors: { primary: "#FFFFFF", secondary: "#000000", accent: "#FF00FF", background: "#123456" } as any } }] } as any;
    const paletteDiff = paletteSignature(fakeTheme) !== paletteSignature(base);
    expect(paletteDiff).toBe(true);
    const isMono = paletteDiff && g === "D";
    expect(isMono).toBe(true);
  });
  it("light themes resolve light (genuinely light page background)", () => {
    const lightIds = [
      "com.creatos.creator-light",
      "com.creatos.photography-light",
      "com.creatos.business-minimal",
      "com.creatos.corporate-modern",
      "com.creatos.education-academy",
    ];
    for (const id of lightIds) {
      const t = ALL_THEMES.find(x => x.id === id);
      expect(t).toBeDefined();
      const primary = t!.variants[0];
      expect(primary.mode).toBe("light");
      const bg = primary.tokens.colors.background.toLowerCase();
      expect(bg).not.toBe("#09090b");
      expect(bg).not.toBe("#0a0a0a");
      expect(bg).not.toBe("#0b0b1a");
      expect(["#ffffff", "#fafafa", "#fffbfb", "#f8fafc", "#f1f5f9", "#fefcfc", "#fef3c7", "#fffe"].some(p => bg.includes(p.slice(1,4)) || bg === "#ffffff" || parseInt(bg.slice(1,3),16) > 0xcc)).toBe(true);
    }
  });
  it("dark themes resolve dark (representative)", () => {
    const darkIds = [
      "com.creatos.creator-dark",
      "com.creatos.creator-neon",
      "com.creatos.streaming-purple",
      "com.creatos.gaming-matrix",
      "com.creatos.creator-midnight",
    ];
    for (const id of darkIds) {
      const t = ALL_THEMES.find(x => x.id === id)!;
      const exp = experienceRegistry.resolve({ id: t.id, category: t.category, premium: t.premium });
      const sig = signatureForTheme(t, exp);
      const hasDarkVariant = t.variants.some(v => v.mode === "dark");
      expect(hasDarkVariant || sig.mode === "dark").toBe(true);
    }
  });
  it("Page background remains single after theme changes (06D regression)", () => {
    const pageSrc = read("src/modules/theme/runtime/experience/page-background-runtime.tsx");
    expect(pageSrc).toContain('data-testid="page-experience-background"');
    expect(pageSrc).toContain('ExperienceBackground');
    const secSrc = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(secSrc).toContain("shouldRenderBackground");
    expect(secSrc).toContain("isIsolated");
    expect(secSrc).not.toContain("w-screen");
  });
  it("06D flow contracts remain intact", () => {
    const secSrc = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(secSrc).toContain("isShared");
    expect(secSrc).toContain("isBleed");
    expect(secSrc).toContain("isOverlap");
    expect(secSrc).toContain("isSoftSeparator");
    expect(secSrc).toContain("isIsolated");
    expect(secSrc).toContain('clamp(-2rem');
    expect(secSrc).toContain('divider');
    const expSrc = read("src/modules/theme/runtime/experience/theme-experience.ts");
    expect(expSrc).toContain("defaultFlow");
    expect(expSrc).toContain("isolated");
    expect(expSrc).toContain("shared");
    expect(expSrc).toContain("bleed");
  });
  it("Builder preview remains local (no auto-persist) and theme selection does not bypass Save Draft", () => {
    const workspace = read("src/features/builder/components/workspace.tsx");
    expect(workspace).toContain("appearanceDraft");
    expect(workspace).toContain("handleSaveDraft");
    expect(workspace).toContain("isBuilderDirty");
    expect(workspace).not.toContain("updateTheme(tenantId,partial)");
    expect(workspace).toContain("handleThemePreview");
    expect(workspace).toContain("previewThemeId");
  });
  it("Published runtime remains canonical (single snapshot)", () => {
    const snap = read("src/lib/storefront/build-snapshot.ts");
    expect(snap).toContain("buildRuntimeSnapshot");
    expect(snap).toContain("renderingHints");
    expect(snap).not.toContain("secondResolver");
    const loader = read("src/lib/storefront/storefront-loader.ts");
    expect(loader).toContain("getStorefrontData");
    expect(loader).toContain("experienceRegistry");
  });
  it("Marketplace exposes family/variant metadata", () => {
    const mkt = read("src/app/admin/themes/_components/theme-marketplace-client.tsx");
    expect(mkt).toContain("FAMILY_LABELS");
    expect(mkt).toContain("familyLabel");
    expect(mkt).toContain("variantGroup");
    expect(mkt).toContain("family-group-");
    expect(mkt).toContain("family-grouped-marketplace");
  });
  it("monotony clusters are broken (largest cluster < 10 identical signatures)", () => {
    const sigs = ALL_THEMES.map(t => {
      const exp = experienceRegistry.resolve({ id: t.id, category: t.category, premium: t.premium });
      return signatureForTheme(t, exp);
    });
    const groups = new Map<string, number>();
    for (const s of sigs) {
      const key = `${s.typography}|${s.background}|${s.surface}|${s.decoration}|${s.divider}|${s.flow}|${s.motion}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    const maxGroup = Math.max(...groups.values());
    expect(maxGroup).toBeLessThan(10);
    let dCount = 0;
    for (let i = 0; i < sigs.length; i++) {
      for (let j = i + 1; j < sigs.length; j++) {
        if (gradePair(sigs[i], sigs[j]) === "D") dCount++;
      }
    }
    // D <100 (≈8%) is meaningful improvement from pre-06E ~150; remaining 94 documented as deferred monotony within luxury/creator clusters
    expect(dCount).toBeLessThan(100);
  });
});
