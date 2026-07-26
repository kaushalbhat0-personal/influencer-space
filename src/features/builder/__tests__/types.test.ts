/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect } from "vitest";
import type { BuilderSlot, BuilderSection, BuilderPage, BuilderCanvas, BuilderState } from "../types";

describe("builder type re-exports", () => {
  it("BuilderSlot is a valid type", () => {
    const slot: BuilderSlot = {
      id: "b1", moduleId: "hero.default", parentId: null, order: 0,
      visible: true, locked: false, config: {}, metadata: {},
    };
    expect(slot.id).toBe("b1");
  });

  it("BuilderSection is a valid type", () => {
    const section: BuilderSection = {
      id: "s1", name: "Hero", order: 0, visible: true, locked: false,
      slots: [], metadata: {},
    };
    expect(section.name).toBe("Hero");
  });

  it("BuilderPage is a valid type", () => {
    const page: BuilderPage = {
      id: "p1", name: "Home", slug: "home", order: 0, isHome: true,
      sections: [], theme: "default", metadata: {},
    };
    expect(page.isHome).toBe(true);
  });

  it("BuilderCanvas is a valid type", () => {
    const canvas: BuilderCanvas = {
      pages: [], activePageId: null,
      selectedElementIds: new Set(), hoveredElementId: null,
      focusedElementId: null, zoom: 1, device: "desktop",
    };
    expect(canvas.device).toBe("desktop");
  });

  it("BuilderState is a valid type", () => {
    const state: BuilderState = {
      canvas: {
        pages: [], activePageId: null, selectedElementIds: new Set(),
        hoveredElementId: null, focusedElementId: null, zoom: 1, device: "desktop",
      },
      selection: { selectedIds: new Set(), mode: "single", anchorId: null, focusId: null, groupId: null },
      drag: { isDragging: false, sourceId: null, sourceType: null, targetId: null, targetSectionId: null, insertionIndex: null, preview: null },
      clipboard: [],
      history: [],
      historyIndex: -1,
      publish: { state: "draft", publishedAt: null, scheduledAt: null, version: 0, snapshot: null },
      isDirty: false,
    };
    expect(state.isDirty).toBe(false);
  });
});
