"use client";

import { useEffect, useCallback } from "react";
import { builderCommands } from "@/lib/builder/commands";
import { builderQuery } from "@/lib/builder/query";
import { DragA11y } from "@/lib/builder/drag/a11y";

type KeyHandler = (e: KeyboardEvent) => void;
type Shortcut = { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; handler: KeyHandler; description: string };

const shortcuts: Shortcut[] = [];

export function useKeyboard() {
  const register = useCallback((shortcut: Shortcut) => {
    shortcuts.push(shortcut);
    return () => { const idx = shortcuts.indexOf(shortcut); if (idx >= 0) shortcuts.splice(idx, 1); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const match = shortcuts.find(
        (s) =>
          s.key.toLowerCase() === e.key.toLowerCase() &&
          !!s.ctrl === e.ctrlKey &&
          !!s.shift === e.shiftKey &&
          !!s.alt === e.altKey
      );
      if (match) { e.preventDefault(); match.handler(e); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { register };
}

export function useKeyboardShortcuts() {
  const { register } = useKeyboard();
  useEffect(() => {
    const unsubs = [
      register({ key: "z", ctrl: true, description: "Undo", handler: () => builderCommands.undo() }),
      register({ key: "y", ctrl: true, description: "Redo", handler: () => builderCommands.redo() }),
      register({ key: "c", ctrl: true, description: "Copy", handler: () => {} }),
      register({ key: "v", ctrl: true, description: "Paste", handler: () => {} }),
      register({ key: "x", ctrl: true, description: "Cut", handler: () => {} }),
      register({ key: "d", ctrl: true, description: "Duplicate", handler: () => {
        const sel = builderQuery.getSelection();
        if (sel.ids.length === 1) builderCommands.execute("duplicateNode", { elementId: sel.ids[0]! });
      }}),
      register({ key: "Delete", description: "Delete", handler: () => {
        const sel = builderQuery.getSelection();
        for (const id of sel.ids) builderCommands.execute("deleteNode", { elementId: id });
      }}),
      register({ key: "f", ctrl: true, description: "Search modules", handler: () => {} }),
      register({ key: "ArrowUp", description: "Move element up", handler: () => {
        const sel = builderQuery.getSelection();
        if (sel.ids.length === 1) {
          const node = builderQuery.getSelectedNode();
          if (node.slot && node.section) {
            const idx = node.section.slots.findIndex((s) => s.id === node.slot!.id);
            if (idx > 0) builderCommands.execute("reorderNode", { elementId: sel.ids[0]!, targetSectionId: node.section.id, index: idx - 1 });
          }
        }
      }}),
      register({ key: "ArrowDown", description: "Move element down", handler: () => {
        const sel = builderQuery.getSelection();
        if (sel.ids.length === 1) {
          const node = builderQuery.getSelectedNode();
          if (node.slot && node.section) {
            const idx = node.section.slots.findIndex((s) => s.id === node.slot!.id);
            if (idx < node.section.slots.length - 1) builderCommands.execute("reorderNode", { elementId: sel.ids[0]!, targetSectionId: node.section.id, index: idx + 1 });
          }
        }
      }}),
      register({ key: "Enter", description: "Pick up or drop selected element (keyboard drag)", handler: () => {
        const sel = builderQuery.getSelection();
        if (sel.ids.length !== 1) return;
        if (DragA11y.isKeyboardDragActive()) {
          const elementName = DragA11y.getKeyboardDragElement() ?? "element";
          DragA11y.announceKeyboardDrop(elementName, "current position");
        } else {
          const node = builderQuery.getSelectedNode();
          if (node.slot) {
            DragA11y.announceKeyboardPickup(node.slot.moduleId.split(".").pop() ?? "element");
          }
        }
      }}),
      register({ key: "Escape", description: "Cancel keyboard drag", handler: () => {
        if (DragA11y.isKeyboardDragActive()) {
          DragA11y.announceKeyboardCancel();
        }
      }}),
    ];
    return () => unsubs.forEach((u) => u());
  }, [register]);
}

