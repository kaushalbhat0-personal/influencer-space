"use client";

import type { ComponentType } from "react";

export interface ThemeEditorProps {
  tokenKey: string;
  value: string;
  resolvedValue: string;
  editable: boolean;
  onChange: (value: string) => void;
}

export type ThemeEditorComponent = ComponentType<ThemeEditorProps>;

export interface ThemeEditorDefinition {
  id: string;
  category: string;
  component: ThemeEditorComponent;
  label: string;
}

class ThemeEditorRegistryClass {
  private editors = new Map<string, ThemeEditorDefinition>();

  register(category: string, component: ThemeEditorComponent, label: string): void {
    this.editors.set(category, { id: category, category, component, label });
  }

  get(category: string): ThemeEditorDefinition | null {
    return this.editors.get(category) ?? null;
  }

  list(): ThemeEditorDefinition[] { return Array.from(this.editors.values()); }
  get size(): number { return this.editors.size; }
}

export const themeEditorRegistry = new ThemeEditorRegistryClass();
