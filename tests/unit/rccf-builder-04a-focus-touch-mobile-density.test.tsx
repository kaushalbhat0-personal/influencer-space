import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appearancePath = resolve("src/features/builder/components/appearance-panel.tsx");
const sectionPath = resolve("src/features/builder/components/section-manager.tsx");

function read(p: string) {
  return readFileSync(p, "utf8");
}

describe("RCCF-BUILDER-04A — Focus, touch targets & mobile density", () => {
  it("F-01 chip contains focus-visible ring", () => {
    const src = read(appearancePath);
    expect(src).toContain("focus-visible:ring-2");
    expect(src).toContain("focus-visible:ring-indigo-400");
    expect(src).toContain("focus-visible:ring-offset-zinc-950");
    expect(src).toContain("focus-visible:outline-none");
    // selection + disabled still intact
    expect(src).toContain('role="radio"');
    expect(src).toContain("aria-checked");
  });

  it("F-02 section actions have approx 44px touch target on mobile", () => {
    const src = read(sectionPath);
    expect(src).toContain("min-h-[44px]");
    expect(src).toContain("min-w-[44px]");
    expect(src).toContain("lg:min-h-[28px]");
    expect(src).toContain("lg:min-w-[28px]");
    // aria labels preserved
    expect(src).toContain('aria-label={`Move ${section.name} up`}');
    expect(src).toContain('aria-label={`Move ${section.name} down`}');
    expect(src).toContain("aria-label={`Duplicate");
    expect(src).toContain("aria-label={`Delete");
    // focus ring on actions
    expect(src).toContain("focus-visible:ring-2");
  });

  it("F-02 grip no longer advertises drag cursor", () => {
    const src = read(sectionPath);
    expect(src).not.toContain("cursor-grab");
    expect(src).not.toContain("active:cursor-grabbing");
    expect(src).toContain("cursor-default");
    expect(src).toContain("Use ↑↓ to reorder");
  });

  it("F-03 Add Section grid is single column on mobile with comfortable spacing", () => {
    const src = read(sectionPath);
    expect(src).toContain("grid-cols-1");
    expect(src).toContain("lg:grid-cols-2");
    expect(src).toContain("gap-2");
    expect(src).toContain("px-3 py-2.5");
    expect(src).toContain("lg:px-2 lg:py-1.5");
    // behavior preserved
    expect(src).toContain("DEFAULT_SECTIONS.map");
    expect(src).toContain("add-section-");
  });

  it("does not change selection semantics", () => {
    const src = read(sectionPath);
    expect(src).toContain('role="listitem"');
    expect(src).toContain("aria-pressed={isSelected}");
    expect(src).toContain("stopPropagation");
  });
});
