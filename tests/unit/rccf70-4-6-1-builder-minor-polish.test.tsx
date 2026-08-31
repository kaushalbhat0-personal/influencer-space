import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("RCCF-70.4.6.1 Builder minor polish guardrails", () => {
  it("keeps the mobile Sections sheet scrollable with viewport and safe-area padding", () => {
    const source = read("src/features/builder/components/mobile-panel.tsx");
    expect(source).toContain("max-h-[calc(100dvh-1rem)]");
    expect(source).toContain("max-h-[calc(100dvh-4rem)] overflow-y-auto");
    expect(source).toContain("pb-[env(safe-area-inset-bottom)]");
    expect(source).not.toContain("max-h-[80vh]");
  });

  it("polishes the canvas frame without adding preview content", () => {
    const source = read("src/features/builder/canvas/interactive-canvas.tsx");
    expect(source).toContain("bg-zinc-900/40");
    expect(source).toContain("ring-1 ring-white/5");
    expect(source).not.toContain("Loading live preview..." + " persists");
  });

  it("raises secondary rail metadata contrast without widening the frozen rails", () => {
    const sections = read("src/features/builder/components/section-manager.tsx");
    const website = read("src/features/builder/components/website-panel.tsx");
    const workspace = read("src/features/builder/components/workspace.tsx");
    expect(sections).toContain("text-[9px] text-zinc-500 shrink-0");
    expect(sections).toContain("text-zinc-500 hover:bg-white/10");
    expect(website).toContain("text-[9px] font-medium text-zinc-500 uppercase tracking-wider");
    expect(workspace).toContain("defaultWidth={260}");
  });
});
