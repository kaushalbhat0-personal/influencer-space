import type { ComponentDefinition, ComponentCategory, RegistryEntry } from "./types";

export class ComponentRegistry {
  private entries = new Map<string, RegistryEntry>();

  register(definition: ComponentDefinition): void {
    this.entries.set(definition.id, {
      definition,
      registeredAt: new Date(),
      deprecated: false,
      replacedBy: null,
    });
  }

  get(id: string): ComponentDefinition | undefined {
    return this.entries.get(id)?.definition;
  }

  getAll(): ComponentDefinition[] {
    return Array.from(this.entries.values())
      .filter((e) => !e.deprecated)
      .map((e) => e.definition);
  }

  getByCategory(category: ComponentCategory): ComponentDefinition[] {
    return this.getAll().filter((c) => c.category === category);
  }

  getCategories(): { category: ComponentCategory; components: ComponentDefinition[] }[] {
    const map = new Map<ComponentCategory, ComponentDefinition[]>();
    for (const comp of this.getAll()) {
      if (!map.has(comp.category)) map.set(comp.category, []);
      map.get(comp.category)!.push(comp);
    }
    return Array.from(map.entries()).map(([category, components]) => ({ category, components }));
  }

  search(query: string): ComponentDefinition[] {
    const q = query.toLowerCase();
    return this.getAll().filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }

  get size(): number {
    return this.entries.size;
  }
}

export const componentRegistry = new ComponentRegistry();
