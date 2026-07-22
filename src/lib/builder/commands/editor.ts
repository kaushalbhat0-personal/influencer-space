import { builderStore } from "../store";

/**
 * High-level builder editing commands.
 * The UI (drag-and-drop, toolbar, keyboard) calls these methods.
 * Never manipulates the DOM directly — only updates BuilderStore.
 */
export class BuilderEditor {
  /** Move a section to a new position within its page. */
  moveSection(pageId: string, fromIndex: number, toIndex: number): void {
    builderStore.reorderSections(pageId, fromIndex, toIndex);
    builderStore.markDirty();
  }

  /** Insert a component from the registry into a section. */
  insertComponent(componentId: string, sectionId: string, index?: number): void {
    builderStore.insertComponent(componentId, sectionId, index);
    builderStore.markDirty();
  }

  /** Add a new section with a component at the end of a page. */
  addSectionWithComponent(componentId: string, pageId?: string): void {
    const pid = pageId ?? builderStore.canvas.activePageId;
    if (!pid) return;
    const section = builderStore.addSection("New Section", pid);
    builderStore.insertComponent(componentId, section.id);
    builderStore.markDirty();
  }

  /** Duplicate a section. */
  duplicateSection(sectionId: string, pageId?: string): void {
    builderStore.duplicateSection(sectionId, pageId);
    builderStore.markDirty();
  }

  /** Delete a section. */
  deleteSection(sectionId: string, pageId?: string): void {
    builderStore.removeSection(sectionId, pageId);
    builderStore.markDirty();
  }

  /** Delete a single block (slot) by element ID. */
  deleteBlock(elementId: string): void {
    builderStore.removeElement(elementId);
    builderStore.markDirty();
  }

  /** Duplicate a single block. */
  duplicateBlock(elementId: string): void {
    builderStore.duplicate(elementId);
    builderStore.markDirty();
  }

  /** Undo the last operation. */
  undo(): void {
    builderStore.undo();
  }

  /** Redo the last undone operation. */
  redo(): void {
    builderStore.redo();
  }
}

export const builderEditor = new BuilderEditor();
