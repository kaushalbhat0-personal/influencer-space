import type { PromptTemplate } from "./types";
import type { VersionedPromptRegistry } from "./prompt-registry";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PromptValidator {
  validateAll(registry: VersionedPromptRegistry): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const templates = registry.list();

    const ids = new Map<string, PromptTemplate>();
    for (const t of templates) {
      if (ids.has(t.id)) {
        errors.push(`Duplicate id: ${t.id}`);
      }
      ids.set(t.id, t);
    }

    for (const t of templates) {
      if (t.parentId && !ids.has(t.parentId)) {
        errors.push(`Missing parent "${t.parentId}" for "${t.id}"`);
      }

      if (!t.system || t.system.trim().length === 0) {
        errors.push(`Empty system prompt: ${t.id}`);
      }
      if (!t.template || t.template.trim().length === 0) {
        errors.push(`Empty template: ${t.id}`);
      }

      this.validateTemplateVars(t, warnings);
    }

    this.detectCircularInheritance(templates, errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateTemplateVars(template: PromptTemplate, warnings: string[]): void {
    const content = template.system + " " + template.template;
    const usedVars = new Set<string>();
    const pattern = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      usedVars.add(match[1]!);
    }

    const definedVars = new Set(template.variables.map((v) => v.name));

    for (const v of Array.from(usedVars)) {
      if (!definedVars.has(v)) {
        warnings.push(`Undefined variable "{{${v}}}" in "${template.id}"`);
      }
    }
  }

  private detectCircularInheritance(templates: PromptTemplate[], errors: string[]): void {
    const idMap = new Map(templates.map((t) => [t.id, t]));

    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (id: string, path: string[]): boolean => {
      if (inStack.has(id)) {
        errors.push(`Circular inheritance detected: ${[...path, id].join(" → ")}`);
        return true;
      }
      if (visited.has(id)) return false;

      visited.add(id);
      inStack.add(id);

      const t = idMap.get(id);
      if (t?.parentId) {
        const result = dfs(t.parentId, [...path, id]);
        if (result) return true;
      }

      inStack.delete(id);
      return false;
    };

    for (const t of templates) {
      if (!visited.has(t.id)) {
        dfs(t.id, []);
      }
    }
  }
}
