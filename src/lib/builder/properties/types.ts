import type { PropertyType, PropertyOption, PropertySchema, ModuleCapabilities } from "@/lib/module/types";

export type PropertyCategory =
  | "content" | "layout" | "spacing" | "typography"
  | "background" | "border" | "effects" | "animation"
  | "responsive" | "advanced" | "seo" | "visibility" | "custom";

export type PropertyGroup = {
  id: string;
  label: string;
  category: PropertyCategory;
  order: number;
  icon: string;
  defaultExpanded: boolean;
};

export const PROPERTY_GROUPS: Record<string, PropertyGroup> = {
  content: { id: "content", label: "Content", category: "content", order: 1, icon: "Type", defaultExpanded: true },
  layout: { id: "layout", label: "Layout", category: "layout", order: 2, icon: "Layout", defaultExpanded: true },
  spacing: { id: "spacing", label: "Spacing", category: "spacing", order: 3, icon: "Space", defaultExpanded: false },
  typography: { id: "typography", label: "Typography", category: "typography", order: 4, icon: "Font", defaultExpanded: false },
  background: { id: "background", label: "Background", category: "background", order: 5, icon: "PaintBucket", defaultExpanded: false },
  border: { id: "border", label: "Border", category: "border", order: 6, icon: "Square", defaultExpanded: false },
  effects: { id: "effects", label: "Effects", category: "effects", order: 7, icon: "Wand", defaultExpanded: false },
  animation: { id: "animation", label: "Animation", category: "animation", order: 8, icon: "Play", defaultExpanded: false },
  responsive: { id: "responsive", label: "Responsive", category: "responsive", order: 9, icon: "Smartphone", defaultExpanded: false },
  advanced: { id: "advanced", label: "Advanced", category: "advanced", order: 10, icon: "Settings", defaultExpanded: false },
  seo: { id: "seo", label: "SEO", category: "seo", order: 11, icon: "Search", defaultExpanded: false },
  visibility: { id: "visibility", label: "Visibility", category: "visibility", order: 12, icon: "Eye", defaultExpanded: false },
  custom: { id: "custom", label: "Custom", category: "custom", order: 99, icon: "Puzzle", defaultExpanded: false },
} as const;

Object.freeze(PROPERTY_GROUPS);

export type EditorType = PropertyType;

export interface PropertyDescriptor {
  id: string;
  moduleId: string;
  key: string;
  label: string;
  description: string | null;
  group: string;
  category: PropertyCategory;
  editorType: EditorType;
  defaultValue: unknown;
  currentValue: unknown;
  responsive: boolean;
  required: boolean;
  readOnly: boolean;
  visible: boolean;
  order: number;
  options: PropertyOption[] | null;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  validation: PropertySchema["validation"] | undefined;
  capabilities: ModuleCapabilities | null;
}

export interface PropertyQuery {
  moduleId?: string;
  group?: string;
  category?: PropertyCategory;
  search?: string;
  responsive?: boolean;
}

export interface ResolvedProperties {
  moduleId: string;
  moduleName: string;
  properties: PropertyDescriptor[];
  groups: PropertyGroup[];
  empty: boolean;
}

export interface PropertyInspectorState {
  selectedModuleId: string | null;
  expandedGroups: Set<string>;
  searchQuery: string;
  pinnedProperties: Set<string>;
  recentlyEdited: string[];
  responsiveBreakpoint: "mobile" | "tablet" | "desktop";
  readOnly: boolean;
}

export interface PropertyDiagnostics {
  totalDescriptors: number;
  modulesWithProperties: number;
  modulesWithoutProperties: string[];
  duplicateKeys: { moduleId: string; key: string }[];
  invalidEditors: { moduleId: string; key: string; editorType: string }[];
  missingGroups: { moduleId: string; key: string; group: string }[];
  unusedProperties: string[];
}
