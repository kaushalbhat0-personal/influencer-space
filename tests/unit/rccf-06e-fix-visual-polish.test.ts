import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { THEME_EXPERIENCES } from "@/modules/theme/runtime/experience/theme-experience";
import { experienceRegistry } from "@/modules/theme/runtime/experience/experience-registry";
import { themeRegistry } from "@/lib/theme/registry-new";
import { themeResolver } from "@/lib/theme/resolver-new";

function read(p: string) { return readFileSync(resolve(p), "utf8"); }

describe("RCCF-06E-FIX — Visual Composition Polish", () => {
  it("light mode resolves dark foreground, not washed out", () => {
    const lightIds = ["com.creatos.creator-light","com.creatos.photography-light","com.creatos.business-minimal","com.creatos.minimal-portfolio","com.creatos.education-academy"];
    for (const id of lightIds) {
      const theme = themeRegistry.getById(id)!;
      const resolved = themeResolver.resolveForSnapshot(id, "light");
      expect(resolved).not.toBeNull();
      const bg = resolved!.colors.background.toLowerCase();
      const fg = resolved!.colors.foreground.toLowerCase();
      // bg light, fg dark charcoal
      expect(bg).toMatch(/#fff|#fafafa|#f8fafc|#f1f5f9|#fffa|#fef3/);
      expect(fg).not.toBe(bg);
      // fg should be dark (#0f172a, #18181b, #1e293b etc.)
      const darkFg = ["#0f172a","#18181b","#1e293b","#292524","#0f172","#1e3a5f"];
      expect(fg.startsWith("#0") || fg.startsWith("#1") || fg.startsWith("#2") || darkFg.some(d=>fg.includes(d.slice(1,4)))).toBe(true);
    }
  });

  it("hero uses theme vars, not hardcoded white/zinc", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    // hero title should use var(--text-primary)
    expect(src).toContain('text-[var(--text-primary');
    expect(src).not.toContain('h1 className="text-3xl font-[var(--brand-font-weight-heading,700)] tracking-tight text-white');
    // hero background should be var(--surface-root), not zinc-900 gradient
    expect(src).toContain('bg-[var(--surface-root');
    expect(src).not.toContain('bg-gradient-to-br from-zinc-900');
    // description uses secondary
    expect(src).toContain('text-[var(--text-secondary');
  });

  it("section heading description uses theme var", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).not.toContain('text-zinc-400">{description}');
    expect(src).toContain('text-[var(--text-secondary');
  });

  it("builder canvas respects light mode (not hardcoded dark)", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain('resolveMode');
    expect(src).toContain('variants[0].mode');
    expect(src).not.toMatch(/resolveForSnapshot\([^,]+,\s*"dark"\s*,/);
  });

  it("snapshot persists full light token set (border, textSecondary)", () => {
    const src = read("src/lib/storefront/build-snapshot.ts");
    expect(src).toContain('border:');
    expect(src).toContain('textSecondary');
    expect(src).toContain('surface');
  });

  it("footer is dedicated semantic composition, not generic section", () => {
    const storefront = read("src/components/storefront/StorefrontPage.tsx");
    expect(storefront).toContain('bodySections');
    expect(storefront).toContain('footerSections');
    expect(storefront).toContain('<footer');
    expect(storefront).toContain('data-testid="storefront-footer"');
    expect(storefront).toContain('mx-auto max-w-6xl');
    const builder = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(builder).toContain('builder-footer');
    expect(builder).toContain('<footer');
    expect(builder).toContain('PageExperience');
  });

  it("empty placeholder uses reduced spacing", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).toContain('py-6 text-center');
    // ensure EmptyState border uses var
    expect(src).toContain('border-[var(--border');
    // EmptyState should have reduced spacing, not the large section spacing
    const emptyStateSection = src.split('function EmptyState')[1]?.split('function SectionHeading')[0] ?? "";
    expect(emptyStateSection).toContain('py-6');
    expect(emptyStateSection).not.toContain('py-[var(--section-spacing,3rem)]');
  });

  it("hero has increased weight (pb-16 / pt-6)", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).toContain('pb-16 pt-6');
    expect(src).toContain('pb-24');
  });

  it("06D regression: PageExperienceBackground still single", () => {
    const page = read("src/modules/theme/runtime/experience/page-background-runtime.tsx");
    expect(page).toContain('data-testid="page-experience-background"');
    const sec = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(sec).toContain('shouldRenderBackground');
    expect(sec).toContain('isIsolated');
  });
});
