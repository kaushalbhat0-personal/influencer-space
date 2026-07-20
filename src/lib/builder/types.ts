import type { ModuleId } from "@/lib/module/types";

export type ElementId = string;

export type PageId = string;

export type SectionId = string;

export interface BuilderSlot {
  id: ElementId;
  moduleId: ModuleId;
  parentId: SectionId | null;
  order: number;
  visible: boolean;
  locked: boolean;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface BuilderSection {
  id: SectionId;
  name: string;
  order: number;
  visible: boolean;
  locked: boolean;
  slots: BuilderSlot[];
  metadata: Record<string, unknown>;
}

export interface BuilderPage {
  id: PageId;
  name: string;
  slug: string;
  order: number;
  isHome: boolean;
  sections: BuilderSection[];
  theme: string;
  metadata: Record<string, unknown>;
}

export interface BuilderCanvas {
  pages: BuilderPage[];
  activePageId: PageId | null;
  selectedElementIds: Set<ElementId>;
  hoveredElementId: ElementId | null;
  focusedElementId: ElementId | null;
  zoom: number;
  device: "mobile" | "tablet" | "desktop";
}

export type SelectionMode = "single" | "multi" | "range";

export interface SelectionState {
  selectedIds: Set<ElementId>;
  mode: SelectionMode;
  anchorId: ElementId | null;
  focusId: ElementId | null;
  groupId: string | null;
}

export interface DragState {
  isDragging: boolean;
  sourceId: ElementId | null;
  sourceType: "slot" | "section" | null;
  targetId: ElementId | null;
  targetSectionId: SectionId | null;
  insertionIndex: number | null;
  preview: DragPreview | null;
}

export interface DragPreview {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ClipboardEntry {
  type: "slot" | "section";
  data: BuilderSlot | BuilderSection;
  sourcePageId: PageId;
  timestamp: number;
}

export interface CanvasSnapshot {
  pages: BuilderPage[];
  activePageId: PageId | null;
  selectedElementIds: ElementId[];
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  snapshot: CanvasSnapshot;
  action: string;
  timestamp: number;
  groupId: string | null;
}

export type PublishState = "draft" | "preview" | "published" | "scheduled";

export interface PublishEntry {
  state: PublishState;
  publishedAt: string | null;
  scheduledAt: string | null;
  version: number;
  snapshot: CanvasSnapshot | null;
}

export interface BuilderState {
  canvas: BuilderCanvas;
  selection: SelectionState;
  drag: DragState;
  clipboard: ClipboardEntry[];
  history: HistoryEntry[];
  historyIndex: number;
  publish: PublishEntry;
  isDirty: boolean;
}

export interface BuilderTransaction {
  id: string;
  action: string;
  before: CanvasSnapshot;
  after: CanvasSnapshot;
  timestamp: number;
}

export interface BuilderEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}
