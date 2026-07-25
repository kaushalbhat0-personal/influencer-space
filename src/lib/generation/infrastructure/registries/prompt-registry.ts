import type { PromptDefinition, PromptRegistry } from "@/lib/generation/contracts";

interface PromptEntry {
  definition: PromptDefinition;
  immutable: true;
}

export class InMemoryPromptRegistry implements PromptRegistry {
  private prompts = new Map<string, PromptEntry[]>();

  register(name: string, prompt: PromptDefinition): void {
    const existing = this.prompts.get(name) ?? [];
    if (existing.length > 0 && existing.some((e) => e.definition.version === prompt.version)) {
      throw new Error(`Prompt "${name}" version "${prompt.version}" already registered`);
    }
    existing.push({ definition: { ...prompt }, immutable: true });
    this.prompts.set(name, existing);
  }

  get(name: string): PromptDefinition | null {
    const versions = this.prompts.get(name);
    if (!versions || versions.length === 0) return null;
    return { ...versions[versions.length - 1]!.definition };
  }

  latest(name: string): PromptDefinition | null {
    return this.get(name);
  }

  versions(name: string): PromptDefinition[] {
    const entries = this.prompts.get(name) ?? [];
    return entries.map((e) => ({ ...e.definition }));
  }

  getAll(): Map<string, PromptDefinition> {
    const result = new Map<string, PromptDefinition>();
    for (const [name, versions] of Array.from(this.prompts)) {
      const latest = versions[versions.length - 1];
      if (latest) result.set(name, { ...latest.definition });
    }
    return result;
  }

  has(name: string): boolean {
    return this.prompts.has(name) && (this.prompts.get(name)?.length ?? 0) > 0;
  }

  count(): number {
    return this.prompts.size;
  }
}
