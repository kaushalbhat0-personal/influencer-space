import type { ComponentType } from "react";

export type ComponentCategory =
  | "hero" | "about" | "gallery" | "products" | "timeline" | "footer"
  | "links" | "testimonials" | "faq" | "pricing" | "contact" | "newsletter"
  | "courses" | "music" | "video" | "social" | "embed" | "custom";

export interface ComponentAnimation {
  id: string;
  name: string;
}

export interface ComponentResponsive {
  mobile: boolean;
  tablet: boolean;
  desktop: boolean;
}

export interface ComponentValidation {
  schema: unknown;       // Zod schema
}
 
export interface ComponentMigration {
  fromVersion: string;
  migrate: (props: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Full component definition.
 * Every property drives Builder, Renderer, Template, AI, Settings, or Publishing.
 * No hardcoded switches — the registry is the sole source of truth.
 */
export interface ComponentDefinition {
  /** Unique identifier (e.g. "hero.default", "gallery.grid") */
  id: string;
  /** Semantic type grouping */
  type: string;
  /** Human-readable name */
  name: string;
  /** UI category for sidebar grouping */
  category: ComponentCategory;
  /** Lucide icon name */
  icon: string;
  /** Short description */
  description: string;
  /** Semver for future upgrades */
  version: string;

  // ── Feature Flags ──────────────────────────────────────
  supportsAI: boolean;
  supportsTheme: boolean;
  supportsAnimation: boolean;
  supportsResponsive: boolean;
  supportsSEO: boolean;

  // ── UI Metadata ─────────────────────────────────────────
  animations: ComponentAnimation[];
  responsive: ComponentResponsive;
  defaultProps: Record<string, unknown>;
  validation: ComponentValidation;

  // ── Pluggable Components ────────────────────────────────
  /** Storefront renderer — the registry owns the render function */
  renderer?: ComponentType<{ props: Record<string, unknown> }>;
  /** Builder settings panel */
  settingsPanel?: ComponentType<{ props: Record<string, unknown>; onChange: (props: Record<string, unknown>) => void }>;
  /** Builder toolbar actions (duplicate, delete, move up/down) */
  toolbarActions?: ComponentType<{ componentId: string }>;

  // ── Serialization ──────────────────────────────────────
  serializer?: (props: Record<string, unknown>) => Record<string, unknown>;
  deserializer?: (data: Record<string, unknown>) => Record<string, unknown>;

  // ── Versioning ─────────────────────────────────────────
  migration?: ComponentMigration[];
}

export interface RegistryEntry {
  definition: ComponentDefinition;
  registeredAt: Date;
  deprecated: boolean;
  replacedBy: string | null;
}
