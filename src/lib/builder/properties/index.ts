export type {
  PropertyCategory,
  PropertyGroup,
  PropertyDescriptor,
  PropertyQuery,
  ResolvedProperties,
  PropertyInspectorState,
  PropertyDiagnostics,
  EditorType,
} from "./types";

export { PROPERTY_GROUPS } from "./types";
export { PropertyRegistry, propertyRegistry } from "./registry";
export { PropertyResolver, PropertyInspectorStateManager, propertyResolver, inspectorState } from "./resolver";
export { PropertyDiagnosticsEngine, propertyDiagnostics } from "./diagnostics";
export { StyleClipboard, PropertyPresetStore, MultiEditManager, styleClipboard, propertyPresets, multiEditManager } from "./enhanced";
export type { EditingSession, StyleClipboardEntry, PropertyPreset, MultiEditResult, ResponsiveValue } from "./enhanced";
