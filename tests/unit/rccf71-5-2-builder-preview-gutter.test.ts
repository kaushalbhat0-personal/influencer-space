// RCCF-71.5.2 — Builder preview right-gutter guardrails.
// The scrollable content wrapper owns the end gutter; canonical frame widths
// and the desktop side rails remain unchanged.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd());

function read(file: string): string {
  return readFileSync(resolve(repoRoot, file), "utf8");
}

describe("RCCF-71.5.2 — Builder preview framing", () => {
  it("preserves the canonical device frame widths", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain('mobile: 375');
    expect(src).toContain('tablet: 768');
    expect(src).toContain('desktop: 1200');
    expect(src).toContain("width: DEVICE_WIDTHS[device] ?? 1200");
  });

  it("makes the padded preview wrapper contribute an end gutter to scrolling", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain("min-h-full min-w-max items-start justify-start p-8");
    expect(src).toContain("overflow-auto bg-zinc-900/40");
    expect(src).not.toContain("overflow-x-visible");
  });

  it("keeps the frame shrink-proof and centered when it fits", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain("mx-auto shrink-0");
    expect(src).not.toContain("scaleX");
    expect(src).not.toContain("width: \"100%\"");
  });

  it("does not change the Properties rail width", () => {
    const src = read("src/features/builder/components/workspace.tsx");
    expect(src).toContain('side="right"');
    expect(src).toContain("defaultWidth={260}");
  });

  it("keeps the canvas scoped so the document does not gain horizontal overflow", () => {
    const src = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(src).toContain('data-testid="builder-canvas"');
    expect(src).toContain("overflow-auto");
    expect(src).not.toContain("overflow-x-auto overflow-visible");
  });
});
