import { describe, it, expect } from "vitest";
import { builderStore } from "@/lib/builder/store";
import { builderEvents } from "@/lib/builder/events";
import { builderQuery } from "@/lib/builder/query";

describe("BuilderCore", () => {
  const page = builderStore.addPage("Test", "/");
  const s1 = builderStore.addSection("Hero", page.id);
  const s2 = builderStore.addSection("Content", page.id);

  describe("Store", () => {
    it("should create a page", () => {
      expect(page.name).toBe("Test");
      expect(page.isHome).toBe(true);
    });

    it("should create sections in a page", () => {
      expect(s1.name).toBe("Hero");
      expect(s2.name).toBe("Content");
      const fetched = builderStore.getSection(page.id, s1.id);
      expect(fetched).not.toBeNull();
    });

    it("should create a slot in a section", () => {
      const slot = builderStore.addSlot("com.creatos.hero", s1.id, page.id);
      expect(slot.moduleId).toBe("com.creatos.hero");
      expect(builderStore.getSlot(page.id, s1.id, slot.id)).not.toBeNull();
    });

    it("should select and deselect elements", () => {
      const slot = builderStore.addSlot("com.creatos.gallery", s1.id, page.id);
      builderStore.select(slot.id);
      expect(builderStore.isSelected(slot.id)).toBe(true);
      builderStore.clearSelection();
      expect(builderStore.getSelectedIds()).toHaveLength(0);
    });

    it("should move element between sections", () => {
      const slot = builderStore.addSlot("com.creatos.products", s1.id, page.id);
      builderStore.moveElementTo(slot.id, s2.id, 0);
      const toSection = builderStore.getSection(page.id, s2.id);
      expect(toSection?.slots.some((s) => s.moduleId === "com.creatos.products")).toBe(true);
    });

    it("should change device and zoom", () => {
      builderStore.setDevice("mobile");
      expect(builderStore.canvas.device).toBe("mobile");
      builderStore.setZoom(1.5);
      expect(builderStore.canvas.zoom).toBe(1.5);
    });

    it("should duplicate an element", () => {
      const slot = builderStore.addSlot("com.creatos.timeline", s1.id, page.id);
      builderStore.duplicate(slot.id);
      const section = builderStore.getSection(page.id, s1.id);
      expect(section?.slots.filter((s) => s.moduleId === "com.creatos.timeline").length).toBe(2);
    });

    it("should delete an element", () => {
      const slot = builderStore.addSlot("com.creatos.games", s2.id, page.id);
      builderStore.removeElement(slot.id);
      const section = builderStore.getSection(page.id, s2.id);
      expect(section?.slots.some((s) => s.id === slot.id)).toBe(false);
    });
  });

  describe("Events", () => {
    it("should emit and receive events", () => {
      let received = false;
      const unsub = builderEvents.subscribe("node:selected", () => { received = true; });
      builderEvents.emit("node:selected" as never, { elementId: "t1", multi: false, selectedIds: ["t1"] } as never);
      expect(received).toBe(true);
      unsub();
    });

    it("should support once subscriptions", () => {
      let count = 0;
      builderEvents.once("zoom:changed" as never, () => { count++; });
      builderEvents.emit("zoom:changed" as never, { previous: 1, current: 2 } as never);
      builderEvents.emit("zoom:changed" as never, { previous: 2, current: 3 } as never);
      expect(count).toBe(1);
    });
  });

  describe("Queries", () => {
    it("should query selection after select", () => {
      const slot = builderStore.addSlot("com.creatos.contact", s1.id, page.id);
      builderStore.select(slot.id);
      expect(builderQuery.getSelection().count).toBeGreaterThanOrEqual(1);
    });

    it("should query hierarchy", () => {
      const hierarchy = builderQuery.getCanvasHierarchy();
      expect(hierarchy.sections.length).toBeGreaterThanOrEqual(2);
    });
  });
});
