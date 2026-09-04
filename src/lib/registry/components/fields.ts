/**
 * RCCF-VISUAL-02B-01 — Puck-Style Registry Contract: Field Schema
 *
 * Serializable, capability-aware field definitions that drive BOTH
 * the Builder inspector and the LayoutEngine/render path.
 *
 * Wire contract: FieldDefinition contains ONLY serializable primitives
 * (strings, numbers, booleans, string arrays). No functions, no class
 * instances, no Lucide forwardRef icons, no closures. Safe to pass
 * from Server Component → Client Component after JSON serialization.
 *
 * Reuses existing MediaField/media validation via type="media" (folder
 * allowlist handled separately in validator.ts). Reuses Capability
 * Runtime via requiresCapability.
 */

// ── Field types (serializable discriminant) ───────────────────
export type RegistryFieldType =
  | "text"
  | "textarea"
  | "url"
  | "number"
  | "boolean"
  | "select"
  | "media"
  | "color"
  | "slider";

export interface RegistryFieldOption {
  label: string;
  value: string;
}

export interface RegistryFieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * Single editable field — serializable, capability-aware.
 *
 * `name` is the config key (e.g. "columns" → props.columns).
 * `defaultValue` seeds ComponentDefinition.defaultProps and is the
 * fallback when the persisted slot.config omits the key.
 *
 * `requiresCapability` — when set, the Builder may render the field
 * disabled with an upgrade hint if the tenant's plan lacks the
 * capability (checked via capabilityService). Storefront rendering
 * is never blocked — the field value is preserved but has no premium
 * visual effect if gated (graceful fallback).
 */
export interface RegistryFieldDefinition {
  name: string;
  label: string;
  type: RegistryFieldType;
  group?: string;
  description?: string;
  defaultValue?: unknown;
  placeholder?: string;
  /** For select/media subtype hints */
  options?: RegistryFieldOption[];
  validation?: RegistryFieldValidation;
  /** Capability gating (e.g. "advanced_builder", "theme_background_image"). */
  requiresCapability?: string;
  /** Whether the field should be shown inline on canvas (click-to-edit). */
  inlineEditable?: boolean;
  /** Accept hint for media fields (e.g. "image/*", "video/*") */
  accept?: string;
  /** Folder allowlist hint for media fields — must match MediaValidator ALLOWED_FOLDERS */
  folder?: string;
}

// ── Wire-safe helpers ─────────────────────────────────────────

/** True if the field definition is serializable (no functions). */
export function isSerializableFieldDefinition(field: RegistryFieldDefinition): boolean {
  if (typeof field.name !== "string" || typeof field.label !== "string" || typeof field.type !== "string") return false;
  if (field.options !== undefined) {
    if (!Array.isArray(field.options)) return false;
    for (const o of field.options) {
      if (typeof o.label !== "string" || typeof o.value !== "string") return false;
    }
  }
  if (field.validation !== undefined && typeof field.validation !== "object") return false;
  if (field.requiresCapability !== undefined && typeof field.requiresCapability !== "string") return false;
  return true;
}

/** Build a defaultProps record from a fields array (defaultValue → props[name]). */
export function defaultPropsFromFields(fields: RegistryFieldDefinition[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.defaultValue !== undefined) out[f.name] = f.defaultValue;
  }
  return out;
}

/** Merge persisted config over field defaults (persisted wins; missing falls back to defaultValue). */
export function applyFieldDefaults(
  fields: RegistryFieldDefinition[],
  persisted: Record<string, unknown>,
): Record<string, unknown> {
  const defaults = defaultPropsFromFields(fields);
  return { ...defaults, ...persisted };
}

/**
 * Validate a single field value against its validation rules.
 * Returns null if valid, or an error string.
 */
export function validateFieldValue(field: RegistryFieldDefinition, value: unknown): string | null {
  const v = field.validation;
  if (!v) return null;
  if (v.required && (value === undefined || value === null || String(value).trim() === "")) {
    return `${field.label} is required`;
  }
  if (typeof value === "number") {
    if (v.min !== undefined && value < v.min) return `${field.label} must be >= ${v.min}`;
    if (v.max !== undefined && value > v.max) return `${field.label} must be <= ${v.max}`;
  }
  if (typeof value === "string") {
    if (v.minLength !== undefined && value.length < v.minLength) return `${field.label} must be at least ${v.minLength} characters`;
    if (v.maxLength !== undefined && value.length > v.maxLength) return `${field.label} must be at most ${v.maxLength} characters`;
    if (v.pattern && !new RegExp(v.pattern).test(value)) return `${field.label} format is invalid`;
  }
  return null;
}

/**
 * Return the subset of fields visible for a plan's capabilities.
 * When `can` returns false for a field's requiresCapability, the field
 * is marked disabled (not removed) so the inspector can show an upgrade hint.
 */
export function withCapabilityState(
  fields: RegistryFieldDefinition[],
  can: (capability: string) => boolean,
): Array<RegistryFieldDefinition & { disabled: boolean }> {
  return fields.map((f) => ({
    ...f,
    disabled: f.requiresCapability ? !can(f.requiresCapability) : false,
  }));
}

// ── RSC wire types ────────────────────────────────────────────
/** Wire-safe field (identical to RegistryFieldDefinition — kept as alias for RSC contract docs). */
export type RegistryFieldWire = RegistryFieldDefinition;

/** Serialize fields for RSC transport (JSON round-trip safe). */
export function serializeFields(fields: RegistryFieldDefinition[]): RegistryFieldWire[] {
  return JSON.parse(JSON.stringify(fields)) as RegistryFieldWire[];
}

/** Deserialize wire fields on client. */
export function deserializeFields(wire: RegistryFieldWire[]): RegistryFieldDefinition[] {
  return wire as RegistryFieldDefinition[];
}
