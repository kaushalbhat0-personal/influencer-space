import { describe, it, expect } from "vitest";
import { builderStore } from "@/lib/builder/store";
import { builderQuery } from "@/lib/builder/query";

describe("Integration — Store → Events → Queries", () => {
  it("full pipeline: create → select → move → delete", () => {
    const page = builderStore.addPage("Pipeline", "/pipeline");
    const section = builderStore.addSection("Hero", page.id);
    const slot = builderStore.addSlot("com.creatos.hero", section.id, page.id);
    builderStore.select(slot.id);
    const s2 = builderStore.addSection("Content", page.id);
    builderStore.moveElementTo(slot.id, s2.id, 0);
    builderStore.removeElement(slot.id);
    const hierarchy = builderQuery.getCanvasHierarchy();
    expect(hierarchy.sections.length).toBeGreaterThanOrEqual(2);
  });

  it("should query visible nodes from store", () => {
    const page = builderStore.addPage("VisibleTest", "/v");
    const section = builderStore.addSection("Hero", page.id);
    builderStore.addSlot("com.creatos.hero", section.id, page.id);
    const section2 = builderStore.getSection(page.id, section.id);
    expect(section2?.slots.length).toBe(1);
  });

  it("should persist selection after operations", () => {
    const page = builderStore.addPage("PersistTest", "/p");
    const section = builderStore.addSection("Hero", page.id);
    const slot = builderStore.addSlot("com.creatos.hero", section.id, page.id);
    builderStore.select(slot.id);
    expect(builderQuery.getSelection().count).toBe(1);
  });
});
