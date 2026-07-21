"use client";

import { useEffect } from "react";
import { builderStore } from "@/lib/builder/store";
import { builderCommands } from "@/lib/builder/commands";

interface ShortcutEntry {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  description: string;
  handler: () => void;
}

let shortcuts: ShortcutEntry[] = [];

export function useKeyboard(): { shortcuts: ShortcutEntry[] } {
  return { shortcuts };
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const allShortcuts: ShortcutEntry[] = [
      { key: "z", ctrlKey: true, description: "Undo", handler: () => { if (builderStore.canUndo) builderStore.undo(); } },
      { key: "Z", ctrlKey: true, shiftKey: true, description: "Redo", handler: () => { if (builderStore.canRedo) builderStore.redo(); } },
      { key: "y", ctrlKey: true, description: "Redo (alt)", handler: () => { if (builderStore.canRedo) builderStore.redo(); } },
      { key: "d", ctrlKey: true, description: "Duplicate", handler: () => { const ids = builderStore.getSelectedIds(); if (ids.length === 1) { const id = ids[0]; if (id) builderStore.duplicate(id); } } },
      { key: "Delete", description: "Delete", handler: () => { for (const id of builderStore.getSelectedIds()) builderStore.removeElement(id); } },
      { key: "a", ctrlKey: true, description: "Select all", handler: () => builderStore.selectAll() },
      { key: "s", ctrlKey: true, description: "Save draft", handler: () => builderCommands.execute("save", {}) },
      { key: "Escape", description: "Deselect all", handler: () => builderStore.clearSelection() },
    ];

    shortcuts = allShortcuts;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      for (const s of allShortcuts) {
        const ctrlMatch = s.ctrlKey ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = s.shiftKey ? e.shiftKey : !e.shiftKey;
        if (e.key === s.key && ctrlMatch && shiftMatch) {
          e.preventDefault();
          s.handler();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
