/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { validatePage, validateSection, validateSlot, validateBeforeSave } from "../validators";
import type { BuilderPage, BuilderSection, BuilderSlot } from "@/lib/builder/types";

function makePage(overrides?: Partial<BuilderPage>): BuilderPage {
  return { id: "p1", name: "Home", slug: "home", order: 0, isHome: true, sections: [], theme: "default", metadata: {}, ...overrides };
}

function makeSection(overrides?: Partial<BuilderSection>): BuilderSection {
  return { id: "s1", name: "Hero", order: 0, visible: true, locked: false, slots: [], metadata: {}, ...overrides };
}

function makeSlot(overrides?: Partial<BuilderSlot>): BuilderSlot {
  return { id: "sl1", moduleId: "hero.default", parentId: null, order: 0, visible: true, locked: false, config: {}, metadata: {}, ...overrides };
}

describe("validatePage edge cases", () => {
  it("returns multiple errors when multiple fields missing", () => {
    const errs = validatePage({});
    expect(errs.length).toBeGreaterThanOrEqual(3);
  });

  it("accepts empty name that is truthy", () => {
    const errs = validatePage({ id: "p1", name: " ", slug: "test" });
    expect(errs).not.toContain("Page id is required");
  });
});

describe("validateSection edge cases", () => {
  it("returns empty for fully valid section", () => {
    expect(validateSection(makeSection())).toEqual([]);
  });

  it("errors on missing name", () => {
    expect(validateSection({ id: "s1", slots: [], metadata: {} })).toContain("Section name is required");
  });
});

describe("validateSlot edge cases", () => {
  it("returns empty for fully valid slot", () => {
    expect(validateSlot(makeSlot())).toEqual([]);
  });

  it("errors on missing id", () => {
    expect(validateSlot({ moduleId: "m1", parentId: null, order: 0, visible: true, locked: false, config: {}, metadata: {} })).toContain("Slot id is required");
  });
});

describe("validateBeforeSave edge cases", () => {
  it("handles empty pages array", () => {
    expect(validateBeforeSave([])).toEqual([]);
  });

  it("handles pages with deeply nested errors", () => {
    const page = makePage({ id: "", sections: [{ id: "", name: "", order: 0, visible: true, locked: false, slots: [{ id: "", moduleId: "", parentId: null, order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} }] });
    const errs = validateBeforeSave([page]);
    expect(errs.length).toBeGreaterThanOrEqual(4);
  });
});
