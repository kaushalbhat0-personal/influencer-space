import type { ThemeLayer } from "@/lib/theme/types";

export type ConfigLayer = ThemeLayer;

export type ConfigKey = string;

export type ConfigValue = unknown;

export interface ConfigEntry {
  key: ConfigKey;
  value: ConfigValue;
  layer: ConfigLayer;
  updatedAt: string;
  version: number;
  locked: boolean;
  schema?: ConfigSchema;
}

export interface ConfigSchema {
  type: "string" | "number" | "boolean" | "object" | "array";
  required?: boolean;
  defaultValue?: ConfigValue;
  enum?: ConfigValue[];
  min?: number;
  max?: number;
  pattern?: string;
  description?: string;
  sensitive?: boolean;
}

export interface ConfigPatch {
  key: ConfigKey;
  value: ConfigValue;
  operation: "set" | "delete" | "merge";
}

export interface ConfigPatchResult {
  success: boolean;
  key: ConfigKey;
  operation: ConfigPatch["operation"];
  previousValue: ConfigValue;
  newValue: ConfigValue;
  errors: string[];
}

export interface ConfigSnapshot {
  id: string;
  version: number;
  entries: Record<ConfigKey, ConfigEntry>;
  createdAt: string;
  createdBy: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
}

export interface ConfigDiff {
  key: ConfigKey;
  operation: "added" | "removed" | "modified" | "unchanged";
  before: ConfigValue;
  after: ConfigValue;
  layer: ConfigLayer;
}

export interface ConfigDiffResult {
  before: ConfigSnapshot;
  after: ConfigSnapshot;
  changes: ConfigDiff[];
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
    total: number;
  };
}

export interface ConfigHistoryEntry {
  id: string;
  configKey: ConfigKey;
  previousValue: ConfigValue;
  newValue: ConfigValue;
  layer: ConfigLayer;
  timestamp: string;
  actor: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
}

export interface ConfigAuditEntry {
  id: string;
  action: string;
  configKey: ConfigKey;
  layer: ConfigLayer;
  before: ConfigValue;
  after: ConfigValue;
  diff: ConfigDiff[] | null;
  reason: string | null;
  actor: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface ConfigStoreOptions {
  tenantId: string;
  layer?: ConfigLayer;
  schema?: ConfigSchema;
  actor?: string;
  reason?: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: { key: string; message: string }[];
  warnings: { key: string; message: string }[];
}

export interface ConfigResolutionResult {
  values: Record<string, ConfigValue>;
  sources: Record<string, ConfigLayer>;
  locked: string[];
  overrides: string[];
}

export interface IConfigStore {
  get(tenantId: string, key: ConfigKey): Promise<ConfigEntry | null>;
  set(tenantId: string, key: ConfigKey, value: ConfigValue, options?: { layer?: ConfigLayer; actor?: string; reason?: string }): Promise<ConfigEntry>;
  delete(tenantId: string, key: ConfigKey): Promise<boolean>;
  list(tenantId: string, prefix?: string): Promise<ConfigEntry[]>;
  patch(tenantId: string, patches: ConfigPatch[], options?: { layer?: ConfigLayer; actor?: string; reason?: string }): Promise<ConfigPatchResult[]>;
  snapshot(tenantId: string): Promise<ConfigSnapshot>;
  restore(tenantId: string, snapshot: ConfigSnapshot): Promise<boolean>;
}

export interface IConfigHistory {
  record(entry: ConfigHistoryEntry): Promise<void>;
  list(tenantId: string, key?: ConfigKey, limit?: number): Promise<ConfigHistoryEntry[]>;
  getVersion(tenantId: string, key: ConfigKey, version: number): Promise<ConfigEntry | null>;
  rollback(tenantId: string, key: ConfigKey, targetVersion: number): Promise<ConfigEntry | null>;
}
