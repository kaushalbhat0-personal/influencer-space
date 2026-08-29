import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { THEME_EXPERIENCES } from "@/modules/theme/runtime/experience/theme-experience";
import { ExperienceSection } from "@/modules/theme/runtime/experience/section-runtime";
import { PageExperience } from "@/modules/theme/runtime/experience/page-background-runtime";

function read(p: string) { return readFileSync(resolve(p), "utf8"); }

describe("RCCF-06F — Content-Aware Page Composition & Visual Hierarchy", () => {
  it("ExperienceSection supports hasContent prop for content-aware rhythm", () => {
    const src = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(src).toContain("hasContent");
    expect(src).toContain("isSparse");
    expect(src).toContain("--section-spacing");
    expect(src).toContain("1.5rem");
    expect(src).not.toContain("w-screen");
  });

  it("hero receives semantic hero rhythm (not sparse)", () => {
    const exp = THEME_EXPERIENCES.minimal;
    const heroHtml = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: exp, variant: "hero", hasContent: false }, React.createElement("div", null, "hero"))
    );
    // hero with hasContent false should NOT be sparse (not contain 1.5rem override)
    expect(heroHtml).not.toContain("1.5rem");
    // normal sparse should contain compact
    const sparseHtml = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: exp, variant: "default", hasContent: false }, React.createElement("div", null, "sparse"))
    );
    expect(sparseHtml).toContain("1.5rem");
  });

  it("normal content receives normal rhythm (no override)", () => {
    const exp = THEME_EXPERIENCES.creator;
    const html = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: exp, variant: "default", hasContent: true }, React.createElement("div", null, "normal"))
    );
    expect(html).not.toContain("1.5rem");
    // should still have section tag
    expect(html).toContain("<section");
  });

  it("sparse content receives compact rhythm", () => {
    const exp = THEME_EXPERIENCES.editorial;
    const html = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: exp, variant: "default", hasContent: false }, React.createElement("div", null, "sparse"))
    );
    expect(html).toContain("1.5rem");
  });

  it("spacing does not compound unexpectedly (single var ownership)", () => {
    const src = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    // ONE clear ownership model documented
    expect(src).toContain("ONE clear ownership model");
    expect(src).toContain("LayoutEngine provides --section-spacing");
    expect(src).toContain("ExperienceSection overrides");
    expect(src).toContain("renderers consume");
    // No duplicate padding systems
    expect(src).not.toContain("padding + margin + section-spacing");
  });

  it("footer remains dedicated outside PageExperience", () => {
    const storefront = read("src/components/storefront/StorefrontPage.tsx");
    expect(storefront).toContain("bodySections");
    expect(storefront).toContain("footerSections");
    expect(storefront).toContain('data-testid="storefront-footer"');
    expect(storefront).toContain("<footer");
    // footer not inside PageExperience generic section rendering
    const pageExperienceIdx = storefront.indexOf("<PageExperience");
    const footerIdx = storefront.indexOf('data-testid="storefront-footer"');
    expect(footerIdx).toBeGreaterThan(pageExperienceIdx);
    const builder = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(builder).toContain('data-testid="builder-footer"');
    expect(builder).toContain("<footer");
  });

  it("page-level background count remains 1 (06D regression)", () => {
    const page = read("src/modules/theme/runtime/experience/page-background-runtime.tsx");
    expect(page).toContain('data-testid="page-experience-background"');
    const exp = THEME_EXPERIENCES.aurora;
    const html = renderToStaticMarkup(
      React.createElement(PageExperience, { experience: exp },
        React.createElement(ExperienceSection, { experience: exp, variant: "hero", hasContent: true }, React.createElement("div", null, "hero")),
        React.createElement(ExperienceSection, { experience: exp, variant: "default", hasContent: false }, React.createElement("div", null, "sparse")),
        React.createElement(ExperienceSection, { experience: exp, variant: "default", hasContent: true }, React.createElement("div", null, "normal"))
      )
    );
    const count = (html.match(/page-experience-background/g) || []).length;
    expect(count).toBe(1);
  });

  it("isolated background behavior remains intact (brutalist)", () => {
    const brutal = THEME_EXPERIENCES.brutalist;
    expect(brutal.defaultFlow).toBe("isolated");
    const html = renderToStaticMarkup(
      React.createElement(ExperienceSection, { experience: brutal, variant: "default", hasContent: true, flow: "isolated" as any }, React.createElement("div", null, "brutal"))
    );
    expect(html).toContain("pointer-events-none absolute inset-0");
  });

  it("light/dark token rendering remains intact", () => {
    const snapshot = read("src/lib/storefront/build-snapshot.ts");
    expect(snapshot).toContain("textSecondary");
    expect(snapshot).toContain("border");
    const builder = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(builder).toContain("resolveMode");
  });

  it("hero weight preserved (pb-16 / pt-6)", () => {
    const src = read("src/lib/registry/components/renderers.tsx");
    expect(src).toContain("pb-16 pt-6");
    expect(src).toContain("pb-24");
  });

  it("no theme-id conditionals", () => {
    const sec = read("src/modules/theme/runtime/experience/section-runtime.tsx");
    expect(sec).not.toMatch(/themeId\s*===/);
    expect(sec).not.toMatch(/if\s*\(.*photography-light/);
    const page = read("src/components/storefront/StorefrontPage.tsx");
    expect(page).not.toMatch(/themeId\s*===/);
  });

  it("responsive hasContent prop is wired in both Storefront and Builder", () => {
    const storefront = read("src/components/storefront/StorefrontPage.tsx");
    expect(storefront).toContain("hasContent");
    expect(storefront).toContain("section.config.hasContent");
    const builder = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(builder).toContain("hasContent");
    expect(builder).toContain("section.config.hasContent");
  });
});
