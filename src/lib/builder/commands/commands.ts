import type { BuilderCommand, CommandResult } from "./types";
import type { ElementId, SectionId, PageId, BuilderCanvas } from "../types";
import { builderStore } from "../store";

function ok(name: string, id: string, data: unknown = null): CommandResult {
  return { success: true, commandId: id, commandName: name, executedAt: Date.now(), durationMs: 0, error: null, data };
}
function err(name: string, id: string, error: string): CommandResult {
  return { success: false, commandId: id, commandName: name, executedAt: Date.now(), durationMs: 0, error, data: null };
}

export const selectNodeCommand: BuilderCommand<{ elementId: ElementId; multi?: boolean }> = {
  name: "selectNode", description: "Select a canvas element", category: "selection",
  canExecute: (i) => !!i.elementId,
  execute: (i, ctx) => { builderStore.select(i.elementId, i.multi); return ok("selectNode", ctx.commandId); },
  undo: (ctx) => { builderStore.clearSelection(); return ok("selectNode", ctx.commandId); },
};

export const deselectCommand: BuilderCommand<void> = {
  name: "deselect", description: "Clear all selections", category: "selection",
  canExecute: () => true,
  execute: (_i, ctx) => { void _i; builderStore.clearSelection(); return ok("deselect", ctx.commandId); },
  undo: (_c) => { void _c; return err("deselect", "", "Cannot undo deselect"); },
};

export const deleteNodeCommand: BuilderCommand<{ elementId: ElementId }> = {
  name: "deleteNode", description: "Delete a canvas element", category: "mutation",
  canExecute: (i) => !!i.elementId,
  execute: (i, ctx) => { builderStore.removeElement(i.elementId); return ok("deleteNode", ctx.commandId); },
  undo: (_c) => { void _c; return err("deleteNode", "", "Cannot undo delete (use history)"); },
};

export const duplicateNodeCommand: BuilderCommand<{ elementId: ElementId }> = {
  name: "duplicateNode", description: "Duplicate a canvas element", category: "mutation",
  canExecute: (i) => !!i.elementId,
  execute: (i, ctx) => { builderStore.duplicate(i.elementId); return ok("duplicateNode", ctx.commandId); },
  undo: (_c) => { void _c; return err("duplicateNode", "", "Cannot undo duplicate (use history)"); },
};

export const moveNodeCommand: BuilderCommand<{ elementId: ElementId; targetSectionId: SectionId; index: number }> = {
  name: "moveNode", description: "Move an element to a new position", category: "mutation",
  canExecute: (i) => !!i.elementId && !!i.targetSectionId,
  execute: (i, ctx) => { builderStore.moveElementTo(i.elementId, i.targetSectionId, i.index); return ok("moveNode", ctx.commandId); },
  undo: (_c) => { void _c; return err("moveNode", "", "Cannot undo move (use history)"); },
};

export const insertNodeCommand: BuilderCommand<{ moduleId: string; sectionId: SectionId; pageId?: PageId }> = {
  name: "insertNode", description: "Insert a new module into a section", category: "mutation",
  canExecute: (i) => !!i.moduleId && !!i.sectionId,
  execute: (i, ctx) => { const slot = builderStore.addSlot(i.moduleId, i.sectionId, i.pageId); return ok("insertNode", ctx.commandId, slot); },
  undo: (_c) => { void _c; return err("insertNode", "", "Cannot undo insert (use history)"); },
};

export const changeDeviceCommand: BuilderCommand<{ device: BuilderCanvas["device"] }> = {
  name: "changeDevice", description: "Change canvas device viewport", category: "view",
  canExecute: (i) => ["mobile", "tablet", "desktop"].includes(i.device),
  execute: (i, ctx) => { builderStore.setDevice(i.device); return ok("changeDevice", ctx.commandId); },
  undo: (_c) => { void _c; return err("changeDevice", "", "Cannot undo device change"); },
};

export const zoomInCommand: BuilderCommand<void> = {
  name: "zoomIn", description: "Zoom canvas in", category: "view",
  canExecute: () => true,
  execute: (_i, ctx) => { void _i; builderStore.setZoom(builderStore.canvas.zoom + 0.25); return ok("zoomIn", ctx.commandId, builderStore.canvas.zoom); },
  undo: (ctx) => { builderStore.setZoom(Math.max(0.25, builderStore.canvas.zoom - 0.25)); return ok("zoomIn", ctx.commandId); },
};

export const zoomOutCommand: BuilderCommand<void> = {
  name: "zoomOut", description: "Zoom canvas out", category: "view",
  canExecute: () => true,
  execute: (_i, ctx) => { void _i; builderStore.setZoom(builderStore.canvas.zoom - 0.25); return ok("zoomOut", ctx.commandId, builderStore.canvas.zoom); },
  undo: (ctx) => { builderStore.setZoom(Math.min(2, builderStore.canvas.zoom + 0.25)); return ok("zoomOut", ctx.commandId); },
};

export const setZoomCommand: BuilderCommand<{ zoom: number }> = {
  name: "setZoom", description: "Set canvas zoom level", category: "view",
  canExecute: (i) => i.zoom >= 0.25 && i.zoom <= 2,
  execute: (i, ctx) => { builderStore.setZoom(i.zoom); return ok("setZoom", ctx.commandId, i.zoom); },
  undo: (_c) => { void _c; return err("setZoom", "", "Cannot undo zoom"); },
};

export const saveCommand: BuilderCommand<void> = {
  name: "save", description: "Save builder state", category: "file",
  canExecute: () => builderStore.isDirty,
  execute: (_i, ctx) => { void _i; return ok("save", ctx.commandId, { saved: true }); },
  undo: (_c) => { void _c; return err("save", "", "Cannot undo save"); },
};

export const previewCommand: BuilderCommand<void> = {
  name: "preview", description: "Preview current page", category: "view",
  canExecute: () => true,
  execute: (_i, ctx) => { void _i; return ok("preview", ctx.commandId, { preview: true }); },
  undo: (_c) => { void _c; return err("preview", "", "Cannot undo preview"); },
};

export const publishCommand: BuilderCommand<void> = {
  name: "publish", description: "Publish current page", category: "system",
  canExecute: () => true,
  execute: (_i, ctx) => { void _i; return ok("publish", ctx.commandId, { published: true }); },
  undo: (_c) => { void _c; return err("publish", "", "Cannot undo publish"); },
};

export const reorderNodeCommand: BuilderCommand<{ elementId: ElementId; targetSectionId: SectionId; index: number }> = {
  name: "reorderNode", description: "Reorder element within section", category: "mutation",
  canExecute: (i) => !!i.elementId && !!i.targetSectionId,
  execute: (i, ctx) => { builderStore.moveElementTo(i.elementId, i.targetSectionId, i.index); return ok("reorderNode", ctx.commandId); },
  undo: (_c) => { void _c; return err("reorderNode", "", "Cannot undo reorder (use history)"); },
};

export const duplicateToCommand: BuilderCommand<{ elementId: ElementId; targetSectionId: SectionId; index: number }> = {
  name: "duplicateTo", description: "Copy element to new section and position", category: "mutation",
  canExecute: (i) => !!i.elementId && !!i.targetSectionId,
  execute: (i, ctx) => {
    const slot = builderStore.duplicate(i.elementId);
    if (i.index >= 0 && i.targetSectionId) {
      const newSlot = builderStore.activePage?.sections.find((s) => s.id === i.targetSectionId)?.slots.find((s) => s.moduleId === (slot as unknown as { moduleId: string }).moduleId);
      builderStore.moveElementTo(newSlot?.id ?? (slot as unknown as { id: string }).id, i.targetSectionId, i.index);
    }
    return ok("duplicateTo", ctx.commandId, slot);
  },
  undo: (_c) => { void _c; return err("duplicateTo", "", "Cannot undo duplicate"); },
};
