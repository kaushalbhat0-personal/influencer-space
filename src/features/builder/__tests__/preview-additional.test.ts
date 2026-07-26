/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import { createPreviewFrame, getPreviewUrl } from "../preview";
import type { BuilderPage } from "@/lib/builder/types";

function makePage(overrides?: Partial<BuilderPage>): BuilderPage {
  return { id: "p1", name: "Home", slug: "home", order: 0, isHome: true, sections: [], theme: "default", metadata: {}, ...overrides };
}

describe("createPreviewFrame detail", () => {
  it("includes all passed pages", () => {
    const pages = [makePage(), makePage({ id: "p2", name: "About", slug: "about" })];
    const frame = createPreviewFrame(pages, "mobile", "p1");
    expect(frame.pages).toHaveLength(2);
  });

  it("stores device type", () => {
    const frame = createPreviewFrame([], "tablet", null);
    expect(frame.device).toBe("tablet");
  });

  it("stores activePageId", () => {
    const frame = createPreviewFrame([makePage()], "desktop", "p1");
    expect(frame.activePageId).toBe("p1");
  });
});

describe("getPreviewUrl detail", () => {
  it("adds preview query parameter with version", () => {
    const url = getPreviewUrl("test", "about", 5);
    expect(url).toContain("preview=5");
  });

  it("uses version 1 when not specified", () => {
    const url = getPreviewUrl("test", "home");
    expect(url).toContain("preview=1");
  });

  it("creates correct URL format", () => {
    const url = getPreviewUrl("mybrand", "contact");
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain("mybrand.creatorsite.com");
  });

  it("handles subdomain with hyphens", () => {
    const url = getPreviewUrl("my-brand-store", "home");
    expect(url).toContain("my-brand-store.creatorsite.com");
  });
});
