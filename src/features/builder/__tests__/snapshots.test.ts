/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { createSnapshot, diffSnapshots, validateSnapshot } from "../snapshots";
import type { BuilderPage } from "@/lib/builder/types";

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

describe("createSnapshot", () => {
  it("creates snapshot with id and version", () => {
    const snapshot = createSnapshot([makePage()], { primary: "#000" });
    expect(snapshot.id).toBeTruthy();
    expect(snapshot.version).toBeGreaterThan(0);
    expect(snapshot.label).toContain("Snapshot");
  });

  it("deep copies pages", () => {
    const pages = [makePage()];
    const snapshot = createSnapshot(pages, {});
    pages[0].name = "Modified";
    expect(snapshot.pages[0].name).toBe("Home");
  });

  it("includes createdAt timestamp", () => {
    const snapshot = createSnapshot([makePage()], {});
    expect(new Date(snapshot.createdAt).getTime()).not.toBeNaN();
  });

  it("uses custom label", () => {
    const snapshot = createSnapshot([makePage()], {}, "Pre-publish");
    expect(snapshot.label).toBe("Pre-publish");
  });

  it("increments version counter", () => {
    const a = createSnapshot([makePage()], {});
    const b = createSnapshot([makePage()], {});
    expect(b.version).toBeGreaterThan(a.version);
  });
});

describe("diffSnapshots", () => {
  it("detects page count changes", () => {
    const a = createSnapshot([makePage()], {});
    const b = createSnapshot([makePage(), makePage({ id: "p2", slug: "about" })], {});
    const changes = diffSnapshots(a, b);
    expect(changes).toContain("page-count");
  });

  it("detects section count changes", () => {
    const page = makePage();
    const a = createSnapshot([page], {});
    const b = createSnapshot([{ ...page, sections: [{ id: "s1", name: "Hero", order: 0, visible: true, locked: false, slots: [], metadata: {} }] }], {});
    const changes = diffSnapshots(a, b);
    expect(changes).toContain("page[0].section-count");
  });

  it("returns empty for identical snapshots", () => {
    const a = createSnapshot([makePage()], {});
    const b = createSnapshot([makePage()], {});
    const changes = diffSnapshots(a, b);
    expect(changes).toEqual([]);
  });
});

describe("validateSnapshot", () => {
  it("returns true for valid snapshot", () => {
    const snapshot = createSnapshot([makePage()], {});
    expect(validateSnapshot(snapshot)).toBe(true);
  });

  it("returns false when id is missing", () => {
    const snapshot = createSnapshot([makePage()], {});
    (snapshot as any).id = "";
    expect(validateSnapshot(snapshot)).toBe(false);
  });

  it("returns false when pages is not an array", () => {
    const snapshot = createSnapshot([makePage()], {});
    (snapshot as any).pages = null;
    expect(validateSnapshot(snapshot)).toBe(false);
  });

  it("returns false when page has no slug", () => {
    const snapshot = createSnapshot([makePage()], {});
    (snapshot as any).pages[0].slug = "";
    expect(validateSnapshot(snapshot)).toBe(false);
  });

  it("returns false when section has no id", () => {
    const page = makePage({ sections: [{ id: "", name: "Bad", order: 0, visible: true, locked: false, slots: [], metadata: {} }] });
    const snapshot = createSnapshot([page], {});
    expect(validateSnapshot(snapshot)).toBe(false);
  });
});
