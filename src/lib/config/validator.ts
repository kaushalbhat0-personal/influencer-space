import type { ConfigSchema, ConfigValue, ConfigValidationResult } from "./types";

export class ConfigValidator {
  private schemas = new Map<string, ConfigSchema>();

  registerSchema(key: string, schema: ConfigSchema): void {
    this.schemas.set(key, schema);
  }

  unregisterSchema(key: string): boolean {
    return this.schemas.delete(key);
  }

  getSchema(key: string): ConfigSchema | undefined {
    return this.schemas.get(key);
  }

  listSchemas(): Map<string, ConfigSchema> {
    return new Map(this.schemas);
  }

  validate(key: string, value: ConfigValue): ConfigValidationResult {
    const errs: { key: string; message: string }[] = [];
    const warns: { key: string; message: string }[] = [];

    const schema = this.schemas.get(key);
    if (!schema) {
      return { valid: true, errors: [], warnings: [{ key, message: `No schema registered for "${key}"` }] };
    }

    if (value === undefined || value === null) {
      if (schema.required) {
        errs.push({ key, message: `"${key}" is required` });
      }
      return { valid: errs.length === 0, errors: errs, warnings: warns };
    }

    switch (schema.type) {
      case "string":
        if (typeof value !== "string") {
          errs.push({ key, message: `"${key}" must be a string` });
        } else if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
          errs.push({ key, message: `"${key}" does not match pattern "${schema.pattern}"` });
        }
        break;
      case "number":
        if (typeof value !== "number") {
          errs.push({ key, message: `"${key}" must be a number` });
        } else {
          if (schema.min !== undefined && value < schema.min) {
            errs.push({ key, message: `"${key}" must be >= ${schema.min}` });
          }
          if (schema.max !== undefined && value > schema.max) {
            errs.push({ key, message: `"${key}" must be <= ${schema.max}` });
          }
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          errs.push({ key, message: `"${key}" must be a boolean` });
        }
        break;
      case "object":
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          errs.push({ key, message: `"${key}" must be an object` });
        }
        break;
      case "array":
        if (!Array.isArray(value)) {
          errs.push({ key, message: `"${key}" must be an array` });
        }
        break;
    }

    if (schema.enum && schema.enum.length > 0) {
      const normalized = JSON.stringify(value);
      const inEnum = schema.enum.some((e) => JSON.stringify(e) === normalized);
      if (!inEnum) {
        errs.push({ key, message: `"${key}" must be one of the allowed values` });
      }
    }

    return { valid: errs.length === 0, errors: errs, warnings: warns };
  }

  validateBatch(entries: Array<{ key: string; value: ConfigValue }>): ConfigValidationResult {
    const allErrors: { key: string; message: string }[] = [];
    const allWarnings: { key: string; message: string }[] = [];

    for (const entry of entries) {
      const result = this.validate(entry.key, entry.value);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return { valid: allErrors.length === 0, errors: allErrors, warnings: allWarnings };
  }
}
