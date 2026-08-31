import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

function read(rel: string) {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

describe("RCCF-12C — Builder cleanup", () => {
  it("Builder has no publish trigger", () => {
    const ws = read("src/features/builder/components/workspace.tsx");
    expect(ws).not.toContain('data-testid="builder-publish"');
    expect(ws).not.toContain("handlePublish");
    expect(ws).not.toContain("publishWebsite");
    expect(ws).not.toContain("getPublishFailurePresentation");
  });

  it("Toolbar has no View Live duplicate (status-bar owns it)", () => {
    const tb = read("src/features/builder/components/toolbar.tsx");
    expect(tb).not.toContain("View Live");
    expect(tb).not.toContain("ExternalLink");
    // status-bar still owns View Live
    const ws = read("src/features/builder/components/workspace.tsx");
    expect(ws).toContain("View Live");
    expect(ws).toContain('href={storefrontUrl}');
  });

  it("Section manager Delete requires confirmation", () => {
    const sm = read("src/features/builder/components/section-manager.tsx");
    expect(sm).toContain('confirm(`Delete "${section.name}"?`)');
  });

  it("Dead controls removed", () => {
    const sm = read("src/features/builder/components/section-manager.tsx");
    expect(sm).not.toContain("GripVertical");
    expect(sm).not.toContain('title="Use ↑↓');
    const sa = read("src/features/builder/canvas/section-actions.tsx");
    expect(sa).not.toContain("SectionDropZone");
    expect(sa).not.toContain("Plus");
  });

  it("Favorites state is independent", () => {
    const tc = read("src/features/builder/components/theme-card.tsx");
    expect(tc).toContain("favoritesOnly");
    expect(tc).not.toContain('__fav__');
    expect(tc).toContain("if (favoritesOnly) result = result.filter");
    expect(tc).toContain("aria-pressed={favoritesOnly}");
  });

  it("Both Save Draft controls call same handler", () => {
    const ws = read("src/features/builder/components/workspace.tsx");
    expect(ws).toContain('data-testid="builder-save-draft"');
    const tb = read("src/features/builder/components/toolbar.tsx");
    expect(tb).toContain('data-testid="toolbar-save-draft"');
    expect(ws).toContain("handleSaveDraft");
    expect(tb).toContain("onSave");
  });

  it("Hero avatar gap is mb-8 (32px)", () => {
    const r = read("src/lib/registry/components/renderers.tsx");
    expect(r).toContain('mb-8 h-28 w-28');
    expect(r).not.toContain('mb-4 h-28 w-28');
  });

  it("Single theme registry / resolver / experience", () => {
    const files = ["src/lib/theme/registry-new.ts", "src/lib/theme/resolver-new.ts", "src/modules/theme/runtime/experience/experience-registry.ts"];
    for (const f of files) expect(fs.existsSync(path.join(process.cwd(), f))).toBe(true);
    const ws = read("src/features/builder/components/workspace.tsx");
    expect(ws).not.toContain("ThemeRegistry");
    expect(ws).not.toContain("publishWebsite");
  });
});
