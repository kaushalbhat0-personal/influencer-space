/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { createSnapshot, diffSnapshots, validateSnapshot } from "../snapshots";
import type { BuilderPage, BuilderSection, BuilderSlot } from "@/lib/builder/types";

function makePage(overrides?: Partial<BuilderPage>): BuilderPage {
  return { id: "p1", name: "Home", slug: "home", order: 0, isHome: true, sections: [], theme: "default", metadata: {}, ...overrides };
}

function slot(id = "sl1"): BuilderSlot {
  return { id, moduleId: "hero.default", parentId: null, order: 0, visible: true, locked: false, config: {}, metadata: {} };
}

function section(id = "s1", visible = true): BuilderSection {
  return { id, name: "Hero", order: 0, visible, locked: false, slots: [slot()], metadata: {} };
}

describe("createSnapshot edge cases", () => {
  it("handles empty pages array", () => {
    const snap = createSnapshot([], {});
    expect(snap.pages).toEqual([]);
  });

  it("handles null theme gracefully", () => {
    const snap = createSnapshot([makePage()], null as any);
    expect(typeof snap.theme).toBe("object");
  });

  it("creates unique ids", () => {
    const a = createSnapshot([makePage()], {});
    const b = createSnapshot([makePage()], {});
    expect(a.id).not.toBe(b.id);
  });

  it("preserves page data integrity", () => {
    const page = makePage({ sections: [section()] });
    const snap = createSnapshot([page], {});
    expect(snap.pages[0].sections[0].slots[0].moduleId).toBe("hero.default");
  });
});

describe("diffSnapshots edge cases", () => {
  it("detects page slug change", () => {
    const a = createSnapshot([makePage({ slug: "home" })], {});
    const b = createSnapshot([makePage({ slug: "new-home" })], {});
    const changes = diffSnapshots(a, b);
    expect(changes).toContain("page[0].slug");
  });

  it("detects section visibility change", () => {
    const a = createSnapshot([makePage({ sections: [section("s1", true)] })], {});
    const b = createSnapshot([makePage({ sections: [section("s1", false)] })], {});
    const changes = diffSnapshots(a, b);
    expect(changes).toContain("page[0].section[0].visible");
  });

  it("returns empty when no differences", () => {
    const pages = [makePage()];
    const a = createSnapshot(pages, {});
    const b = createSnapshot(pages, {});
    expect(diffSnapshots(a, b)).toEqual([]);
  });

  it("handles different page counts", () => {
    const a = createSnapshot([makePage()], {});
    const b = createSnapshot([makePage(), makePage({ id: "p2", name: "About", slug: "about" })], {});
    expect(diffSnapshots(a, b)).toContain("page-count");
  });
});

describe("validateSnapshot edge cases", () => {
  it("rejects null input", () => {
    expect(validateSnapshot(null as any)).toBe(false);
  });

  it("rejects undefined pages", () => {
    const snap = createSnapshot([makePage()], {});
    (snap as any).pages = undefined;
    expect(validateSnapshot(snap)).toBe(false);
  });

  it("rejects when page has missing id", () => {
    const snap = createSnapshot([{ ...makePage(), id: "" }], {});
    expect(validateSnapshot(snap)).toBe(false);
  });

  it("accepts pages with sections and slots", () => {
    const page = makePage({ sections: [section()] });
    const snap = createSnapshot([page], {});
    expect(validateSnapshot(snap)).toBe(true);
  });
});
