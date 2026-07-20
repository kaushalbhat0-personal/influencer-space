import type { ConfigSchema } from "../types";
import type { SchemaCategory, SchemaEntry, SchemaQuery, SchemaValidationResult, SchemaCompatibilityResult } from "./types";
import type { SemVer } from "@/lib/theme/types";
import { registryEvents } from "@/lib/registry/events";

export class SchemaRegistry {
  private schemas = new Map<string, SchemaEntry>();

  register(
    key: string,
    schema: ConfigSchema,
    options: {
      category?: SchemaCategory;
      version?: SemVer;
      inheritsFrom?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): { success: boolean; error?: string } {
    if (this.schemas.has(key)) {
      return { success: false, error: `Schema "${key}" is already registered` };
    }

    if (!key || key.trim().length === 0) {
      return { success: false, error: "Schema key is required" };
    }

    if (options.inheritsFrom && !this.schemas.has(options.inheritsFrom)) {
      return { success: false, error: `Parent schema "${options.inheritsFrom}" not found` };
    }

    const entry: SchemaEntry = {
      key,
      schema: { ...schema },
      category: options.category ?? "platform",
      version: options.version ?? "1.0.0",
      inheritsFrom: options.inheritsFrom ?? null,
      description: options.description ?? `Schema for ${key}`,
      deprecated: false,
      replacedBy: null,
      metadata: options.metadata ?? {},
      registeredAt: new Date().toISOString(),
    };

    this.schemas.set(key, Object.freeze(entry));

    registryEvents.emit("schema:registered" as never, {
      key,
      category: entry.category,
      version: entry.version,
    } as never);

    return { success: true };
  }

  unregister(key: string): boolean {
    const deleted = this.schemas.delete(key);
    if (deleted) {
      registryEvents.emit("schema:removed" as never, { key } as never);
    }
    return deleted;
  }

  get(key: string): SchemaEntry | null {
    return this.schemas.get(key) ?? null;
  }

  getSchema(key: string): ConfigSchema | null {
    return this.schemas.get(key)?.schema ?? null;
  }

  list(query?: SchemaQuery): SchemaEntry[] {
    let entries = Array.from(this.schemas.values());

    if (query?.category) {
      entries = entries.filter((e) => e.category === query.category);
    }
    if (query?.deprecated !== undefined) {
      entries = entries.filter((e) => e.deprecated === query.deprecated);
    }
    if (query?.search) {
      const s = query.search.toLowerCase();
      entries = entries.filter(
        (e) => e.key.toLowerCase().includes(s) || e.description.toLowerCase().includes(s)
      );
    }

    return entries;
  }

  listKeys(): string[] {
    return Array.from(this.schemas.keys());
  }

  has(key: string): boolean {
    return this.schemas.has(key);
  }

  validate(key: string, value: unknown): SchemaValidationResult {
    const entry = this.schemas.get(key);
    if (!entry) {
      return {
        valid: false,
        errors: [{ key, message: `No schema registered for "${key}"` }],
        warnings: [],
      };
    }

    return this.validateWithSchema(entry.schema, key, value);
  }

  validateAll(entries: Array<{ key: string; value: unknown }>): SchemaValidationResult {
    const allErrors: { key: string; message: string }[] = [];
    const allWarnings: { key: string; message: string }[] = [];

    for (const entry of entries) {
      const result = this.validate(entry.key, entry.value);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return { valid: allErrors.length === 0, errors: allErrors, warnings: allWarnings };
  }

  checkCompatibility(key: string, requiredVersion: SemVer): SchemaCompatibilityResult {
    const entry = this.schemas.get(key);
    if (!entry) {
      return {
        compatible: false,
        version: "0.0.0",
        requiredVersion,
        missingFields: [],
        typeConflicts: [],
      };
    }

    const [regMajor] = entry.version.split(".").map(Number);
    const [reqMajor] = requiredVersion.split(".").map(Number);

    if (regMajor! < reqMajor!) {
      return {
        compatible: false,
        version: entry.version,
        requiredVersion,
        missingFields: [],
        typeConflicts: [`Schema version ${entry.version} is below required ${requiredVersion}`],
      };
    }

    return {
      compatible: true,
      version: entry.version,
      requiredVersion,
      missingFields: [],
      typeConflicts: [],
    };
  }

  deprecate(key: string, replacedBy?: string): boolean {
    const entry = this.schemas.get(key);
    if (!entry) return false;

    const updated: SchemaEntry = {
      ...entry,
      deprecated: true,
      replacedBy: replacedBy ?? null,
      metadata: { ...entry.metadata, deprecatedAt: new Date().toISOString() },
    };

    this.schemas.set(key, Object.freeze(updated));
    return true;
  }

  get size(): number {
    return this.schemas.size;
  }

  private validateWithSchema(
    schema: ConfigSchema,
    key: string,
    value: unknown
  ): SchemaValidationResult {
    const errors: { key: string; message: string }[] = [];
    const warnings: { key: string; message: string }[] = [];

    if (value === undefined || value === null) {
      if (schema.required) {
        errors.push({ key, message: `"${key}" is required` });
      }
      return { valid: errors.length === 0, errors, warnings };
    }

    switch (schema.type) {
      case "string":
        if (typeof value !== "string") {
          errors.push({ key, message: `"${key}" must be a string` });
        } else if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
          errors.push({ key, message: `"${key}" does not match pattern` });
        }
        break;
      case "number":
        if (typeof value !== "number") {
          errors.push({ key, message: `"${key}" must be a number` });
        } else {
          if (schema.min !== undefined && value < schema.min)
            errors.push({ key, message: `"${key}" must be >= ${schema.min}` });
          if (schema.max !== undefined && value > schema.max)
            errors.push({ key, message: `"${key}" must be <= ${schema.max}` });
        }
        break;
      case "boolean":
        if (typeof value !== "boolean")
          errors.push({ key, message: `"${key}" must be a boolean` });
        break;
      case "object":
        if (typeof value !== "object" || value === null || Array.isArray(value))
          errors.push({ key, message: `"${key}" must be an object` });
        break;
      case "array":
        if (!Array.isArray(value))
          errors.push({ key, message: `"${key}" must be an array` });
        break;
    }

    if (schema.enum && schema.enum.length > 0) {
      const normalized = JSON.stringify(value);
      if (!schema.enum.some((e) => JSON.stringify(e) === normalized)) {
        errors.push({ key, message: `"${key}" must be one of the allowed values` });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}

export const schemaRegistry = new SchemaRegistry();
