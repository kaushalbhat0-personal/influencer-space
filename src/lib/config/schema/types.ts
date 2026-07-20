import type { ConfigSchema } from "../types";
import type { SemVer } from "@/lib/theme/types";

export type SchemaCategory =
  | "platform"
  | "theme"
  | "module"
  | "capability"
  | "plugin"
  | "feature-flag";

export interface SchemaEntry {
  key: string;
  schema: ConfigSchema;
  category: SchemaCategory;
  version: SemVer;
  inheritsFrom: string | null;
  description: string;
  deprecated: boolean;
  replacedBy: string | null;
  metadata: Record<string, unknown>;
  registeredAt: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: { key: string; message: string }[];
  warnings: { key: string; message: string }[];
}

export interface SchemaCompatibilityResult {
  compatible: boolean;
  version: SemVer;
  requiredVersion: SemVer | null;
  missingFields: string[];
  typeConflicts: string[];
}

export interface SchemaQuery {
  category?: SchemaCategory;
  deprecated?: boolean;
  search?: string;
}
