import type { PromptTemplate, PromptInheritanceChain, PromptMetrics } from "./types";

export class VersionedPromptRegistry {
  private store = new Map<string, PromptTemplate[]>();
  private usage = new Map<string, PromptMetrics>();

  register(template: PromptTemplate, skipParentCheck = false): void {
    this.validateRegistration(template, skipParentCheck);

    const key = this.key(template.stage, template.version, template.niche);
    const existing = this.store.get(key) ?? [];
    existing.push(template);
    this.store.set(key, existing);
    this.usage.set(template.id, { usageCount: 0, cacheHits: 0, totalRenderTimeMs: 0, lastUsed: null });
  }

  resolve(stage: string, version: string, niche?: string): PromptTemplate {
    const exactKey = this.key(stage, version, niche);
    const exact = this.store.get(exactKey)?.slice(-1)?.[0];
    if (exact) return exact;

    const baseKey = this.key(stage, version);
    const base = this.store.get(baseKey)?.slice(-1)?.[0];
    if (base) return base;

    const defaultKey = this.key(stage, "default");
    const defaultPrompt = this.store.get(defaultKey)?.slice(-1)?.[0];
    if (defaultPrompt) return defaultPrompt;

    throw new Error(`No prompt found for stage="${stage}" version="${version}" niche="${niche ?? "none"}"`);
  }

  resolveChain(stage: string, version: string, niche?: string): PromptInheritanceChain {
    const template = this.resolve(stage, version, niche);
    const ancestors: PromptTemplate[] = [];
    let current = template;

    while (current.parentId) {
      const parent = this.findById(current.parentId);
      if (!parent) break;
      ancestors.push(parent);
      current = parent;
    }

    const resolved: PromptTemplate = {
      ...template,
      system: this.inheritField(template, ancestors, "system", template.system),
      template: this.inheritField(template, ancestors, "template", template.template),
      variables: template.variables.length > 0 ? template.variables : ancestors[ancestors.length - 1]?.variables ?? [],
    };

    return { template, ancestors, resolved };
  }

  findById(id: string): PromptTemplate | undefined {
    for (const versions of Array.from(this.store.values())) {
      const found = versions.find((t: PromptTemplate) => t.id === id);
      if (found) return found;
    }
    return undefined;
  }

  list(stage?: string): PromptTemplate[] {
    const results: PromptTemplate[] = [];
    for (const [, versions] of Array.from(this.store)) {
      if (stage) {
        results.push(...versions.filter((t) => t.stage === stage));
      } else {
        results.push(...versions);
      }
    }
    return results;
  }

  trackUsage(templateId: string, renderTimeMs: number, cached: boolean): void {
    const entry = this.usage.get(templateId);
    if (entry) {
      entry.usageCount++;
      if (cached) entry.cacheHits++;
      entry.totalRenderTimeMs += renderTimeMs;
      entry.lastUsed = new Date().toISOString();
    }
  }

  getMetrics(templateId: string): PromptMetrics | null {
    return this.usage.get(templateId) ?? null;
  }

  getAllMetrics(): Map<string, PromptMetrics> {
    return new Map(this.usage);
  }

  private validateRegistration(template: PromptTemplate, skipParentCheck = false): void {
    if (this.findById(template.id)) {
      throw new Error(`Duplicate prompt id: ${template.id}`);
    }

    if (template.parentId && !skipParentCheck) {
      const parent = this.findById(template.parentId);
      if (!parent) {
        throw new Error(`Parent prompt "${template.parentId}" not found for "${template.id}"`);
      }
    }
  }

  private key(stage: string, version: string, niche?: string): string {
    return niche ? `${stage}:${niche}:${version}` : `${stage}::${version}`;
  }

  private inheritField(template: PromptTemplate, ancestors: PromptTemplate[], field: "system" | "template", fallback: string): string {
    if (template[field] && template[field] !== "") return template[field];
    for (const a of ancestors) {
      if (a[field] && a[field] !== "") return a[field];
    }
    return fallback;
  }
}
