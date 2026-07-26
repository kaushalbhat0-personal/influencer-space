/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { validatePage, validateSection, validateSlot, validateBeforeSave } from "../validators";
import type { BuilderPage, BuilderSection, BuilderSlot } from "@/lib/builder/types";

function makePage(overrides?: Partial<BuilderPage>): BuilderPage {
  return {
    id: "p1", name: "Home", slug: "home", order: 0, isHome: true,
    sections: [], theme: "default", metadata: {},
    ...overrides,
  };
}

function makeSection(overrides?: Partial<BuilderSection>): BuilderSection {
  return {
    id: "s1", name: "Hero", order: 0, visible: true, locked: false,
    slots: [], metadata: {},
    ...overrides,
  };
}

function makeSlot(overrides?: Partial<BuilderSlot>): BuilderSlot {
  return {
    id: "sl1", moduleId: "hero.default", parentId: null, order: 0,
    visible: true, locked: false, config: {}, metadata: {},
    ...overrides,
  };
}

describe("validatePage", () => {
  it("returns empty for valid page", () => {
    expect(validatePage(makePage())).toEqual([]);
  });

  it("errors when id is missing", () => {
    const errs = validatePage({ name: "Test", slug: "test" });
    expect(errs).toContain("Page id is required");
  });

  it("errors when name is missing", () => {
    const errs = validatePage({ id: "p1", slug: "test" });
    expect(errs).toContain("Page name is required");
  });

  it("errors when slug is missing", () => {
    const errs = validatePage({ id: "p1", name: "Test" });
    expect(errs).toContain("Page slug is required");
  });
});

describe("validateSection", () => {
  it("returns empty for valid section", () => {
    expect(validateSection(makeSection())).toEqual([]);
  });

  it("errors when id is missing", () => {
    expect(validateSection({ name: "Test" })).toContain("Section id is required");
  });

  it("errors when name is missing", () => {
    expect(validateSection({ id: "s1" })).toContain("Section name is required");
  });
});

describe("validateSlot", () => {
  it("returns empty for valid slot", () => {
    expect(validateSlot(makeSlot())).toEqual([]);
  });

  it("errors when id is missing", () => {
    expect(validateSlot({ moduleId: "m1" })).toContain("Slot id is required");
  });

  it("errors when moduleId is missing", () => {
    expect(validateSlot({ id: "sl1" })).toContain("Slot moduleId is required");
  });
});

describe("validateBeforeSave", () => {
  it("returns empty for valid pages", () => {
    const page = makePage({ sections: [makeSection({ slots: [makeSlot()] })] });
    expect(validateBeforeSave([page])).toEqual([]);
  });

  it("collects errors across pages, sections, slots", () => {
    const page = makePage({ id: "", sections: [makeSection({ id: "", slots: [makeSlot({ id: "" })] })] });
    const errs = validateBeforeSave([page]);
    expect(errs.length).toBeGreaterThanOrEqual(3);
  });
});
