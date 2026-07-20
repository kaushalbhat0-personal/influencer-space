import type { TemplateFile, GeneratedFile, Generator, TemplateDefinition } from "./types";

export class TemplateEngine {
  private variables: Record<string, string> = {};

  setVariables(vars: Record<string, string>): void {
    this.variables = { ...this.variables, ...vars };
  }

  render(template: TemplateFile, overrides?: Record<string, string>): string {
    const vars = { ...this.variables, ...overrides };
    let result = template.template;

    for (const [key, value] of Object.entries(vars)) {
      result = result.replaceAll(`{{${key}}}`, value);
    }

    const missing = template.variables.filter((v) => !(v in vars));
    for (const m of missing) {
      result = result.replaceAll(`{{${m}}}`, `[MISSING:${m}]`);
    }

    return result;
  }

  renderAll(template: TemplateFile[], overrides?: Record<string, string>): GeneratedFile[] {
    return template.map((t) => ({
      path: this.renderPath(t.path, overrides),
      content: this.render(t, overrides),
      type: this.inferType(t.path),
    }));
  }

  private renderPath(path: string, vars?: Record<string, string>): string {
    let result = path;
    if (vars) {
      for (const [key, value] of Object.entries(vars)) {
        result = result.replaceAll(`{{${key}}}`, value);
      }
    }
    return result;
  }

  private inferType(path: string): GeneratedFile["type"] {
    if (path.includes("definition")) return "definition";
    if (path.includes("types")) return "types";
    if (path.includes("manifest")) return "manifest";
    if (path.includes("register") || path.includes("index")) return "registration";
    if (path.includes("test") || path.includes("spec")) return "test";
    if (path.includes("doc") || path.includes("readme")) return "docs";
    if (path.includes("config") || path.includes("schema")) return "config";
    return "definition";
  }
}

export class GeneratorRegistry {
  private generators = new Map<string, Generator>();

  register(generator: Generator): void {
    this.generators.set(generator.type, generator);
  }

  get(type: string): Generator | null {
    return this.generators.get(type) ?? null;
  }

  list(): Generator[] {
    return Array.from(this.generators.values());
  }

  get size(): number { return this.generators.size; }
}

export class TemplateRegistry {
  private templates = new Map<string, TemplateDefinition>();

  register(template: TemplateDefinition): void {
    this.templates.set(template.id, template);
  }

  get(id: string): TemplateDefinition | null {
    return this.templates.get(id) ?? null;
  }

  list(type?: string): TemplateDefinition[] {
    const all = Array.from(this.templates.values());
    return type ? all.filter((t) => t.artifactType === type) : all;
  }

  get size(): number { return this.templates.size; }
}

export const generatorRegistry = new GeneratorRegistry();
export const templateRegistry = new TemplateRegistry();
