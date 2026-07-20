"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { PropertyDescriptor } from "@/lib/builder/properties";
import { inspectorState } from "@/lib/builder/properties";
import { builderCommands } from "@/lib/builder/commands";
import { builderQuery } from "@/lib/builder/query";
import type { EditingSession } from "@/lib/builder/properties";

export type InlineEditMode = "text" | "url" | "image" | "none";

export interface InlineEditState {
  active: boolean;
  mode: InlineEditMode;
  elementId: string | null;
  descriptor: PropertyDescriptor | null;
  value: unknown;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface InlineEditContextValue {
  state: InlineEditState;
  session: EditingSession | null;
  startEditing: (elementId: string, descriptor: PropertyDescriptor, rect: DOMRect) => void;
  updateValue: (value: unknown) => void;
  commitEdit: () => void;
  cancelEdit: () => void;
  goNext: () => void;
  goPrev: () => void;
}

const InlineEditContext = createContext<InlineEditContextValue | null>(null);

export function useInlineEdit(): InlineEditContextValue {
  const ctx = useContext(InlineEditContext);
  if (!ctx) throw new Error("useInlineEdit must be used within InlineEditProvider");
  return ctx;
}

export function InlineEditProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InlineEditState>({
    active: false, mode: "none", elementId: null, descriptor: null, value: null, x: 0, y: 0, width: 0, height: 0,
  });

  const startEditing = useCallback((elementId: string, descriptor: PropertyDescriptor, rect: DOMRect) => {
    const ed = propertyEditorRegistry.get(descriptor.editorType as Parameters<typeof propertyEditorRegistry.get>[0]);
    if (!ed?.supportsInlineEditing) return;
    const mode: InlineEditMode = descriptor.editorType === "image" ? "image" : descriptor.editorType === "url" ? "url" : "text";
    setState({ active: true, mode, elementId, descriptor, value: descriptor.currentValue ?? descriptor.defaultValue, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    builderCommands.execute("selectNode", { elementId, multi: false });
  }, []);

  const updateValue = useCallback((value: unknown) => {
    setState((s) => ({ ...s, value }));
  }, []);

  const commitEdit = useCallback(() => {
    if (state.descriptor) {
      inspectorState.updateProperty(state.descriptor.id, state.value);
      inspectorState.recordEdit(state.descriptor.key);
    }
    setState((s) => ({ ...s, active: false, mode: "none" }));
  }, [state.descriptor, state.value]);

  const cancelEdit = useCallback(() => {
    setState((s) => ({ ...s, active: false, mode: "none" }));
  }, []);

  const goNext = useCallback(() => {
    if (!state.elementId) return;
    commitEdit();
    const sel = builderQuery.getSelection();
    const visible = builderQuery.getVisibleNodes();
    const idx = visible.findIndex((s) => s.id === (sel.ids[0] ?? state.elementId));
    if (idx >= 0 && idx < visible.length - 1) {
      const next = visible[idx + 1]!;
      builderCommands.execute("selectNode", { elementId: next.id, multi: false });
    }
  }, [state.elementId, commitEdit]);

  const goPrev = useCallback(() => {
    if (!state.elementId) return;
    commitEdit();
    const sel = builderQuery.getSelection();
    const visible = builderQuery.getVisibleNodes();
    const idx = visible.findIndex((s) => s.id === (sel.ids[0] ?? state.elementId));
    if (idx > 0) {
      const prev = visible[idx - 1]!;
      builderCommands.execute("selectNode", { elementId: prev.id, multi: false });
    }
  }, [state.elementId, commitEdit]);

  const session: EditingSession | null = state.active && state.descriptor ? {
    moduleId: state.elementId ?? "", propertyKey: state.descriptor.key,
    originalValue: state.descriptor.defaultValue, currentValue: state.value,
    startedAt: Date.now(), editorType: state.descriptor.editorType,
    dirty: JSON.stringify(state.value) !== JSON.stringify(state.descriptor.defaultValue),
  } : null;

  return (
    <InlineEditContext.Provider value={{ state, session, startEditing, updateValue, commitEdit, cancelEdit, goNext, goPrev }}>
      {children}
    </InlineEditContext.Provider>
  );
}

import { propertyEditorRegistry } from "./property-editors";
