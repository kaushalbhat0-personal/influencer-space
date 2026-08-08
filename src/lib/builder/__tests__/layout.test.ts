// ── Builder Layout Snapshot — Presentation Persistence ────
// RCCF-LAUNCH-TRACK-04B (Phase 2). `config.presentation` must survive the
// draft → snapshot → publish → preview flattening exactly like Theme/Layout/
// Navigation, and it must never affect canonical section identities.

import { describe, it, expect } from "vitest";
import { builderPagesToLayoutSnapshot, slotIdFromSectionId } from "@/lib/builder/layout";
import type { BuilderPage } from "@/lib/builder/types";

function pageWithSlot(moduleId: string, config: Record<string, unknown>): BuilderPage {
  return {
    id: "page_home",
    name: "Home",
    slug: "/",
    order: 0,
    isHome: true,
    theme: "com.creatos.neon-dark",
    metadata: {},
    sections: [
      {
        id: "sec_products",
        name: "Products",
        order: 0,
        visible: true,
        locked: false,
        metadata: {},
        slots: [
          {
            id: "slot_products",
            moduleId,
            parentId: "sec_products",
            order: 0,
            visible: true,
            locked: false,
            config,
            metadata: {},
          },
        ],
      },
    ],
  };
}

describe("builderPagesToLayoutSnapshot (publish persistence)", () => {
  it("carries config.presentation into the layout snapshot (draft → publish → preview)", () => {
    const presentation = { titleOverride: "Menu", descriptionOverride: "Fresh.", hideWhenEmpty: false };
    const snapshot = builderPagesToLayoutSnapshot([pageWithSlot("products.grid", { columns: 3, presentation })]);
    const section = snapshot.pages[0]!.sections[0]!;
    expect(section.config).toMatchObject({ columns: 3, presentation });
    expect(section.moduleId).toBe("products.grid");
  });

  it("keeps canonical module ids untouched when presentation is overridden", () => {
    const snapshot = builderPagesToLayoutSnapshot([
      pageWithSlot("gallery.grid", { presentation: { titleOverride: "Portfolio" } }),
    ]);
    expect(snapshot.pages[0]!.sections[0]!.moduleId).toBe("gallery.grid");
    expect(slotIdFromSectionId(snapshot.pages[0]!.sections[0]!.id)).toBe("slot_products");
  });

  it("omits empty sections (an empty section cannot render)", () => {
    const page: BuilderPage = {
      ...pageWithSlot("products.grid", {}),
      sections: [
        pageWithSlot("products.grid", {}).sections[0]!,
        { id: "sec_empty", name: "Empty", order: 1, visible: true, locked: false, metadata: {}, slots: [] },
      ],
    };
    const snapshot = builderPagesToLayoutSnapshot([page]);
    expect(snapshot.pages[0]!.sections).toHaveLength(1);
  });

  it("preserves section+slot visibility through flattening", () => {
    const page = pageWithSlot("products.grid", {});
    const hidden = builderPagesToLayoutSnapshot([
      { ...page, sections: [{ ...page.sections[0]!, slots: [{ ...page.sections[0]!.slots[0]!, visible: false }] }] },
    ]);
    expect(hidden.pages[0]!.sections[0]!.visible).toBe(false);
  });
});
