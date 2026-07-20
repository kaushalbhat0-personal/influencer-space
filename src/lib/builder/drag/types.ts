import type { ElementId, SectionId } from "../types";
import type { DragStrategy } from "./strategies";
import type { SnapResult } from "./snap";

export type DragStatus = "idle" | "preparing" | "dragging" | "cancelling" | "completing";
export type DropZone = "before" | "after" | "inside" | "none";
export type CanvasEdge = "top" | "bottom" | "left" | "right" | "none";

export interface DragPosition {
  x: number; y: number; offsetX: number; offsetY: number; pageX: number; pageY: number;
}

export interface DragSource {
  elementId: ElementId; moduleId: string; parentSectionId: SectionId;
  elementIndex: number; elementWidth: number; elementHeight: number;
}

export interface DragTarget {
  elementId: ElementId | null; sectionId: SectionId | null;
  dropZone: DropZone; valid: boolean; reason: string | null;
}

export interface DragSession {
  status: DragStatus; source: DragSource | null; position: DragPosition | null;
  currentTarget: DragTarget | null; edge: CanvasEdge; startedAt: number | null;
  distance: number; modifierKeys: { shift: boolean; alt: boolean; ctrl: boolean };
}

export interface SelectionSnapshot {
  ids: ElementId[]; count: number; mode: string;
}

export interface DragContext {
  session: DragSession;
  strategy: DragStrategy;
  target: DragTarget;
  snap: SnapResult | null;
  selection: SelectionSnapshot;
  modifiers: { shift: boolean; alt: boolean; ctrl: boolean };
  device: "mobile" | "tablet" | "desktop";
  timestamp: number;
}

export interface DragDiagnostics {
  totalSessions: number; activeSessions: number; completedSessions: number;
  cancelledSessions: number; avgDurationMs: number; avgDistance: number;
}
