/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { convertSnapshotToData, convertLegacyToData } from "../service";
import type { StorefrontData } from "../types";

describe("convertSnapshotToData", () => {
  it("converts builder pages snapshot", () => {
    const snapshot = {
      pages: [{
        id: "p1", name: "Home", slug: "home", isHome: true, order: 0, theme: "default",
        sections: [{
          id: "s1", name: "Hero", order: 0, visible: true, locked: false,
          slots: [{ id: "sl1", moduleId: "hero.default", parentId: null, order: 0, visible: true, locked: false, config: { title: "Hello" }, metadata: {} }],
          metadata: {},
        }],
        metadata: {},
      }],
      themePackageId: "com.creatos.neon-dark",
      themeColors: { primary: "#6366F1", secondary: "#818CF8" },
      themeFonts: { heading: "Inter", body: "Inter" },
    };

    const data = convertSnapshotToData("t1", snapshot);
    expect(data.tenantId).toBe("t1");
    expect(data.pages).toHaveLength(1);
    expect(data.pages[0].slots[0].moduleId).toBe("hero.default");
    expect(data.pages[0].slots[0].config.title).toBe("Hello");
  });

  it("converts artifact snapshot", () => {
    const snapshot = {
      sections: [{ id: "sec1", type: "hero", order: 0, props: { title: "Hi" } }],
      theme: { primary: "#000", secondary: "#fff", mode: "light" },
      seo: { title: "Store", description: "Desc" },
    };
    const data = convertSnapshotToData("t1", snapshot);
    expect(data.pages).toHaveLength(1);
    expect(data.pages[0].slots[0].moduleId).toBe("hero");
    expect(data.theme.primary).toBe("#000");
  });

  it("handles empty snapshot", () => {
    const data = convertSnapshotToData("t1", {});
    expect(data.pages).toHaveLength(0);
    expect(data.tenantId).toBe("t1");
  });
});

describe("convertLegacyToData", () => {
  it("converts legacy data with profile and products", () => {
    const legacy = {
      profile: { name: "John", tagline: "Creator", profileImage: "/img.jpg" },
      products: [{ id: "p1", name: "T-Shirt", price: 499 }],
      gallery: [{ id: "g1", url: "/g.jpg" }],
    };
    const data = convertLegacyToData("t1", legacy);
    expect(data.pages).toHaveLength(1);
    expect(data.pages[0].slots.length).toBeGreaterThanOrEqual(2);
  });

  it("handles empty legacy data", () => {
    const data = convertLegacyToData("t1", {});
    expect(data.pages).toHaveLength(1);
    expect(data.pages[0].slots).toEqual([]);
  });
});
