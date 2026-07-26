/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { buildLayerTree, reorderLayers } from "../layers";
import type { BuilderPage, BuilderSection } from "@/lib/builder/types";

function makePage(overrides?: Partial<BuilderPage>): BuilderPage {
  return { id: "p1", name: "Home", slug: "home", order: 0, isHome: true, sections: [], theme: "default", metadata: {}, ...overrides };
}

function makeSection(id: string, name: string): BuilderSection {
  return { id, name, order: 0, visible: true, locked: false, slots: [], metadata: {} };
}

describe("buildLayerTree edge cases", () => {
  it("handles page with no sections", () => {
    const tree = buildLayerTree([makePage()], "p1");
    expect(tree).toEqual([]);
  });

  it("preserves hidden sections in tree", () => {
    const page = makePage({ sections: [{ ...makeSection("s1", "Hero"), visible: false }] });
    const tree = buildLayerTree([page], "p1");
    expect(tree[0].visible).toBe(false);
  });

  it("preserves locked state", () => {
    const page = makePage({ sections: [{ ...makeSection("s1", "Hero"), locked: true }] });
    const tree = buildLayerTree([page], "p1");
    expect(tree[0].locked).toBe(true);
  });

  it("handles multiple pages", () => {
    const pages = [makePage(), makePage({ id: "p2", name: "About", slug: "about" })];
    const tree = buildLayerTree(pages, "p2");
    expect(tree).toEqual([]); // p2 has no sections
  });

  it("initial collapsed is false", () => {
    const page = makePage({ sections: [makeSection("s1", "Hero")] });
    const tree = buildLayerTree([page], "p1");
    expect(tree[0].collapsed).toBe(false);
  });
});

describe("reorderLayers edge cases", () => {
  it("moves first section to last", () => {
    const page = makePage({ sections: [makeSection("s1", "A"), makeSection("s2", "B"), makeSection("s3", "C")] });
    const tree = buildLayerTree([page], "p1");
    const reordered = reorderLayers(tree, "s1", "s3", "after");
    expect(reordered.map((n) => n.id)).toEqual(["s2", "s3", "s1"]);
  });

  it("moves last section to first", () => {
    const page = makePage({ sections: [makeSection("s1", "A"), makeSection("s2", "B"), makeSection("s3", "C")] });
    const tree = buildLayerTree([page], "p1");
    const reordered = reorderLayers(tree, "s3", "s1", "before");
    expect(reordered.map((n) => n.id)).toEqual(["s3", "s1", "s2"]);
  });

  it("reorder with position 'after'", () => {
    const page = makePage({ sections: [makeSection("s1", "A"), makeSection("s2", "B")] });
    const tree = buildLayerTree([page], "p1");
    const reordered = reorderLayers(tree, "s1", "s2", "after");
    expect(reordered.map((n) => n.id)).toEqual(["s2", "s1"]);
  });

  it("reorder with position 'before' places before target", () => {
    const page = makePage({ sections: [makeSection("s1", "A"), makeSection("s2", "B")] });
    const tree = buildLayerTree([page], "p1");
    const reordered = reorderLayers(tree, "s2", "s1", "before");
    expect(reordered.map((n) => n.id)).toEqual(["s2", "s1"]);
  });

  it("handles reorder with 4+ sections", () => {
    const page = makePage({
      sections: [makeSection("s1", "A"), makeSection("s2", "B"), makeSection("s3", "C"), makeSection("s4", "D")],
    });
    const tree = buildLayerTree([page], "p1");
    const reordered = reorderLayers(tree, "s4", "s1", "before");
    expect(reordered.map((n) => n.id)).toEqual(["s4", "s1", "s2", "s3"]);
  });
});
