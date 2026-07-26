/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { getSlotsForPage, resolveSlotConfig, shouldRenderSlot, createRendererContext } from "../renderer";
import type { StorefrontData } from "../types";

function makeData(overrides?: Partial<StorefrontData>): StorefrontData {
  return {
    tenantId: "t1",
    pages: [{ id: "p1", slug: "home", isHome: true, slots: [{ id: "s1", moduleId: "hero.default", config: { title: "Hi" } }], seo: { title: "Store", description: "desc" } }],
    theme: { primary: "#000", secondary: "#fff", accent: "#00f", mode: "dark", fonts: { heading: "Inter", body: "Inter" } },
    navigation: [],
    ...overrides,
  };
}

describe("getSlotsForPage", () => {
  it("returns slots for home page", () => {
    const slots = getSlotsForPage(makeData(), "home");
    expect(slots).toHaveLength(1);
    expect(slots[0].moduleId).toBe("hero.default");
  });

  it("returns slots for empty slug", () => {
    const slots = getSlotsForPage(makeData(), "");
    expect(slots).toHaveLength(1);
  });

  it("returns slots for specific page", () => {
    const data = makeData({ pages: [...makeData().pages, { id: "p2", slug: "about", isHome: false, slots: [{ id: "s2", moduleId: "about.default", config: {} }], seo: { title: "About", description: "About page" } }] });
    const slots = getSlotsForPage(data, "about");
    expect(slots).toHaveLength(1);
    expect(slots[0].moduleId).toBe("about.default");
  });

  it("returns empty array for unknown slug", () => {
    expect(getSlotsForPage(makeData(), "unknown")).toEqual([]);
  });
});

describe("resolveSlotConfig", () => {
  it("returns config as-is", () => {
    const config = { title: "Hello", padding: "lg" };
    expect(resolveSlotConfig({ id: "s1", moduleId: "hero.default", config })).toEqual(config);
  });

  it("returns empty object for missing config", () => {
    expect(resolveSlotConfig({ id: "s1", moduleId: "hero.default", config: {} })).toEqual({});
  });
});

describe("shouldRenderSlot", () => {
  it("returns true when moduleId is set", () => {
    expect(shouldRenderSlot({ id: "s1", moduleId: "hero.default", config: {} })).toBe(true);
  });

  it("returns true for any moduleId", () => {
    expect(shouldRenderSlot({ id: "s1", moduleId: "anything", config: {} })).toBe(true);
  });
});

describe("createRendererContext", () => {
  it("creates context with correct defaults", () => {
    const data = makeData();
    const ctx = createRendererContext(data, "t1");
    expect(ctx.tenantId).toBe("t1");
    expect(ctx.device).toBe("desktop");
    expect(ctx.preview).toBe(false);
  });

  it("supports preview mode", () => {
    const ctx = createRendererContext(makeData(), "t1", true);
    expect(ctx.preview).toBe(true);
  });
});
