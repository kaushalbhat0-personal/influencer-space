import type { ModuleId, RegistryEntry } from "@/lib/module/types";
import type { LayoutConfig, ResolvedLayout } from "./types";

const DEFAULT_LAYOUT_CONFIG_KEY = "layout_config";

export class LayoutResolver {
  resolve(
    modules: RegistryEntry[],
    layout?: LayoutConfig
  ): ResolvedLayout {
    if (layout && layout.moduleOrder.length > 0) {
      return this.resolveFromConfig(modules, layout);
    }

    return this.resolveDefault(modules);
  }

  private resolveFromConfig(
    modules: RegistryEntry[],
    layout: LayoutConfig
  ): ResolvedLayout {
    const moduleMap = new Map<ModuleId, RegistryEntry>();
    for (const mod of modules) {
      moduleMap.set(mod.definition.identity.id, mod);
    }

    const resolved: ResolvedLayout["modules"] = [];

    for (let i = 0; i < layout.moduleOrder.length; i++) {
      const moduleId = layout.moduleOrder[i]!;
      const entry = moduleMap.get(moduleId);

      if (entry) {
        const visible = layout.moduleVisibility[moduleId] ?? true;
        resolved.push({
          moduleId,
          order: i,
          visible,
        });
        moduleMap.delete(moduleId);
      }
    }

    for (const [moduleId] of Array.from(moduleMap.entries())) {
      resolved.push({
        moduleId,
        order: resolved.length,
        visible: layout.moduleVisibility[moduleId] ?? true,
      });
    }

    return {
      name: layout.layoutName,
      modules: resolved,
    };
  }

  private resolveDefault(modules: RegistryEntry[]): ResolvedLayout {
    const enabledModules = modules.filter(
      (m) =>
        m.definition.surfaces.supported.length > 0
    );

    const resolved: ResolvedLayout["modules"] = enabledModules.map(
      (m, i) => ({
        moduleId: m.definition.identity.id,
        order: i,
        visible: true,
      })
    );

    return {
      name: "default",
      modules: resolved,
    };
  }

  resolveFromThemeLayouts(
    modules: RegistryEntry[],
    layoutNames: string[],
    themeLayouts: Array<{
      name: string;
      moduleOrder: string[];
      moduleVisibility: Record<string, boolean>;
    }>
  ): ResolvedLayout | null {
    for (const layoutName of layoutNames) {
      const themeLayout = themeLayouts.find((l) => l.name === layoutName);
      if (themeLayout) {
        return this.resolveFromConfig(modules, {
          moduleOrder: themeLayout.moduleOrder,
          moduleVisibility: themeLayout.moduleVisibility,
          layoutName: themeLayout.name,
        });
      }
    }

    return null;
  }

  getDefaultLayoutKey(): string {
    return DEFAULT_LAYOUT_CONFIG_KEY;
  }

  validateLayoutConfig(config: LayoutConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const seen = new Set<ModuleId>();

    for (const moduleId of config.moduleOrder) {
      if (seen.has(moduleId)) {
        errors.push(`Duplicate module ID in layout: "${moduleId}"`);
      }
      seen.add(moduleId);
    }

    if (config.moduleOrder.length === 0) {
      warnings.push("Layout has no modules configured");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
