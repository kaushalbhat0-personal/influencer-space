import type { ContentGenerator } from "./interface";

export class ContentGeneratorRegistry {
  private generators = new Map<string, ContentGenerator>();

  register(generator: ContentGenerator): void {
    this.generators.set(generator.id, generator);
  }

  get(id: string): ContentGenerator | undefined {
    return this.generators.get(id);
  }

  getAll(): ContentGenerator[] {
    return Array.from(this.generators.values());
  }

  getByComponentId(componentId: string): ContentGenerator[] {
    return this.getAll().filter((g) => g.componentIds.includes(componentId));
  }

  get size(): number {
    return this.generators.size;
  }
}

export const contentGeneratorRegistry = new ContentGeneratorRegistry();
