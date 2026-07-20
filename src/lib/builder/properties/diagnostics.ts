import type { PropertyDiagnostics } from "./types";
import { propertyRegistry } from "./registry";
import { registryFacade } from "@/lib/registry/facade";
import { PROPERTY_GROUPS } from "./types";

export class PropertyDiagnosticsEngine {
  run(): PropertyDiagnostics {
    const allModuleIds = registryFacade.module.listIds();
    const modulesWithProperties: string[] = [];
    const modulesWithoutProperties: string[] = [];
    const duplicateKeys: PropertyDiagnostics["duplicateKeys"] = [];
    const invalidEditors: PropertyDiagnostics["invalidEditors"] = [];
    const missingGroups: PropertyDiagnostics["missingGroups"] = [];
    const unusedProperties: string[] = [];

    const validEditorTypes = new Set(["string", "number", "boolean", "color", "image", "select", "range", "text", "url", "json"]);

    for (const moduleId of allModuleIds) {
      const entry = registryFacade.module.get(moduleId);
      if (!entry) continue;

      const meta = entry.definition.metadata;
      if (!meta || !meta.propertySchema || meta.propertySchema.length === 0) {
        modulesWithoutProperties.push(moduleId);
        continue;
      }

      modulesWithProperties.push(moduleId);

      const seenKeys = new Map<string, number>();
      for (const schema of meta.propertySchema) {
        seenKeys.set(schema.key, (seenKeys.get(schema.key) ?? 0) + 1);
        if (!validEditorTypes.has(schema.type)) {
          invalidEditors.push({ moduleId, key: schema.key, editorType: schema.type });
        }
        if (schema.group && !PROPERTY_GROUPS[schema.group]) {
          missingGroups.push({ moduleId, key: schema.key, group: schema.group });
        }
      }
      for (const [key, count] of Array.from(seenKeys.entries())) {
        if (count > 1) duplicateKeys.push({ moduleId, key });
      }
    }

    const registeredModules = new Set(allModuleIds);
    const metaModules = new Set(modulesWithProperties);
    for (const moduleId of allModuleIds) {
      if (!metaModules.has(moduleId) && registeredModules.has(moduleId)) {
        unusedProperties.push(moduleId);
      }
    }

    return {
      totalDescriptors: propertyRegistry.size,
      modulesWithProperties: modulesWithProperties.length,
      modulesWithoutProperties,
      duplicateKeys,
      invalidEditors,
      missingGroups,
      unusedProperties,
    };
  }
}

export const propertyDiagnostics = new PropertyDiagnosticsEngine();
