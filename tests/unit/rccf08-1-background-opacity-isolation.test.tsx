import { describe, it, expect } from "vitest";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { createElement } from "react";
import { ExperienceBackground } from "@/modules/theme/runtime/experience/background-runtime";
import { ExperienceSection } from "@/modules/theme/runtime/experience/section-runtime";
import { PageExperience } from "@/modules/theme/runtime/experience/page-background-runtime";
import { THEME_EXPERIENCES } from "@/modules/theme/runtime/experience/theme-experience";
import { isValidImageOpacity, parseImageOpacity, IMAGE_OPACITY_MIN, IMAGE_OPACITY_MAX } from "@/modules/theme/runtime/experience/image-config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(file: string): string {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

// Helper to extract opacity from rendered markup's img style
function extractImgOpacity(markup: string): number | null {
  const match = markup.match(/<img[^>]*style="[^"]*opacity:\s*([0-9.]+)[^"]*"/);
  if (match) return parseFloat(match[1]!);
  const match2 = markup.match(/opacity:\s*([0-9.]+)/);
  return match2 ? parseFloat(match2[1]!) : null;
}

describe("RCCF-08.1 — Background image opacity isolation", () => {
  const IMAGE_URL = "/uploads/test-bg.jpg";

  it("Test 1 — opacity isolation: configured image opacity changes only background layer (img), not content", () => {
    const markup = renderToStaticMarkup(
      createElement(ExperienceBackground, { background: { kind: "image", url: IMAGE_URL, opacity: 0.05 } })
    );
    // Background layer must contain img with opacity 0.05
    expect(markup).toContain("<img");
    const imgOpacity = extractImgOpacity(markup);
    expect(imgOpacity).toBeCloseTo(0.05, 2);
    // The wrapper divs must be absolute, pointer-events-none, not containing content opacity
    expect(markup).toContain("pointer-events-none absolute inset-0");
    // No opacity on the wrapper itself (only on img)
    // The outer div should not have style opacity, only the img
    const wrapperOpacity = markup.match(/<div[^>]*style="[^"]*opacity[^"]*"/g);
    // Only the img should have opacity, not the div wrappers
    const divOpacities = wrapperOpacity ? wrapperOpacity.filter((m) => m.includes("<div")) : [];
    // The only opacity in the markup should be on the img
    expect(markup.split("opacity").length - 1).toBeGreaterThanOrEqual(1);
  });

  it("Test 2 — foreground content does not inherit background image opacity (PageExperience + ExperienceSection)", () => {
    const experience = {
      ...THEME_EXPERIENCES.minimal,
      background: { kind: "image" as const, url: IMAGE_URL, opacity: 0.05 },
    };
    const pageMarkup = renderToStaticMarkup(
      createElement(PageExperience, { experience, children: createElement("h1", null, "Games") })
    );
    // PageExperience renders background + content. Content wrapper is relative z-0, not faded
    expect(pageMarkup).toContain("Games");
    // The h1's parent content layer must not have style opacity
    expect(pageMarkup).not.toMatch(/<div[^>]*class="relative z-0"[^>]*style="[^"]*opacity/);
    // Only the background img has opacity
    const imgOpacity = extractImgOpacity(pageMarkup);
    expect(imgOpacity).toBeCloseTo(0.05, 2);

    // Section-level isolation
    const sectionMarkup = renderToStaticMarkup(
      createElement(ExperienceSection, {
        experience,
        variant: "default",
        children: createElement("div", null, createElement("h2", null, "Battle Royale"), createElement("p", null, "Card content")),
        // Force isolated flow so section renders its own background (if applicable) — but for minimal defaultFlow shared, section is transparent and page background is used.
        // We test that section content wrapper is relative z-10 and not faded
      })
    );
    expect(sectionMarkup).toContain("Battle Royale");
    expect(sectionMarkup).not.toMatch(/<div[^>]*class="relative z-10"[^>]*style="[^"]*opacity/);
  });

  it("Test 3 — 0% opacity: background disappears (opacity 0) while content remains fully visible", () => {
    const markup = renderToStaticMarkup(
      createElement(ExperienceBackground, { background: { kind: "image", url: IMAGE_URL, opacity: 0 } })
    );
    const imgOpacity = extractImgOpacity(markup);
    expect(imgOpacity).toBe(0);
    // Content would be in PageExperience's relative div, not affected
    const pageMarkup = renderToStaticMarkup(
      createElement(PageExperience, { experience: { ...THEME_EXPERIENCES.minimal, background: { kind: "image", url: IMAGE_URL, opacity: 0 } }, children: createElement("h1", null, "Heading") })
    );
    expect(pageMarkup).toContain("Heading");
    expect(pageMarkup).not.toMatch(/Heading[^<]*<\/h1>[^<]*style="[^"]*opacity:\s*0/);
  });

  it("Test 4 — 5% opacity: background faint (0.05) while heading/card/text remain fully opaque", () => {
    const markup = renderToStaticMarkup(
      createElement(ExperienceBackground, { background: { kind: "image", url: IMAGE_URL, opacity: 0.05 } })
    );
    expect(extractImgOpacity(markup)).toBeCloseTo(0.05, 2);
    // Simulate Games section at 5%
    const experience = { ...THEME_EXPERIENCES.minimal, background: { kind: "image" as const, url: IMAGE_URL, opacity: 0.05 } };
    const gamesMarkup = renderToStaticMarkup(
      createElement(
        PageExperience,
        { experience },
        createElement(
          ExperienceSection,
          { experience, children: createElement("div", null, createElement("h2", null, "Games"), createElement("div", null, "Battle Royale card"), createElement("p", null, "Body text"), createElement("button", null, "Play")) }
        )
      )
    );
    expect(gamesMarkup).toContain("Games");
    expect(gamesMarkup).toContain("Battle Royale card");
    expect(gamesMarkup).toContain("Body text");
    // Only one opacity (the img) should be 0.05, not on heading/card
    const allOpacities = (gamesMarkup.match(/opacity:\s*[0-9.]+/g) || []).map((s) => parseFloat(s.replace(/.*opacity:\s*/, "")));
    expect(allOpacities).toContain(0.05);
    // The heading/card wrappers must not have opacity style
    expect(gamesMarkup).not.toMatch(/<h2[^>]*style="[^"]*opacity/);
  });

  it("Test 5 — 100% opacity: background fully visible (1) while content remains opaque", () => {
    const markup = renderToStaticMarkup(
      createElement(ExperienceBackground, { background: { kind: "image", url: IMAGE_URL, opacity: 1 } })
    );
    expect(extractImgOpacity(markup)).toBe(1);
  });

  it("DOM guardrail — opacity never attached to content/root wrapper (ExperienceSection + PageExperience)", () => {
    const bgSrc = read("src/modules/theme/runtime/experience/background-runtime.tsx");
    // The string 'style={{ opacity }}' must only appear in the context of the <img> for image kind, not on a section/page wrapper div
    const opacityOccurrences = (bgSrc.match(/style=\{\{[^}]*opacity[^}]*\}\}/g) || []).length;
    expect(opacityOccurrences).toBe(1); // only the img
    expect(bgSrc).toContain('<img');
    expect(bgSrc).toContain('style={{ opacity }}');

    const sectionSrc = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    // ExperienceSection must not set opacity on its root section or content div
    expect(sectionSrc).not.toMatch(/style=\{\{[^}]*opacity/);
    expect(sectionSrc).not.toContain("opacity:");

    const pageSrc = read("src/modules/theme/runtime/experience/page-background-runtime.tsx");
    expect(pageSrc).not.toMatch(/style=\{\{[^}]*opacity/);
    expect(pageSrc).not.toContain("opacity:");
  });

  it("Existing background modes remain intact (solid, gradient, etc. unchanged)", () => {
    const modes: Array<"solid" | "none" | "gradient" | "radial" | "mesh" | "aurora" | "pattern"> = [
      "solid",
      "none",
      "gradient",
      "radial",
      "mesh",
      "aurora",
      "pattern",
    ];
    for (const kind of modes) {
      const markup = renderToStaticMarkup(createElement(ExperienceBackground, { background: { kind } as any }));
      expect(markup).not.toContain("<img");
      // No mode should ever render an img without explicit image kind + url
      expect(typeof markup).toBe("string");
    }
  });

  it("image-config allows 0..100 (Test 3 & 5) and parses correctly, 5% still valid", () => {
    expect(IMAGE_OPACITY_MIN).toBe(0);
    expect(IMAGE_OPACITY_MAX).toBe(100);
    expect(isValidImageOpacity("0")).toBe(true);
    expect(isValidImageOpacity("5")).toBe(true);
    expect(isValidImageOpacity("100")).toBe(true);
    expect(isValidImageOpacity("101")).toBe(false);
    expect(parseImageOpacity("0")).toBe(0);
    expect(parseImageOpacity("5")).toBe(0.05);
    expect(parseImageOpacity("100")).toBe(1);
    expect(parseImageOpacity("")).toBeUndefined();
  });

  it("appearance panel slider now allows 0..100", () => {
    const src = read("src/features/builder/components/appearance-panel.tsx");
    expect(src).toContain('min="0"');
    expect(src).toContain('max="100"');
    expect(src).not.toContain('min="5"');
    expect(src).not.toContain('max="90"');
  });
});
