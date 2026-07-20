import { themeRegistry } from "@/lib/theme/registry";
import { surfaceRegistry } from "@/lib/module/surface-registry";
import { ModuleRegistry } from "@/lib/module/registry";
import { registryEvents } from "./events";
import { DiagnosticEngine } from "./diagnostics";

import type { ThemeId, Theme, ThemeManifest, ThemeValidationError, SurfaceId } from "@/lib/theme/types";
import type { RegistryEntry as ThemeRegistryEntry } from "@/lib/theme/registry";
import type { ModuleId, ModuleDefinition, ModuleQuery, ModuleValidationResult, DependencyGraph, SemVer, RegistryEntry as ModuleRegistryEntry, ModuleLifecycleState } from "@/lib/module/types";
import type { SurfaceDefinition, SurfaceValidationResult } from "@/lib/module/surface-registry";
import type { DiagnosticReport } from "./diagnostics";

const moduleRegistryInstance = new ModuleRegistry(surfaceRegistry);

export interface RegistryMap {
  theme: typeof themeRegistry;
  module: ModuleRegistry;
  surface: typeof surfaceRegistry;
  provider: null;
  capability: null;
  event: null;
  featureFlag: null;
  plugin: null;
  marketplace: null;
}

export class RegistryFacade {
  readonly registries: RegistryMap;
  readonly events = registryEvents;
  readonly diagnostics: DiagnosticEngine;

  constructor() {
    this.registries = {
      theme: themeRegistry,
      module: moduleRegistryInstance,
      surface: surfaceRegistry,
      provider: null,
      capability: null,
      event: null,
      featureFlag: null,
      plugin: null,
      marketplace: null,
    };

    this.diagnostics = new DiagnosticEngine(moduleRegistryInstance, surfaceRegistry);
  }

  get theme() {
    return this.registries.theme;
  }

  get module() {
    return this.registries.module;
  }

  get surface() {
    return this.registries.surface;
  }

  validateAll(): {
    theme: Map<ThemeId, import("@/lib/theme/types").ThemeValidationResult>;
    module: Map<ModuleId, ModuleValidationResult>;
    surface: SurfaceValidationResult;
  } {
    const themeResults = new Map<ThemeId, import("@/lib/theme/types").ThemeValidationResult>();
    for (const id of this.registries.theme.listIds()) {
      const result = this.registries.theme.validate(id);
      if (result) themeResults.set(id, result);
    }

    const moduleResults = this.registries.module.validateAll();

    const surfaceResult = this.registries.surface.validate(
      this.registries.module.listIds().flatMap((id) => {
        const entry = this.registries.module.get(id);
        return entry?.definition.surfaces.supported.map((s) => s.surfaceId) ?? [];
      })
    );

    return {
      theme: themeResults,
      module: moduleResults,
      surface: surfaceResult,
    };
  }

  healthCheck(): {
    status: "healthy" | "degraded" | "unhealthy";
    themeCount: number;
    moduleCount: number;
    surfaceCount: number;
    eventListenerCount: number;
    diagnosticSummary: ReturnType<DiagnosticEngine["getSummary"]>;
  } {
    const diagnosticSummary = this.diagnostics.getSummary();

    const unhealthy = diagnosticSummary.unhealthy;
    const degraded = diagnosticSummary.degraded;

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (unhealthy > 0) status = "unhealthy";
    else if (degraded > 2) status = "degraded";

    return {
      status,
      themeCount: this.registries.theme.size,
      moduleCount: this.registries.module.size,
      surfaceCount: this.registries.surface.size,
      eventListenerCount: this.events.listenerCount(),
      diagnosticSummary,
    };
  }
}

export const registryFacade = new RegistryFacade();

export type { ThemeId, Theme, ThemeManifest, ThemeValidationError, ThemeRegistryEntry };
export type { ModuleId, ModuleDefinition, ModuleQuery, ModuleValidationResult, DependencyGraph, SemVer, ModuleRegistryEntry, ModuleLifecycleState };
export type { SurfaceId, SurfaceDefinition, SurfaceValidationResult };
export type { DiagnosticReport };
