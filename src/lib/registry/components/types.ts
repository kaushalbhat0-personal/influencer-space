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

export interface ComponentDefinition {
  id: string;
  type: string;
  name: string;
  category: ComponentCategory;
  icon: string;
  description: string;
  version: string;
  supportsAI: boolean;
  supportsTheme: boolean;
  supportsAnimation: boolean;
  supportsResponsive: boolean;
  supportsSEO: boolean;
  animations: ComponentAnimation[];
  responsive: ComponentResponsive;
  /** Zod schema for component props validation */
  schema: unknown;
  /** Default props for new instances */
  defaultProps: Record<string, unknown>;
  /** Builder settings panel component */
  SettingsPanel?: ComponentType<{ props: Record<string, unknown>; onChange: (props: Record<string, unknown>) => void }>;
  /** Client component for storefront rendering */
  StorefrontComponent?: ComponentType<{ props: Record<string, unknown> }>;
}

export interface RegistryEntry {
  definition: ComponentDefinition;
  registeredAt: Date;
  deprecated: boolean;
  replacedBy: string | null;
}
