import type { SectionId } from "../types";
import type { DragSource } from "./types";

export interface DragStrategy {
  name: string;
  description: string;
  activeModifier: "none" | "alt" | "shift" | "ctrl";
  resolve(source: DragSource, targetSectionId: SectionId, targetIndex: number): {
    command: string;
    input: Record<string, unknown>;
  } | null;
  getPreviewLabel(source: DragSource): string;
}

export const moveStrategy: DragStrategy = {
  name: "move", description: "Move element to new position", activeModifier: "none",
  resolve(source, targetSectionId, targetIndex) {
    return {
      command: "moveNode",
      input: { elementId: source.elementId, targetSectionId, index: targetIndex },
    };
  },
  getPreviewLabel(source) { return `Move ${source.moduleId.split(".").pop()}`; },
};

export const copyStrategy: DragStrategy = {
  name: "copy", description: "Copy element to new position (hold Alt)", activeModifier: "alt",
  resolve(source, targetSectionId, targetIndex) {
    return {
      command: "duplicateTo",
      input: { elementId: source.elementId, targetSectionId, index: targetIndex },
    };
  },
  getPreviewLabel(source) { return `Copy ${source.moduleId.split(".").pop()}`; },
};

export const reorderStrategy: DragStrategy = {
  name: "reorder", description: "Reorder within same section", activeModifier: "none",
  resolve(source, targetSectionId, targetIndex) {
    return {
      command: "reorderNode",
      input: { elementId: source.elementId, targetSectionId, index: targetIndex },
    };
  },
  getPreviewLabel(source) { return `Reorder ${source.moduleId.split(".").pop()}`; },
};

export const insertStrategy: DragStrategy = {
  name: "insert", description: "Insert new module into section (hold Shift)", activeModifier: "shift",
  resolve(source, targetSectionId, targetIndex) {
    return {
      command: "insertNode",
      input: { moduleId: source.moduleId, sectionId: targetSectionId, index: targetIndex },
    };
  },
  getPreviewLabel(source) { return `Insert ${source.moduleId.split(".").pop()}`; },
};

export function selectStrategy(modifiers: { alt?: boolean; shift?: boolean; ctrl?: boolean }): DragStrategy {
  if (modifiers.alt) return copyStrategy;
  if (modifiers.shift) return insertStrategy;
  return moveStrategy;
}

export { moveStrategy as defaultStrategy };
