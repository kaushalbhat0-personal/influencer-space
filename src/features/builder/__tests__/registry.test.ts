/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { getAllSectionDefinitions, getCategories } from "../registry";

describe("registry wrappers", () => {
  it("getAllSectionDefinitions returns array", () => {
    const defs = getAllSectionDefinitions();
    expect(Array.isArray(defs)).toBe(true);
  });

  it("getCategories returns array", () => {
    const cats = getCategories();
    expect(Array.isArray(cats)).toBe(true);
  });

  it("definitions have required fields when present", () => {
    const defs = getAllSectionDefinitions();
    for (const d of defs) {
      expect(d).toHaveProperty("id");
      expect(d).toHaveProperty("category");
      expect(d).toHaveProperty("name");
    }
  });

  it("categories have category and components when present", () => {
    const cats = getCategories();
    for (const c of cats) {
      expect(c).toHaveProperty("category");
      expect(c).toHaveProperty("components");
    }
  });
});
