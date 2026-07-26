/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { buildNavigation, buildMobileNavigation, getPageTitle, getSitemapEntries } from "../navigation";
import type { StorefrontData, StorefrontPage } from "../types";

function makeData(pages?: StorefrontPage[]): StorefrontData {
  return {
    tenantId: "t1",
    pages: pages ?? [
      { id: "p1", slug: "home", isHome: true, slots: [], seo: { title: "My Store", description: "desc" } },
      { id: "p2", slug: "products", isHome: false, slots: [], seo: { title: "Products", description: "desc" } },
    ],
    theme: { primary: "#000", secondary: "#fff", accent: "#00f", mode: "dark", fonts: { heading: "Inter", body: "Inter" } },
    navigation: [],
  };
}

describe("buildNavigation", () => {
  it("builds nav items for all pages", () => {
    const nav = buildNavigation(makeData(), "home");
    expect(nav).toHaveLength(2);
    expect(nav[0].label).toBe("Home");
    expect(nav[1].label).toBe("Products");
  });

  it("marks current page active", () => {
    const nav = buildNavigation(makeData(), "home");
    expect(nav[0].isActive).toBe(true);
    expect(nav[1].isActive).toBe(false);
  });

  it("marks products active when on products", () => {
    const nav = buildNavigation(makeData(), "products");
    expect(nav[0].isActive).toBe(false);
    expect(nav[1].isActive).toBe(true);
  });

  it("handles empty slug as home", () => {
    const nav = buildNavigation(makeData(), "");
    expect(nav[0].isActive).toBe(true);
  });
});

describe("buildMobileNavigation", () => {
  it("returns same structure as desktop", () => {
    const mobile = buildMobileNavigation(makeData(), "home");
    expect(mobile).toHaveLength(2);
  });
});

describe("getPageTitle", () => {
  it("returns title for home", () => {
    expect(getPageTitle(makeData(), "home")).toBe("My Store");
  });

  it("returns title for specific page", () => {
    expect(getPageTitle(makeData(), "products")).toBe("Products");
  });

  it("returns fallback for unknown page", () => {
    expect(getPageTitle(makeData(), "unknown")).toBe("CreatorStore");
  });

  it("returns fallback for empty slug", () => {
    expect(getPageTitle(makeData(), "")).toBe("My Store");
  });
});

describe("getSitemapEntries", () => {
  it("returns entries for all pages", () => {
    const entries = getSitemapEntries(makeData());
    expect(entries).toHaveLength(2);
    expect(entries[0].url).toBe("/");
    expect(entries[1].url).toBe("/products");
  });

  it("home page has highest priority", () => {
    const entries = getSitemapEntries(makeData());
    expect(entries[0].priority).toBe(1.0);
    expect(entries[1].priority).toBe(0.8);
  });
});
