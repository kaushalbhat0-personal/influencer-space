/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateBeforePublish } from "../publish";
import type { BuilderPage } from "@/lib/builder/types";

function makePage(overrides?: Partial<BuilderPage>): BuilderPage {
  return {
    id: "p1", name: "Home", slug: "home", order: 0, isHome: true,
    sections: [], theme: "default", metadata: {},
    ...overrides,
  };
}

vi.mock("@/actions/builder.actions", () => ({
  publishWebsite: vi.fn().mockResolvedValue({ success: true, version: 1 }),
}));

describe("validateBeforePublish", () => {
  it("returns empty for valid pages", async () => {
    const page = makePage({
      sections: [{
        id: "s1", name: "Hero", order: 0, visible: true, locked: false,
        slots: [{ id: "sl1", moduleId: "hero.default", parentId: null, order: 0, visible: true, locked: false, config: {}, metadata: {} }],
        metadata: {},
      }],
    });
    const warnings = await validateBeforePublish([page]);
    expect(warnings).toEqual([]);
  });

  it("warns when page has no slug", async () => {
    const page = makePage({ slug: "" });
    const warnings = await validateBeforePublish([page]);
    expect(warnings.some((w) => w.includes("no slug"))).toBe(true);
  });

  it("warns when page has no sections", async () => {
    const page = makePage();
    const warnings = await validateBeforePublish([page]);
    expect(warnings.some((w) => w.includes("no sections"))).toBe(true);
  });

  it("warns when section has no blocks", async () => {
    const page = makePage({
      sections: [{ id: "s1", name: "Hero", order: 0, visible: true, locked: false, slots: [], metadata: {} }],
    });
    const warnings = await validateBeforePublish([page]);
    expect(warnings.some((w) => w.includes("no blocks"))).toBe(true);
  });

  it("returns multiple warnings for multiple issues", async () => {
    const page = makePage({ slug: "", sections: [{ id: "s1", name: "Hero", order: 0, visible: true, locked: false, slots: [], metadata: {} }] });
    const warnings = await validateBeforePublish([page]);
    expect(warnings.length).toBeGreaterThanOrEqual(2);
  });
});
