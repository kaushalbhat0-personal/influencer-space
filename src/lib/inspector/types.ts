/** Supported field types for the schema-driven Property Inspector */
export type FieldType =
  | "text" | "textarea" | "richtext" | "number" | "boolean"
  | "select" | "multiselect" | "color" | "image" | "url"
  | "icon" | "date" | "slider" | "spacing" | "typography" | "animation";

/** Validation rules for a field */
export interface FieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  custom?: string; // Zod schema string (future)
}

/** A single editable property in a component */
export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  defaultValue?: unknown;
  options?: { label: string; value: string }[]; // for select/multiselect
  validation?: FieldValidation;
  inlineEditable?: boolean; // Click-to-edit on canvas
  aiEditable?: boolean;
  aiRegenerate?: boolean;
  /** Responsive overrides per breakpoint */
  responsive?: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  };
  /** Group this field belongs to */
  group?: string;
  description?: string;
}

/** A group of fields displayed together in the inspector */
export interface FieldGroup {
  id: string;
  label: string;
  fields: FieldDefinition[];
}

/** Complete schema for a component's editable properties */
export interface ComponentSchema {
  groups: FieldGroup[];
}
