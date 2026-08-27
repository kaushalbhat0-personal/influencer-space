import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ap = resolve("src/features/builder/components/appearance-panel.tsx");
const ws = resolve("src/features/builder/components/workspace.tsx");
const tb = resolve("src/features/builder/components/toolbar.tsx");
const cv = resolve("src/features/builder/canvas/interactive-canvas.tsx");

function src(p: string) { return readFileSync(p, "utf8"); }

describe("RCCF-BUILDER-04B — Visual hierarchy & save/publish communication", () => {
  it("F-04 labels are readable secondary hierarchy (10px zinc-400)", () => {
    const s = src(ap);
    expect(s).toContain("text-[10px] font-medium uppercase tracking-wider text-zinc-400");
    expect(s).toContain("text-[10px] font-semibold uppercase tracking-wider text-zinc-400"); // Appearance header
  });

  it("F-05 save status remains single canonical live region with distinct states", () => {
    const s = src(ap);
    // single live region
    expect((s.match(/role="status"/g) || []).length).toBe(1);
    expect(s).toContain('aria-live="polite"');
    expect(s).toContain('aria-atomic="true"');
    expect(s).toContain('data-testid="appearance-save-status"');
    // distinct visual states: Saving pulse amber, Saved emerald, Failed red
    expect(s).toContain('text-amber-400 animate-pulse');
    expect(s).toContain('text-emerald-400');
    expect(s).toContain('text-red-400');
    // never fake Saved before success: liveMessage set only after res.success
    expect(s).toContain('setLiveMessage("Saved")');
    expect(s).toContain('setLiveMessage("Failed to save")');
    expect(s).toContain('if (!res.success)');
  });

  it("F-06 pending vs locked distinct (locked amber border, pending dim)", () => {
    const s = src(ap);
    // locked styling amber border
    expect(s).toContain("border-amber-500/30");
    expect(s).toContain("border-amber-500/20");
    // locked not dimmed
    expect(s).toContain('locked ? "disabled:opacity-100" : "disabled:opacity-50"');
    // UPGRADE indicator preserved
    expect(s).toContain("UPGRADE");
    expect(s).toContain('aria-describedby={locked ? "appearance-upgrade-explanation"');
    // entitlement source remains authoritative (no client plan comparison)
    expect(s).toContain("const locked = !advancedBuilder");
    expect(s).not.toContain("planCode");
  });

  it("F-07 canvas dominance enhanced via frame border/ring/shadow", () => {
    const s = src(cv);
    expect(s).toContain("border-white/[0.15]");
    expect(s).toContain("ring-white/10");
    expect(s).toContain("shadow-black/60");
    // outer bg contract preserved (preview-gutter expects 900/40)
    expect(s).toContain("overflow-auto bg-zinc-900/40");
  });

  it("F-08 publish primary hierarchy", () => {
    const s = src(ws);
    expect(s).toContain('data-testid="builder-publish"');
    expect(s).toContain('aria-label="Publish website"');
    expect(s).toContain("bg-emerald-500");
    expect(s).toContain("text-zinc-950");
    expect(s).toContain("font-semibold");
    expect(s).toContain("handlePublish");
    expect(s).toContain("disabled={saving || publishing}");
  });

  it("F-09 preview/live/draft status is accessible group, not tabs", () => {
    const s = src(tb);
    expect(s).toContain('role="group"');
    expect(s).toContain('aria-label={`Publish status: ${current}`}');
    expect(s).toContain('aria-current');
    expect(s).toContain('title={item.hint}');
    // still shows three items
    expect(s).toContain('"Preview"');
    expect(s).toContain('"Live"');
    expect(s).toContain('"Draft"');
  });

  it("F-10 hero hint accessible and subordinate", () => {
    const s = src(ap);
    expect(s).toContain("Controls how your hero content is positioned and layered.");
    expect(s).toContain("text-[10px] leading-snug text-zinc-500");
  });

  it("F-11 background image hint discoverable when not image", () => {
    const s = src(ap);
    expect(s).toContain("Select");
    expect(s).toContain("Image");
    expect(s).toContain("to upload a custom background photo");
    expect(s).toContain('state.experienceBackground !== "image" && !locked');
  });

  it("no duplicate live regions, no nested interactive, preserved semantics", () => {
    const s = src(ap);
    expect((s.match(/aria-live/g) || []).length).toBe(1);
    expect(s).toContain('role="radiogroup"');
    expect(s).toContain('role="radio"');
  });
});
