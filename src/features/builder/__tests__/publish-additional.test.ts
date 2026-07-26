/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi } from "vitest";
import { validateBeforePublish } from "../publish";
import type { BuilderPage } from "@/lib/builder/types";

function makePage(overrides?: Partial<BuilderPage>): BuilderPage {
  return { id: "p1", name: "Home", slug: "home", order: 0, isHome: true, sections: [], theme: "default", metadata: {}, ...overrides };
}

vi.mock("@/actions/builder.actions", () => ({
  publishWebsite: vi.fn().mockResolvedValue({ success: true, version: 1 }),
}));

describe("validateBeforePublish detail", () => {
  it("validates multiple pages", async () => {
    const page1 = makePage({ slug: "" });
    const page2 = makePage({ id: "p2", name: "About", slug: "about", sections: [{ id: "s1", name: "Hero", order: 0, visible: true, locked: false, slots: [], metadata: {} }] });
    const warnings = await validateBeforePublish([page1, page2]);
    expect(warnings.length).toBeGreaterThanOrEqual(2);
    expect(warnings.some((w) => w.includes("no slug"))).toBe(true);
    expect(warnings.some((w) => w.includes("no sections"))).toBe(true);
    expect(warnings.some((w) => w.includes("no blocks"))).toBe(true);
  });

  it("returns no warnings for fully valid page", async () => {
    const page = makePage({
      sections: [{ id: "s1", name: "Hero", order: 0, visible: true, locked: false, slots: [{ id: "sl1", moduleId: "hero.default", parentId: null, order: 0, visible: true, locked: false, config: {}, metadata: {} }], metadata: {} }],
    });
    const warnings = await validateBeforePublish([page]);
    expect(warnings).toEqual([]);
  });

  it("warns when multiple sections have no blocks", async () => {
    const page = makePage({
      sections: [
        { id: "s1", name: "Hero", order: 0, visible: true, locked: false, slots: [], metadata: {} },
        { id: "s2", name: "About", order: 1, visible: true, locked: false, slots: [], metadata: {} },
      ],
    });
    const warnings = await validateBeforePublish([page]);
    expect(warnings.filter((w) => w.includes("no blocks"))).toHaveLength(2);
  });
});
