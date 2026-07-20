import type { ModuleId, RegistryEntry } from "@/lib/module/types";
import type { Theme, SurfaceId } from "@/lib/theme/types";
import type { SurfaceDefinition } from "@/lib/module/surface-registry";
import type {
  RenderOptions,
  RenderResult,
  LayoutConfig,
} from "./types";
import { DataLoader } from "./loader";
import { LayoutResolver } from "./layout";
import { RenderDiagnosticsCollector } from "./diagnostics";
import { themeRegistry } from "@/lib/theme/registry";
import { surfaceRegistry } from "@/lib/module/surface-registry";

export interface RenderingEngineDependencies {
  moduleRegistry: {
    list: (query?: Record<string, string | undefined>) => RegistryEntry[];
    get: (id: ModuleId) => RegistryEntry | null;
  };
}

const DEFAULT_TIMEOUT = 30000;

export class RenderingEngine {
  private loader: DataLoader;
  private layoutResolver: LayoutResolver;
  private moduleRegistry: RenderingEngineDependencies["moduleRegistry"];

  constructor(moduleRegistry: RenderingEngineDependencies["moduleRegistry"]) {
    this.loader = new DataLoader();
    this.layoutResolver = new LayoutResolver();
    this.moduleRegistry = moduleRegistry;
  }

  async render(options: RenderOptions): Promise<RenderResult> {
    const diag = options.collectDiagnostics
      ? new RenderDiagnosticsCollector()
      : null;
    diag?.start();

    const context = options.context;

    const theme = this.resolveThemeForRender();
    const tokens = theme?.tokens ?? {};

    this.validateSurface(context.surface, diag);

    const enabledModules = this.resolveEnabledModules(
      context.surface,
      options.modules
    );

    if (diag) {
      for (const mod of enabledModules) {
        const supported = mod.definition.surfaces.supported.some(
          (s) => s.surfaceId === context.surface
        );
        diag.recordCompatibility(mod.definition.identity.id, supported);
      }
    }

    let layout: LayoutConfig | undefined;
    if (options.layout) {
      try {
        layout = JSON.parse(options.layout) as LayoutConfig;
      } catch {
        diag?.recordError("Failed to parse layout config JSON");
      }
    }

    const resolvedLayout = this.layoutResolver.resolve(enabledModules, layout);

    const visibleModules = resolvedLayout.modules.filter((m) => m.visible);

    const slots = await this.loader.loadAll(
      visibleModules.map((m) => {
        const entry = this.moduleRegistry.get(m.moduleId)!;
        return {
          moduleId: m.moduleId,
          definition: entry.definition,
        };
      }),
      context.tenantId,
      {
        timeout: options.timeout ?? DEFAULT_TIMEOUT,
        abortSignal: options.abortSignal,
      }
    );

    for (const slot of slots) {
      const layoutEntry = visibleModules.find(
        (m) => m.moduleId === slot.moduleId
      );
      if (layoutEntry) {
        slot.order = layoutEntry.order;
        slot.visible = layoutEntry.visible;
      }
      diag?.recordSlot(slot);
    }

    diag?.stop();

    const diagnostics = diag
      ? diag.collect(enabledModules.length)
      : null;

    const status = this.computeStatus(slots);

    return {
      status,
      surface: context.surface,
      tenantId: context.tenantId,
      slots,
      tokens,
      diagnostics,
      startedAt: new Date(Date.now() - (diag?.elapsed ?? 0)).toISOString(),
      completedAt: new Date().toISOString(),
      totalDurationMs: diag?.elapsed ?? 0,
    };
  }

  async renderSurface(
    surface: SurfaceId,
    tenantId: string,
    options?: Partial<RenderOptions>
  ): Promise<RenderResult> {
    return this.render({
      context: { tenantId, surface },
      ...options,
    });
  }

  getModuleDefinitions(
    surface: SurfaceId,
    moduleIds?: ModuleId[]
  ): Array<{ moduleId: ModuleId; definition: RegistryEntry["definition"] }> {
    const modules = this.resolveEnabledModules(surface, moduleIds);
    return modules.map((m) => ({
      moduleId: m.definition.identity.id,
      definition: m.definition,
    }));
  }

  getSurfaceCapabilities(
    surface: SurfaceId
  ): SurfaceDefinition | null {
    return surfaceRegistry.get(surface);
  }

  private resolveThemeForRender(): Theme | null {
    try {
      return themeRegistry.getDefault();
    } catch {
      return null;
    }
  }

  private validateSurface(
    surface: SurfaceId,
    diag: RenderDiagnosticsCollector | null
  ): SurfaceDefinition {
    const def = surfaceRegistry.get(surface);
    if (!def) {
      const msg = `Surface "${surface}" is not registered`;
      diag?.recordError(msg);
      throw new Error(msg);
    }
    return def;
  }

  private resolveEnabledModules(
    surface: SurfaceId,
    moduleIds?: ModuleId[],
    _includeHidden = false
  ): RegistryEntry[] {
    void _includeHidden;
    if (moduleIds && moduleIds.length > 0) {
      const entries: RegistryEntry[] = [];
      for (const id of moduleIds) {
        const entry = this.moduleRegistry.get(id);
        if (entry) entries.push(entry);
      }
      return entries;
    }

    return this.moduleRegistry.list({ surface });
  }

  private computeStatus(
    slots: RenderResult["slots"]
  ): RenderResult["status"] {
    if (slots.length === 0) return "complete";

    let hasFailed = false;
    let hasLoaded = false;

    for (const slot of slots) {
      if (slot.state === "failed" || slot.state === "timeout") hasFailed = true;
      if (slot.state === "loaded") hasLoaded = true;
    }

    if (hasFailed && hasLoaded) return "partial";
    if (hasFailed && !hasLoaded) return "failed";
    return "complete";
  }
}

import { registryFacade } from "@/lib/registry/facade";
export const renderingEngine = new RenderingEngine(registryFacade.module);
