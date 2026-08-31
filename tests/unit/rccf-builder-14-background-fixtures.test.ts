import { describe, it, expect } from "vitest";
import fs from "fs";

describe("RCCF-BUILDER-14 — background fixture opacity", () => {
  it("DecorationLayer uses visible opacity (not 0.05)", () => {
    const src = fs.readFileSync("src/modules/theme/runtime/experience/decoration-runtime.tsx", "utf8");
    expect(src).toContain("opacity-[0.14]");
    expect(src).not.toMatch(/decoration-layer[^]*opacity-\[0\.05\]/);
    expect(src).toContain('aria-hidden');
    expect(src).toContain('pointer-events-none');
  });
  it("IllustrationLayer uses visible opacity", () => {
    const src = fs.readFileSync("src/modules/theme/runtime/experience/decoration-runtime.tsx", "utf8");
    expect(src).toContain("opacity-[0.12]");
  });
  it("Background pattern svg uses visible opacity", () => {
    const src = fs.readFileSync("src/modules/theme/runtime/experience/background-runtime.tsx", "utf8");
    expect(src).toContain("opacity-[0.12]");
    expect(src).not.toMatch(/pattern[^]*opacity-\[0\.05\]/);
  });
  it("Glow uses subordinate but visible mix (16%)", () => {
    const src = fs.readFileSync("src/modules/theme/runtime/experience/background-runtime.tsx", "utf8");
    expect(src).toContain("16%");
  });
  it("Foreground isolation: background image opacity only on img, not parent", () => {
    const src = fs.readFileSync("src/modules/theme/runtime/experience/background-runtime.tsx", "utf8");
    expect(src).toMatch(/<img[^]*style=\{\{ opacity/);
    expect(src).not.toMatch(/className="[^"]*opacity[^"]*"[^]*data-element-id/);
  });
  it("No themeId conditionals introduced", () => {
    const a = fs.readFileSync("src/modules/theme/runtime/experience/decoration-runtime.tsx", "utf8");
    const b = fs.readFileSync("src/modules/theme/runtime/experience/background-runtime.tsx", "utf8");
    expect(a).not.toMatch(/themeId\s*===/);
    expect(b).not.toMatch(/themeId\s*===/);
    expect(a).not.toMatch(/switch\s*\(\s*themeId/);
  });
});
