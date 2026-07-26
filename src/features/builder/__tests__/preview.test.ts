/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { createPreviewFrame, getPreviewUrl } from "../preview";
import type { BuilderPage } from "@/lib/builder/types";

function makePage(overrides?: Partial<BuilderPage>): BuilderPage {
  return {
    id: "p1", name: "Home", slug: "home", order: 0, isHome: true,
    sections: [], theme: "default", metadata: {},
    ...overrides,
  };
}

describe("createPreviewFrame", () => {
  it("creates a preview frame with pages and device", () => {
    const frame = createPreviewFrame([makePage()], "desktop", "p1");
    expect(frame.pages).toHaveLength(1);
    expect(frame.device).toBe("desktop");
    expect(frame.activePageId).toBe("p1");
  });

  it("deep copies pages", () => {
    const pages = [makePage()];
    const frame = createPreviewFrame(pages, "mobile", "p1");
    pages[0].name = "Changed";
    expect(frame.pages[0].name).toBe("Home");
  });

  it("accepts null activePageId", () => {
    const frame = createPreviewFrame([], "tablet", null);
    expect(frame.activePageId).toBeNull();
  });
});

describe("getPreviewUrl", () => {
  it("generates home page preview URL", () => {
    const url = getPreviewUrl("mystore", "home");
    expect(url).toContain("mystore.creatorsite.com");
    expect(url).toContain("?preview=1");
  });

  it("generates page preview URL with version", () => {
    const url = getPreviewUrl("mystore", "about", 3);
    expect(url).toContain("/about");
    expect(url).toContain("?preview=3");
  });

  it("home page has no path", () => {
    const url = getPreviewUrl("test", "home");
    expect(url).not.toContain("/home");
  });
});
