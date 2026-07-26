import { componentRegistry } from "@/lib/registry/components/registry";
import type { ComponentDefinition, ComponentCategory } from "@/lib/registry/components/types";

export function getAllSectionDefinitions(): ComponentDefinition[] {
  return componentRegistry.getAll();
}

export function getSectionDefinition(id: string): ComponentDefinition | undefined {
  return componentRegistry.get(id);
}

export function getSectionDefinitionsByCategory(category: ComponentCategory): ComponentDefinition[] {
  return componentRegistry.getByCategory(category);
}

export function searchSectionDefinitions(query: string): ComponentDefinition[] {
  return componentRegistry.search(query);
}

export function getCategories(): { category: ComponentCategory; components: ComponentDefinition[] }[] {
  return componentRegistry.getCategories();
}
