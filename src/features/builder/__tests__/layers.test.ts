/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { buildLayerTree, reorderLayers } from "../layers";
import type { BuilderPage, BuilderSection } from "@/lib/builder/types";

function makePage(overrides?: Partial<BuilderPage>): BuilderPage {
  return {
    id: "p1",
    name: "Home",
    slug: "home",
    order: 0,
    isHome: true,
    sections: [],
    theme: "default",
    metadata: {},
    ...overrides,
  };
}

function makeSection(id: string, name: string, slotCount = 0): BuilderSection {
  return {
    id,
    name,
    order: 0,
    visible: true,
    locked: false,
    slots: Array.from({ length: slotCount }, (_, i) => ({
      id: `${id}-slot-${i}`,
      moduleId: `module-${i}`,
      parentId: null,
      order: i,
      visible: true,
      locked: false,
      config: {},
      metadata: {},
    })),
    metadata: {},
  };
}

describe("buildLayerTree", () => {
  it("returns empty array when no active page", () => {
    expect(buildLayerTree([makePage()], null)).toEqual([]);
  });

  it("returns empty array when active page not found", () => {
    expect(buildLayerTree([makePage()], "nonexistent")).toEqual([]);
  });

  it("builds tree from active page sections", () => {
    const page = makePage({
      sections: [makeSection("s1", "Hero"), makeSection("s2", "About")],
    });
    const tree = buildLayerTree([page], "p1");
    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe("s1");
    expect(tree[0].type).toBe("section");
    expect(tree[1].id).toBe("s2");
  });

  it("includes slot children", () => {
    const page = makePage({
      sections: [makeSection("s1", "Hero", 2)],
    });
    const tree = buildLayerTree([page], "p1");
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].type).toBe("slot");
  });
});

describe("reorderLayers", () => {
  it("moves a section before another", () => {
    const page = makePage({
      sections: [makeSection("s1", "Hero"), makeSection("s2", "About"), makeSection("s3", "Gallery")],
    });
    const tree = buildLayerTree([page], "p1");
    const reordered = reorderLayers(tree, "s3", "s1", "before");
    expect(reordered[0].id).toBe("s3");
    expect(reordered[1].id).toBe("s1");
    expect(reordered[2].id).toBe("s2");
  });

  it("moves a section after another", () => {
    const page = makePage({
      sections: [makeSection("s1", "Hero"), makeSection("s2", "About"), makeSection("s3", "Gallery")],
    });
    const tree = buildLayerTree([page], "p1");
    const reordered = reorderLayers(tree, "s1", "s3", "after");
    expect(reordered[0].id).toBe("s2");
    expect(reordered[1].id).toBe("s3");
    expect(reordered[2].id).toBe("s1");
  });

  it("returns original when source not found", () => {
    const tree = buildLayerTree([makePage({ sections: [makeSection("s1", "Hero")] })], "p1");
    const reordered = reorderLayers(tree, "nonexistent", "s1", "before");
    expect(reordered).toEqual(tree);
  });

  it("returns original when target not found", () => {
    const tree = buildLayerTree([makePage({ sections: [makeSection("s1", "Hero")] })], "p1");
    const reordered = reorderLayers(tree, "s1", "nonexistent", "before");
    expect(reordered).toEqual(tree);
  });

  it("handles single section (no-op)", () => {
    const tree = buildLayerTree([makePage({ sections: [makeSection("s1", "Hero")] })], "p1");
    const reordered = reorderLayers(tree, "s1", "s1", "after");
    expect(reordered).toHaveLength(1);
    expect(reordered[0].id).toBe("s1");
  });
});
