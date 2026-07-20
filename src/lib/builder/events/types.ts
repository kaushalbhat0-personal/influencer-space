import type { ElementId, SectionId, PageId, BuilderCanvas } from "../types";

export type BuilderEventType =
  | "node:selected"
  | "node:deselected"
  | "node:inserted"
  | "node:deleted"
  | "node:moved"
  | "node:duplicated"
  | "selection:changed"
  | "zoom:changed"
  | "device:changed"
  | "save:requested"
  | "preview:requested"
  | "publish:requested"
  | "history:changed"
  | "transaction:committed"
  | "drag:started"
  | "drag:updated"
  | "drag:targetChanged"
  | "drag:autoScroll"
  | "drag:cancelled"
  | "drag:completed";

export interface BuilderEventPayloads {
  "node:selected": { elementId: ElementId; multi: boolean; selectedIds: ElementId[] };
  "node:deselected": { previousIds: ElementId[] };
  "node:inserted": { elementId: ElementId; moduleId: string; sectionId: SectionId; pageId: PageId | null };
  "node:deleted": { elementId: ElementId; moduleId: string; sectionId: SectionId };
  "node:moved": { elementId: ElementId; fromSectionId: SectionId; toSectionId: SectionId; index: number };
  "node:duplicated": { originalId: ElementId; newId: ElementId; sectionId: SectionId };
  "selection:changed": { selectedIds: ElementId[]; mode: string };
  "zoom:changed": { previous: number; current: number };
  "device:changed": { previous: BuilderCanvas["device"]; current: BuilderCanvas["device"] };
  "save:requested": { timestamp: number };
  "preview:requested": { timestamp: number };
  "publish:requested": { timestamp: number };
  "history:changed": { canUndo: boolean; canRedo: boolean; undoDepth: number; redoDepth: number };
  "transaction:committed": { transactionId: string; commandCount: number };
  "drag:started": { elementId: ElementId; parentSectionId: SectionId };
  "drag:updated": { x: number; y: number; targetId: ElementId | null };
  "drag:targetChanged": { previousElementId: ElementId | null; newElementId: ElementId | null; dropZone: string };
  "drag:autoScroll": { edge: string };
  "drag:cancelled": { elementId: ElementId | null };
  "drag:completed": { elementId: ElementId | null; targetSectionId: SectionId | null; dropZone: string; valid: boolean };
}

export interface BuilderEvent<T extends BuilderEventType = BuilderEventType> {
  type: T;
  payload: BuilderEventPayloads[T];
  timestamp: number;
  id: string;
  correlationId: string;
  transactionId: string | null;
}

export type EventHandler<T extends BuilderEventType = BuilderEventType> = (event: BuilderEvent<T>) => void;

export type UnsubscribeFn = () => void;

export interface SubscriberEntry {
  id: string;
  type: BuilderEventType;
  priority: number;
  handler: EventHandler;
}

export interface EventDiagnostics {
  totalEmitted: number;
  totalHandlers: number;
  byType: Record<string, number>;
  replayCount: number;
  errors: string[];
}
