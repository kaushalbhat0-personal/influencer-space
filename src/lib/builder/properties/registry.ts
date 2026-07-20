import type { PropertyDescriptor, PropertyQuery, PropertyCategory } from "./types";
import type { PropertySchema } from "@/lib/module/types";
import { PROPERTY_GROUPS } from "./types";
import { registryFacade } from "@/lib/registry/facade";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

export class PropertyRegistry {
  private descriptors = new Map<string, PropertyDescriptor[]>();
  private byModule = new Map<string, PropertyDescriptor[]>();

  registerFromMetadata(moduleId: string): number {
    const entry = registryFacade.module.get(moduleId);
    if (!entry) return 0;

    const meta = entry.definition.metadata;
    if (!meta || !meta.propertySchema || meta.propertySchema.length === 0) return 0;

    const props: PropertyDescriptor[] = meta.propertySchema.map((schema: PropertySchema) => ({
      id: `${moduleId}:${schema.key}`,
      moduleId,
      key: schema.key,
      label: schema.label,
      description: schema.description ?? null,
      group: schema.group ?? "content",
      category: (schema.group ?? "content") as PropertyCategory,
      editorType: schema.type,
      defaultValue: schema.defaultValue ?? null,
      currentValue: schema.defaultValue ?? null,
      responsive: false,
      required: schema.required,
      readOnly: false,
      visible: true,
      order: schema.order,
      options: schema.options ?? null,
      placeholder: schema.placeholder,
      min: schema.min,
      max: schema.max,
      step: schema.step,
      validation: schema.validation ?? undefined,
      capabilities: meta.capabilities ?? null,
    }));

    this.descriptors.set(moduleId, props);
    this.byModule.set(moduleId, props);

    platformTelemetry.counter("builder.property.registered", 1, { moduleId });
    return props.length;
  }

  register(moduleId: string, properties: PropertyDescriptor[]): void {
    this.descriptors.set(moduleId, properties);
    this.byModule.set(moduleId, properties);
  }

  unregister(moduleId: string): boolean {
    this.descriptors.delete(moduleId);
    return this.byModule.delete(moduleId);
  }

  get(moduleId: string): PropertyDescriptor[] {
    return this.byModule.get(moduleId) ?? [];
  }

  getById(descriptorId: string): PropertyDescriptor | null {
    for (const props of Array.from(this.byModule.values())) {
      const found = props.find((p) => p.id === descriptorId);
      if (found) return found;
    }
    return null;
  }

  list(query?: PropertyQuery): PropertyDescriptor[] {
    let results: PropertyDescriptor[] = [];
    if (query?.moduleId) {
      results = this.get(query.moduleId);
    } else {
      for (const props of Array.from(this.byModule.values())) results.push(...props);
    }
    if (query?.group) results = results.filter((p) => p.group === query.group);
    if (query?.category) results = results.filter((p) => p.category === query.category);
    if (query?.search) {
      const s = query.search.toLowerCase();
      results = results.filter((p) => p.label.toLowerCase().includes(s) || p.key.toLowerCase().includes(s));
    }
    results.sort((a, b) => a.order - b.order);
    return results;
  }

  getGroups(moduleId: string) {
    const props = this.get(moduleId);
    const usedGroups = new Set(props.map((p) => p.group));
    return Object.values(PROPERTY_GROUPS)
      .filter((g) => usedGroups.has(g.id))
      .sort((a, b) => a.order - b.order);
  }

  getCategories(moduleId: string): string[] {
    const props = this.get(moduleId);
    const cats = props.map((p: PropertyDescriptor) => p.category);
    return Array.from(new Set(cats)).sort();
  }

  has(moduleId: string): boolean { return this.byModule.has(moduleId); }

  clear(): void { this.descriptors.clear(); this.byModule.clear(); }

  get size(): number { return this.byModule.size; }
}

export const propertyRegistry = new PropertyRegistry();
