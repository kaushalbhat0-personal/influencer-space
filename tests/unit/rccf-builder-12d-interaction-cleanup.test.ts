import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

function read(rel: string) {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("RCCF-12D — interaction cleanup", () => {
  it("No cursor-grab in Builder canvas", () => {
    const sa = read("src/features/builder/canvas/section-actions.tsx");
    expect(sa).not.toContain("cursor-grab");
    expect(sa).not.toContain("cursor-grabbing");
    const sm = read("src/features/builder/components/section-manager.tsx");
    // Only legitimate cursor-pointer for selectable cards/theme cards remains
    expect(sm).not.toContain("cursor-grab");
  });

  it('No "Drag to reorder" affordance', () => {
    const sa = read("src/features/builder/canvas/section-actions.tsx");
    expect(sa).not.toContain("Drag to reorder");
    const sm = read("src/features/builder/components/section-manager.tsx");
    expect(sm).not.toContain("Drag to reorder");
  });

  it("No dead GripVertical drag handle", () => {
    const sm = read("src/features/builder/components/section-manager.tsx");
    expect(sm).not.toContain("GripVertical");
    const sa = read("src/features/builder/canvas/section-actions.tsx");
    // GripVertical may remain if used elsewhere, but drag handle should be gone
    // After 12D, section-actions should not contain GripVertical at all
    expect(sa).not.toContain("GripVertical");
  });

  it("No obsolete Builder Publish control", () => {
    const ws = read("src/features/builder/components/workspace.tsx");
    expect(ws).not.toContain('builder-publish');
    expect(ws).not.toContain('handlePublish');
    expect(ws).not.toContain('publishWebsite');
  });

  it("Save Draft remains", () => {
    const ws = read("src/features/builder/components/workspace.tsx");
    expect(ws).toContain('builder-save-draft');
    expect(ws).toContain('handleSaveDraft');
    const tb = read("src/features/builder/components/toolbar.tsx");
    expect(tb).toContain('toolbar-save-draft');
  });

  it("Move Up/Down remains functional", () => {
    const sm = read("src/features/builder/components/section-manager.tsx");
    expect(sm).toContain('section-${tid}-up');
    expect(sm).toContain('section-${tid}-down');
    expect(sm).toContain('onMoveUp');
    expect(sm).toContain('onMoveDown');
  });

  it("Delete remains functional", () => {
    const sm = read("src/features/builder/components/section-manager.tsx");
    expect(sm).toContain('section-${tid}-delete');
    expect(sm).toContain('confirm(`Delete');
  });

  it("Appearance controls remain local-preview", () => {
    const ap = read("src/features/builder/components/appearance-panel.tsx");
    expect(ap).toContain('onPreviewChange');
    expect(ap).toContain('applyChange');
  });

  it("No empty click handlers in audited Builder components", () => {
    const files = [
      "src/features/builder/components/workspace.tsx",
      "src/features/builder/components/toolbar.tsx",
      "src/features/builder/components/section-manager.tsx",
      "src/features/builder/canvas/section-actions.tsx",
      "src/features/builder/components/theme-card.tsx",
    ];
    for (const f of files) {
      const c = read(f);
      expect(c).not.toMatch(/onClick=\{\(\) => \{\}\}/);
      expect(c).not.toMatch(/onClick=\{.*empty.*\}/i);
    }
  });

  it("No dead href=\"#\" Builder links", () => {
    const files = [
      "src/features/builder/components/workspace.tsx",
      "src/features/builder/components/toolbar.tsx",
      "src/features/builder/components/section-manager.tsx",
    ];
    for (const f of files) {
      const c = read(f);
      expect(c).not.toContain('href="#"');
      expect(c).not.toContain('href="javascript:');
    }
  });

  it("Hero remains mb-8", () => {
    const r = read("src/lib/registry/components/renderers.tsx");
    expect(r).toContain('mb-8 h-28 w-28');
  });
});
