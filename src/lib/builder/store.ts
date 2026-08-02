import type {
  BuilderSlot, BuilderSection, BuilderPage, BuilderCanvas,
  SelectionState, DragState, ClipboardEntry, CanvasSnapshot,
  HistoryEntry, PublishEntry, BuilderState,
  ElementId, SectionId, PageId,
} from "./types";
import { builderEvents } from "./events";
import { builderQuery } from "./query";
import { getEntityType } from "@/lib/inspector/schemas";
import { isPresentationKey, presentationDefaults, presentationPropsFor } from "./presentation";

let idCounter = Date.now();
function uid(): string { return `el_${++idCounter}_${Math.random().toString(36).slice(2, 6)}`; }
function hid(): string { return `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function clonePage(page: BuilderPage): BuilderPage { return JSON.parse(JSON.stringify(page)); }

export class BuilderStore {
  private state: BuilderState;
  private _storeVersion = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  /** Monotonic store version — increments on every mutation. The canvas
   *  rerenders and the Runtime Signature is recomputed for every bump. */
  get storeVersion(): number {
    return this._storeVersion;
  }

  /** Replace store state with pages loaded from DB. */
  hydrate(pages: BuilderPage[]): void {
    if (pages.length === 0) return;
    this.state = {
      ...this.state,
      canvas: {
        ...this.state.canvas,
        pages,
        activePageId: pages[0].id,
        selectedElementIds: new Set(),
        hoveredElementId: null,
        focusedElementId: null,
      },
      isDirty: false,
      history: [],
      historyIndex: -1,
    };
    builderQuery.invalidate();
    this.emitStoreChanged();
  }

  /** Serialize current pages (without ephemeral state) for persistence. */
  serialize(): BuilderPage[] {
    return this.state.canvas.pages.map(clonePage);
  }

  /** Mark the store as dirty (unsaved changes). */
  markDirty(): void {
    this.state = { ...this.state, isDirty: true };
    this.emitStoreChanged();
  }

  /** Mark the store as clean (changes saved). */
  markClean(): void {
    this.state = { ...this.state, isDirty: false };
    this.emitStoreChanged();
  }

  /** Toggle a section's visibility through the history (persists to draft). */
  setSectionVisibility(pageId: PageId, sectionId: SectionId, visible: boolean): void {
    const page = this.getPage(pageId);
    if (!page) return;
    const section = page.sections.find((s) => s.id === sectionId);
    if (!section || section.visible === visible) return;
    this.pushHistory("visibility-change");
    const sections = page.sections.map((s) => (s.id === sectionId ? { ...s, visible } : s));
    this.updatePageSections(pageId, sections);
    builderQuery.invalidate();
    this.emitStoreChanged();
  }

  private emitStoreChanged(): void {
    this._storeVersion++;
    builderEvents.emit("store:changed", { isDirty: this.state.isDirty, timestamp: Date.now(), version: this._storeVersion });
  }

  private createDefaultPage(): BuilderPage {
    const pageId = `page_${uid()}`;
    const sections: BuilderSection[] = [
      {
        id: `sec_${uid()}`, name: "Hero", order: 0, visible: true, locked: false,
        slots: [
          { id: `slot_${uid()}`, moduleId: "hero.default", parentId: null, order: 0, visible: true, locked: false, config: {}, metadata: {} },
        ],
        metadata: {},
      },
    ];
    return { id: pageId, name: "Home", slug: "/", order: 0, isHome: true, sections, theme: "default", metadata: {} };
  }

  private createInitialState(): BuilderState {
    const defaultPage = this.createDefaultPage();
    return {
      canvas: { pages: [defaultPage], activePageId: defaultPage.id, selectedElementIds: new Set(), hoveredElementId: null, focusedElementId: null, zoom: 1, device: "desktop" },
      selection: { selectedIds: new Set(), mode: "single", anchorId: null, focusId: null, groupId: null },
      drag: { isDragging: false, sourceId: null, sourceType: null, targetId: null, targetSectionId: null, insertionIndex: null, preview: null },
      clipboard: [],
      history: [],
      historyIndex: -1,
      publish: { state: "draft", publishedAt: null, scheduledAt: null, version: 1, snapshot: null },
      isDirty: false,
    };
  }

  get canvas(): BuilderCanvas { return this.state.canvas; }
  get selection(): SelectionState { return this.state.selection; }
  get drag(): DragState { return this.state.drag; }
  get publish(): PublishEntry { return this.state.publish; }
  get isDirty(): boolean { return this.state.isDirty; }
  get canUndo(): boolean { return this.state.historyIndex > 0; }
  get canRedo(): boolean { return this.state.historyIndex < this.state.history.length - 1; }
  get activePage(): BuilderPage | null { return this.getPage(this.state.canvas.activePageId ?? ""); }

  getPage(id: PageId): BuilderPage | null { return this.state.canvas.pages.find((p) => p.id === id) ?? null; }
  getSection(pageId: PageId, sectionId: SectionId): BuilderSection | null { return this.getPage(pageId)?.sections.find((s) => s.id === sectionId) ?? null; }
  getSlot(pageId: PageId, sectionId: SectionId, slotId: ElementId): BuilderSlot | null { return this.getSection(pageId, sectionId)?.slots.find((s) => s.id === slotId) ?? null; }

  getSelectedIds(): ElementId[] { return Array.from(this.state.selection.selectedIds); }
  isSelected(id: ElementId): boolean { return this.state.selection.selectedIds.has(id); }

  private pushHistory(action: string): void {
    const snapshot: CanvasSnapshot = { pages: this.state.canvas.pages.map(clonePage), activePageId: this.state.canvas.activePageId, selectedElementIds: Array.from(this.state.canvas.selectedElementIds), timestamp: Date.now() };
    const entry: HistoryEntry = { id: hid(), snapshot, action, timestamp: Date.now(), groupId: null };
    const newHistory = this.state.history.slice(0, this.state.historyIndex + 1);
    newHistory.push(entry);
    if (newHistory.length > 50) newHistory.shift();
    this.state = { ...this.state, history: newHistory, historyIndex: newHistory.length - 1, isDirty: true };
    this.emitStoreChanged();
  }

  undo(): boolean {
    if (!this.canUndo) return false;
    const idx = this.state.historyIndex - 1;
    const entry = this.state.history[idx];
    if (!entry) return false;
    this.state = { ...this.state, canvas: { ...this.state.canvas, pages: entry.snapshot.pages.map(clonePage), activePageId: entry.snapshot.activePageId, selectedElementIds: new Set(entry.snapshot.selectedElementIds) }, historyIndex: idx };
    builderEvents.emit("history:changed", { action: "undo", index: idx });
    builderQuery.invalidate();
    this.emitStoreChanged();
    return true;
  }

  redo(): boolean {
    if (!this.canRedo) return false;
    const idx = this.state.historyIndex + 1;
    const entry = this.state.history[idx];
    if (!entry) return false;
    this.state = { ...this.state, canvas: { ...this.state.canvas, pages: entry.snapshot.pages.map(clonePage), activePageId: entry.snapshot.activePageId, selectedElementIds: new Set(entry.snapshot.selectedElementIds) }, historyIndex: idx };
    builderEvents.emit("history:changed", { action: "redo", index: idx });
    builderQuery.invalidate();
    this.emitStoreChanged();
    return true;
  }

  select(id: ElementId, multi = false): void {
    const newSet = multi ? new Set(this.state.selection.selectedIds) : new Set<ElementId>();
    if (multi && newSet.has(id)) newSet.delete(id); else newSet.add(id);
    this.state = { ...this.state, selection: { ...this.state.selection, selectedIds: newSet, mode: multi ? "multi" : "single", anchorId: id, focusId: id }, canvas: { ...this.state.canvas, selectedElementIds: newSet } };
    const selIds = Array.from(newSet);
    builderEvents.emit("node:selected", { elementId: id, multi, selectedIds: selIds });
    builderEvents.emit("selection:changed", { selectedIds: selIds, mode: multi ? "multi" : "single" });
    builderQuery.invalidate();
    this.emitStoreChanged();
  }

  selectRange(from: ElementId, to: ElementId): void {
    const allIds = this.getAllElementIds();
    const fromIdx = allIds.indexOf(from);
    const toIdx = allIds.indexOf(to);
    if (fromIdx < 0 || toIdx < 0) return;
    const start = Math.min(fromIdx, toIdx);
    const end = Math.max(fromIdx, toIdx);
    const newSet = new Set(allIds.slice(start, end + 1));
    this.state = { ...this.state, selection: { ...this.state.selection, selectedIds: newSet, mode: "range", anchorId: from, focusId: to }, canvas: { ...this.state.canvas, selectedElementIds: newSet } };
    this.emitStoreChanged();
  }

  selectAll(): void {
    const allIds = this.getAllElementIds();
    const newSet = new Set(allIds);
    this.state = { ...this.state, selection: { ...this.state.selection, selectedIds: newSet, mode: "multi" }, canvas: { ...this.state.canvas, selectedElementIds: newSet } };
    this.emitStoreChanged();
  }

  clearSelection(): void {
    this.state = { ...this.state, selection: { selectedIds: new Set(), mode: "single", anchorId: null, focusId: null, groupId: null }, canvas: { ...this.state.canvas, selectedElementIds: new Set() } };
    builderEvents.emit("selection:changed", { selectedIds: [], mode: "single" });
    builderQuery.invalidate();
    this.emitStoreChanged();
  }

  copy(): void { const selectedIds = this.getSelectedIds(); if (selectedIds.length === 0) return; const entries: ClipboardEntry[] = []; for (const id of selectedIds) { const slot = this.findSlotById(id); if (slot) entries.push({ type: "slot", data: { ...slot, id: uid() }, sourcePageId: this.state.canvas.activePageId ?? "", timestamp: Date.now() }); } if (entries.length > 0) { this.state = { ...this.state, clipboard: [...this.state.clipboard, ...entries].slice(-20) }; this.emitStoreChanged(); } }

  cut(): void { this.copy(); const ids = this.getSelectedIds(); for (const id of ids) this.removeElement(id); this.clearSelection(); }

  paste(targetSectionId?: SectionId): void {
    if (this.state.clipboard.length === 0) return;
    const page = this.activePage; if (!page) return;
    const sectionId = targetSectionId ?? page.sections[0]?.id; if (!sectionId) return;
    this.pushHistory("paste");
    const newSlots: BuilderSlot[] = [];
    for (const entry of this.state.clipboard) {
      if (entry.type === "slot") { newSlots.push({ ...entry.data as BuilderSlot, id: uid(), order: (page.sections.find((s) => s.id === sectionId)?.slots.length ?? 0) + newSlots.length }); }
    }
    const pageIdx = page.sections.findIndex((s) => s.id === sectionId);
    if (pageIdx < 0) return;
    const section = { ...page.sections[pageIdx]!, slots: [...page.sections[pageIdx]!.slots, ...newSlots] };
    const sections = [...page.sections]; sections[pageIdx] = section;
    this.updatePageSections(page.id, sections);
    builderQuery.invalidate();
  }

  duplicate(id: ElementId): void {
    const slot = this.findSlotById(id); if (!slot) return;
    const section = this.findSectionForSlot(id); if (!section) return;
    const page = this.findPageForSlot(id); if (!page) return;
    this.pushHistory("duplicate");
    const newSlot: BuilderSlot = { ...JSON.parse(JSON.stringify(slot)), id: uid(), order: section.slots.length };
    const sIdx = page.sections.findIndex((s) => s.id === section.id); if (sIdx < 0) return;
    const updatedSection = { ...page.sections[sIdx]!, slots: [...page.sections[sIdx]!.slots, newSlot] };
    const sections = [...page.sections]; sections[sIdx] = updatedSection;
    this.updatePageSections(page.id, sections);
    builderQuery.invalidate();
  }

  startDrag(sourceId: ElementId, sourceType: "slot" | "section"): void {
    this.state = { ...this.state, drag: { isDragging: true, sourceId, sourceType, targetId: null, targetSectionId: null, insertionIndex: null, preview: null } };
    this.emitStoreChanged();
  }

  updateDragTarget(targetSectionId: SectionId, insertionIndex: number): void {
    this.state = { ...this.state, drag: { ...this.state.drag, targetSectionId, insertionIndex } };
  }

  endDrag(): void {
    const d = this.state.drag;
    if (!d.isDragging || !d.sourceId || !d.targetSectionId || d.insertionIndex === null) { this.state = { ...this.state, drag: { isDragging: false, sourceId: null, sourceType: null, targetId: null, targetSectionId: null, insertionIndex: null, preview: null } }; this.emitStoreChanged(); return; }
    this.pushHistory("move");
    this.moveElementTo(d.sourceId, d.targetSectionId, d.insertionIndex);
    this.state = { ...this.state, drag: { isDragging: false, sourceId: null, sourceType: null, targetId: null, targetSectionId: null, insertionIndex: null, preview: null } };
    builderQuery.invalidate();
    this.emitStoreChanged();
  }

  cancelDrag(): void { this.state = { ...this.state, drag: { isDragging: false, sourceId: null, sourceType: null, targetId: null, targetSectionId: null, insertionIndex: null, preview: null } }; this.emitStoreChanged(); }

  addPage(name: string, slug: string): BuilderPage {
    const page: BuilderPage = { id: uid(), name, slug, order: this.state.canvas.pages.length, isHome: this.state.canvas.pages.length === 0, sections: [], theme: "com.creatos.neon-dark", metadata: {} };
    this.state = { ...this.state, canvas: { ...this.state.canvas, pages: [...this.state.canvas.pages, page], activePageId: this.state.canvas.activePageId ?? page.id } };
    this.emitStoreChanged();
    return page;
  }

  addSection(name: string, pageId?: PageId): BuilderSection {
    const pid = pageId ?? this.state.canvas.activePageId; if (!pid) throw new Error("No active page");
    const page = this.getPage(pid); if (!page) throw new Error("Page not found");
    this.pushHistory("add-section");
    const section: BuilderSection = { id: uid(), name, order: page.sections.length, visible: true, locked: false, slots: [], metadata: {} };
    this.updatePageSections(pid, [...page.sections, section]);
    builderQuery.invalidate();
    return section;
  }

  addSlot(moduleId: string, sectionId: SectionId, pageId?: PageId): BuilderSlot {
    const pid = pageId ?? this.state.canvas.activePageId; if (!pid) throw new Error("No active page");
    const section = this.getSection(pid, sectionId); if (!section) throw new Error("Section not found");
    this.pushHistory("add-slot");
    const slot: BuilderSlot = { id: uid(), moduleId, parentId: sectionId, order: section.slots.length, visible: true, locked: false, config: {}, metadata: {} };
    const page = this.getPage(pid);
    if (!page) throw new Error("Page not found");
    const sIdx = page.sections.findIndex((s) => s.id === sectionId);
    if (sIdx < 0) throw new Error("Section index not found");
    const sections = [...page.sections]; sections[sIdx] = { ...section, slots: [...section.slots, slot] };
    this.updatePageSections(pid, sections);
    builderQuery.invalidate();
    return slot;
  }

  removeElement(id: ElementId): void {
    const page = this.findPageForSlot(id); if (!page) return;
    this.pushHistory("remove");
    const updatedSections = page.sections.map((s) => ({ ...s, slots: s.slots.filter((sl) => sl.id !== id) }));
    this.updatePageSections(page.id, updatedSections);
    builderQuery.invalidate();
  }

  /**
   * Update a single config key on a block — used by the Property Inspector.
   * Presentation-only: content keys are rejected so the Builder never persists
   * business content (it always lives in the live CMS).
   */
  updateBlockConfig(elementId: ElementId, key: string, value: unknown): void {
    const page = this.activePage; if (!page) return;
    const slot = this.findSlotById(elementId);
    if (!slot) return;
    if (!isPresentationKey(slot.moduleId, key)) return;

    this.pushHistory("config-change");
    const updatedSections = page.sections.map((s) => ({
      ...s,
      slots: s.slots.map((sl) =>
        sl.id === elementId
          ? { ...sl, config: { ...sl.config, [key]: value } }
          : sl
      ),
    }));
    this.updatePageSections(page.id, updatedSections);
    builderEvents.emit("selection:changed", { selectedIds: this.getSelectedIds(), mode: this.state.selection.mode });
    builderEvents.emit("config:changed", { elementId, key, value });
    builderQuery.invalidate();
    this.emitStoreChanged();
  }

  moveElementTo(slotId: ElementId, targetSectionId: SectionId, index: number): void {
    const page = this.findPageForSlot(slotId); if (!page) return;
    const slot = this.findSlotById(slotId); if (!slot) return;
    const fromSection = this.findSectionForSlot(slotId); if (!fromSection) return;
    const updatedSections = page.sections.map((s) => {
      let slots = [...s.slots];
      if (s.id === fromSection.id) slots = slots.filter((sl) => sl.id !== slotId);
      if (s.id === targetSectionId) { const clone = { ...slot, parentId: targetSectionId, order: 0 }; const newSlots = [...slots]; newSlots.splice(index, 0, clone); return { ...s, slots: newSlots.map((sl, i) => ({ ...sl, order: i })) }; }
      return { ...s, slots: slots.map((sl, i) => ({ ...sl, order: i })) };
    });
    this.updatePageSections(page.id, updatedSections);
  }

  /** Move a section to a new position within its page. */
  reorderSections(pageId: PageId, fromIndex: number, toIndex: number): void {
    const page = this.getPage(pageId); if (!page) return;
    this.pushHistory("reorder");
    const sections = [...page.sections];
    const removed = sections.splice(fromIndex, 1);
    if (removed.length === 0) return;
    const moved = removed[0];
    if (!moved) return;
    sections.splice(toIndex, 0, moved);
    this.updatePageSections(pageId, sections.map((s, i) => ({ ...s, order: i })));
    builderQuery.invalidate();
  }

  /** Remove an entire section and all its blocks. */
  removeSection(sectionId: SectionId, pageId?: PageId): void {
    const pid = pageId ?? this.state.canvas.activePageId; if (!pid) return;
    const page = this.getPage(pid); if (!page) return;
    this.pushHistory("remove-section");
    this.updatePageSections(pid, page.sections.filter((s) => s.id !== sectionId));
    builderQuery.invalidate();
  }

  /** Duplicate a section with all its blocks. */
  duplicateSection(sectionId: SectionId, pageId?: PageId): void {
    const pid = pageId ?? this.state.canvas.activePageId; if (!pid) return;
    const page = this.getPage(pid); if (!page) return;
    const section = page.sections.find((s) => s.id === sectionId); if (!section) return;
    this.pushHistory("duplicate-section");
    const cloned: BuilderSection = JSON.parse(JSON.stringify(section));
    cloned.id = uid();
    cloned.order = section.order + 0.5;
    cloned.slots = cloned.slots.map((sl) => ({ ...sl, id: uid() }));
    const sections = [...page.sections, cloned].sort((a, b) => a.order - b.order).map((s, i) => ({ ...s, order: i }));
    this.updatePageSections(pid, sections);
    builderQuery.invalidate();
  }

  /**
   * Insert a new block (slot) from a component ID.
   * The config is a PresentationBlueprint only — content defaults are never
   * seeded; content always comes from the live CMS at render time.
   */
  insertComponent(componentId: string, sectionId: SectionId, index?: number, defaultProps?: Record<string, unknown>): void {
    const page = this.activePage; if (!page) return;
    const section = page.sections.find((s) => s.id === sectionId); if (!section) return;
    this.pushHistory("insert-component");
    const entityType = getEntityType(componentId);
    const presentation = defaultProps ? presentationPropsFor(componentId, defaultProps) : presentationDefaults(componentId);
    const slot: BuilderSlot = {
      id: uid(), moduleId: componentId, parentId: sectionId,
      order: index ?? section.slots.length, visible: true, locked: false,
      config: { ...presentation, ...(entityType ? { entityType } : {}) }, metadata: {},
    };
    const sIdx = page.sections.findIndex((s) => s.id === sectionId);
    const slots = [...section.slots];
    slots.splice(index ?? slots.length, 0, slot);
    const sections = [...page.sections]; sections[sIdx] = { ...section, slots };
    this.updatePageSections(page.id, sections);
    builderQuery.invalidate();
    this.emitStoreChanged();
  }

  setDevice(device: BuilderCanvas["device"]): void {
    const previous = this.state.canvas.device;
    this.state = { ...this.state, canvas: { ...this.state.canvas, device } };
    builderEvents.emit("device:changed", { previous, current: device });
    builderQuery.invalidate();
    this.emitStoreChanged();
  }
  setZoom(zoom: number): void {
    const previous = this.state.canvas.zoom;
    this.state = { ...this.state, canvas: { ...this.state.canvas, zoom: Math.max(0.25, Math.min(2, zoom)) } };
    builderEvents.emit("zoom:changed", { previous, current: this.state.canvas.zoom });
    builderQuery.invalidate();
    this.emitStoreChanged();
  }
  setHovered(id: ElementId | null): void {
    this.state = { ...this.state, canvas: { ...this.state.canvas, hoveredElementId: id } };
    builderEvents.emit("hover:changed", { elementId: id });
  }

  private updatePageSections(pageId: PageId, sections: BuilderSection[]): void {
    const pages = this.state.canvas.pages.map((p) => p.id === pageId ? { ...p, sections } : p);
    this.state = { ...this.state, canvas: { ...this.state.canvas, pages } };
  }

  private findSlotById(id: ElementId): BuilderSlot | null {
    for (const page of this.state.canvas.pages) for (const section of page.sections) { const slot = section.slots.find((s) => s.id === id); if (slot) return slot; }
    return null;
  }

  private findPageForSlot(slotId: ElementId): BuilderPage | null {
    return this.state.canvas.pages.find((p) => p.sections.some((s) => s.slots.some((sl) => sl.id === slotId))) ?? null;
  }

  private findSectionForSlot(slotId: ElementId): BuilderSection | null {
    for (const page of this.state.canvas.pages) for (const section of page.sections) { if (section.slots.some((s) => s.id === slotId)) return section; }
    return null;
  }

  private getAllElementIds(): ElementId[] {
    const ids: ElementId[] = [];
    for (const page of this.state.canvas.pages) for (const section of page.sections) ids.push(section.id, ...section.slots.map((s) => s.id));
    return ids;
  }
}

export const builderStore = new BuilderStore();
