import { describe, it, expect, beforeEach } from "vitest";
import { BuilderStore } from "@/lib/builder/store";

describe("BuilderStore", () => {
  let store: BuilderStore;

  beforeEach(() => {
    store = new BuilderStore();
  });

  describe("dirty state", () => {
    it("starts clean", () => {
      expect(store.isDirty).toBe(false);
    });

    it("markDirty sets isDirty to true", () => {
      store.markDirty();
      expect(store.isDirty).toBe(true);
    });

    it("markClean sets isDirty to false", () => {
      store.markDirty();
      store.markClean();
      expect(store.isDirty).toBe(false);
    });
  });

  describe("selection", () => {
    it("starts with no selection", () => {
      expect(store.getSelectedIds()).toEqual([]);
    });

    it("selects a single element", () => {
      const section = store.addSection("Test");
      store.select(section.id);
      expect(store.isSelected(section.id)).toBe(true);
    });

    it("clearSelection deselects everything", () => {
      const section = store.addSection("Test");
      store.select(section.id);
      store.clearSelection();
      expect(store.getSelectedIds()).toEqual([]);
    });

    it("multi-select adds multiple ids", () => {
      const s1 = store.addSection("S1");
      const s2 = store.addSection("S2");
      store.select(s1.id);
      store.select(s2.id, true);
      expect(store.isSelected(s1.id)).toBe(true);
      expect(store.isSelected(s2.id)).toBe(true);
    });
  });

  describe("sections", () => {
    it("creating initial state has 2 default sections", () => {
      const page = store.activePage;
      expect(page?.sections.length).toBe(2);
      expect(page?.sections[0]?.name).toBe("Hero");
      expect(page?.sections[1]?.name).toBe("About");
    });

    it("addSection appends a new section", () => {
      const section = store.addSection("Products");
      const page = store.activePage;
      expect(page?.sections.find((s) => s.id === section.id)).toBeDefined();
      expect(section.name).toBe("Products");
    });

    it("removeSection deletes a section", () => {
      const page = store.activePage;
      if (!page) { expect(false).toBe(true); return; }
      const sectionId = page.sections[0]?.id;
      if (!sectionId) { expect(false).toBe(true); return; }
      store.removeSection(sectionId);
      const updated = store.activePage;
      expect(updated?.sections.find((s) => s.id === sectionId)).toBeUndefined();
    });

    it("duplicateSection copies a section with new ids", () => {
      const page = store.activePage;
      if (!page) { expect(false).toBe(true); return; }
      const sectionId = page.sections[0]?.id;
      if (!sectionId) { expect(false).toBe(true); return; }
      store.duplicateSection(sectionId);
      const updated = store.activePage;
      expect(updated?.sections.length).toBe(3);
    });

    it("reorderSections moves section to new position", () => {
      const page = store.activePage;
      if (!page) { expect(false).toBe(true); return; }
      store.reorderSections(page.id, 0, 1);
      const updated = store.activePage;
      if (!updated) { expect(false).toBe(true); return; }
      expect(updated.sections[1]?.name).toBe("Hero");
    });

    it("adding a section marks store dirty", () => {
      store.markClean();
      store.addSection("FAQ");
      expect(store.isDirty).toBe(true);
    });
  });

  describe("device", () => {
    it("starts as desktop", () => {
      expect(store.canvas.device).toBe("desktop");
    });

    it("setDevice changes the device", () => {
      store.setDevice("mobile");
      expect(store.canvas.device).toBe("mobile");
    });

    it("setDevice supports tablet", () => {
      store.setDevice("tablet");
      expect(store.canvas.device).toBe("tablet");
    });
  });

  describe("hydrate and serialize", () => {
    it("serialize returns pages without ephemeral state", () => {
      const pages = store.serialize();
      expect(pages.length).toBeGreaterThan(0);
      expect(pages[0]?.id).toBeDefined();
    });

    it("hydrate replaces store pages", () => {
      const newPages = [{ id: "new_p1", name: "Custom", slug: "/custom", order: 0, isHome: true, sections: [], theme: "default", metadata: {} }];
      store.hydrate(newPages);
      expect(store.activePage?.name).toBe("Custom");
      expect(store.isDirty).toBe(false);
    });

    it("hydrate with empty array does nothing", () => {
      const original = store.activePage?.id;
      store.hydrate([]);
      expect(store.activePage?.id).toBe(original);
    });
  });

  describe("undo and redo", () => {
    it("cannot undo initially", () => {
      expect(store.canUndo).toBe(false);
    });

    it("cannot redo initially", () => {
      expect(store.canRedo).toBe(false);
    });

    it("cannot undo after a single action", () => {
      store.addSection("Temp");
      expect(store.canUndo).toBe(false);
    });

    it("undo after two actions restores initial state", () => {
      const initialCount = store.activePage!.sections.length;
      store.addSection("Temp1");
      store.addSection("Temp2");
      expect(store.activePage!.sections.length).toBe(initialCount + 2);
      store.undo();
      expect(store.activePage!.sections.length).toBe(initialCount);
      expect(store.canUndo).toBe(false);
    });

    it("redo restores next snapshot after undo", () => {
      const initialCount = store.activePage!.sections.length;
      store.addSection("Temp1");
      const afterOne = store.activePage!.sections.length;
      store.addSection("Temp2");
      store.undo();
      expect(store.activePage!.sections.length).toBe(initialCount);
      store.redo();
      expect(store.activePage!.sections.length).toBe(afterOne);
    });
  });
});
