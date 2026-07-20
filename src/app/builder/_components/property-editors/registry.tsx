"use client";

import type { ComponentType } from "react";
import type { PropertyDescriptor } from "@/lib/builder/properties";
import type { EditorType } from "@/lib/builder/properties";

export interface PropertyEditorProps {
  prop: PropertyDescriptor;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly: boolean;
  hasError: boolean;
}

export type PropertyEditorComponent = ComponentType<PropertyEditorProps>;

export interface PropertyEditorDefinition {
  type: EditorType;
  component: PropertyEditorComponent;
  label: string;
  supportsResponsive: boolean;
  supportsInlineEditing: boolean;
  supportsValidation: boolean;
  supportsCopyPaste: boolean;
  supportsMultiEdit: boolean;
}

class PropertyEditorRegistryClass {
  private editors = new Map<EditorType, PropertyEditorDefinition>();

  register(type: EditorType, component: PropertyEditorComponent, opts?: {
    label?: string; supportsResponsive?: boolean; supportsInlineEditing?: boolean;
    supportsValidation?: boolean; supportsCopyPaste?: boolean; supportsMultiEdit?: boolean;
  }): void {
    this.editors.set(type, {
      type, component,
      label: opts?.label ?? type,
      supportsResponsive: opts?.supportsResponsive ?? false,
      supportsInlineEditing: opts?.supportsInlineEditing ?? false,
      supportsValidation: opts?.supportsValidation ?? true,
      supportsCopyPaste: opts?.supportsCopyPaste ?? true,
      supportsMultiEdit: opts?.supportsMultiEdit ?? false,
    });
  }

  get(type: EditorType): PropertyEditorDefinition | null { return this.editors.get(type) ?? null; }
  getInlineEditors(): PropertyEditorDefinition[] { return this.list().filter((e) => e.supportsInlineEditing); }
  has(type: EditorType): boolean { return this.editors.has(type); }
  list(): PropertyEditorDefinition[] { return Array.from(this.editors.values()); }
  get size(): number { return this.editors.size; }
}

export const propertyEditorRegistry = new PropertyEditorRegistryClass();
