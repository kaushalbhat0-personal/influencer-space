/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { validateStorefrontData, validatePage, validateSlot, validatePreviewToken } from "../validators";

describe("validateStorefrontData", () => {
  it("validates complete data", () => {
    const data = {
      tenantId: "t1",
      pages: [{ id: "p1", slug: "home", isHome: true, slots: [{ id: "s1", moduleId: "hero.default", config: {} }], seo: { title: "Store", description: "desc" } }],
      theme: { primary: "#000", secondary: "#fff", accent: "#00f", mode: "dark", fonts: { heading: "Inter", body: "Inter" } },
      navigation: [],
    };
    expect(validateStorefrontData(data)).toBe(true);
  });

  it("rejects null", () => {
    expect(validateStorefrontData(null)).toBe(false);
  });

  it("rejects missing tenantId", () => {
    expect(validateStorefrontData({ pages: [], theme: {}, navigation: [] })).toBe(false);
  });

  it("rejects non-array pages", () => {
    expect(validateStorefrontData({ tenantId: "t1", pages: "not-array" })).toBe(false);
  });
});

describe("validatePage", () => {
  it("validates complete page", () => {
    expect(validatePage({ id: "p1", slug: "home", isHome: true, slots: [], seo: { title: "T", description: "D" } })).toBe(true);
  });

  it("rejects null", () => {
    expect(validatePage(null)).toBe(false);
  });

  it("rejects missing id", () => {
    expect(validatePage({ slug: "home", slots: [] })).toBe(false);
  });

  it("rejects non-array slots", () => {
    expect(validatePage({ id: "p1", slug: "home", slots: "invalid" })).toBe(false);
  });
});

describe("validateSlot", () => {
  it("validates complete slot", () => {
    expect(validateSlot({ id: "s1", moduleId: "hero.default", config: {} })).toBe(true);
  });

  it("rejects null", () => {
    expect(validateSlot(null)).toBe(false);
  });

  it("rejects missing moduleId", () => {
    expect(validateSlot({ id: "s1" })).toBe(false);
  });
});

describe("validatePreviewToken", () => {
  it("validates complete token", () => {
    expect(validatePreviewToken({ token: "abc", tenantId: "t1" })).toBe(true);
  });

  it("rejects null", () => {
    expect(validatePreviewToken(null)).toBe(false);
  });

  it("rejects missing token", () => {
    expect(validatePreviewToken({ tenantId: "t1" })).toBe(false);
  });
});
