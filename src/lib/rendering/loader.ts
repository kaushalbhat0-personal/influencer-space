import type { ModuleId, ModuleDefinition } from "@/lib/module/types";
import type { ModuleRenderSlot, DataLoadOptions, ModuleDataLoaderFn } from "./types";

const DEFAULT_TIMEOUT = 15000;

export class DataLoader {
  async loadAll(
    modules: Array<{ moduleId: ModuleId; definition: ModuleDefinition }>,
    tenantId: string,
    options: DataLoadOptions = {}
  ): Promise<ModuleRenderSlot[]> {
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;

    const tasks = modules.map((mod) =>
      this.loadSingle(mod.moduleId, mod.definition, tenantId, timeout, options.onProgress)
    );

    if (tasks.length === 0) return [];

    const results = await Promise.allSettled(tasks);

    return results.map((result, index) => {
      const mod = modules[index]!;
      if (result.status === "fulfilled") {
        return result.value;
      }
      return {
        moduleId: mod.moduleId,
        definition: mod.definition,
        state: "failed" as const,
        order: 0,
        visible: true,
        data: null,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        loadDurationMs: null,
        renderDurationMs: null,
      };
    });
  }

  private async loadSingle(
    moduleId: ModuleId,
    definition: ModuleDefinition,
    tenantId: string,
    timeout: number,
    onProgress?: (moduleId: ModuleId, state: "loading") => void
  ): Promise<ModuleRenderSlot> {
    const startedAt = performance.now();

    onProgress?.(moduleId, "loading");

    try {
      const loaderPath = definition.surfaces.dataLoaderPath;
      let data: unknown = null;

      if (loaderPath) {
        try {
          const loader = await this.resolveLoader(loaderPath);
          if (loader) {
            data = await Promise.race([
              loader(tenantId, definition.configuration.defaults, {}),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Data load timeout: ${moduleId}`)), timeout)
              ),
            ]);
          }
        } catch (loadErr) {
          return {
            moduleId,
            definition,
            state: "failed",
            order: 0,
            visible: true,
            data: null,
            error: loadErr instanceof Error ? loadErr.message : String(loadErr),
            loadDurationMs: null,
            renderDurationMs: null,
          };
        }
      }

      const duration = Math.round((performance.now() - startedAt) * 100) / 100;

      return {
        moduleId,
        definition,
        state: "loaded",
        order: 0,
        visible: true,
        data,
        error: null,
        loadDurationMs: duration,
        renderDurationMs: null,
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return {
          moduleId,
          definition,
          state: "timeout",
          order: 0,
          visible: true,
          data: null,
          error: `Data load aborted: ${moduleId}`,
          loadDurationMs: null,
          renderDurationMs: null,
        };
      }

      return {
        moduleId,
        definition,
        state: "failed",
        order: 0,
        visible: true,
        data: null,
        error: err instanceof Error ? err.message : String(err),
        loadDurationMs: null,
        renderDurationMs: null,
      };
    }
  }

  private async resolveLoader(
    loaderPath: string
  ): Promise<ModuleDataLoaderFn | null> {
    if (!loaderPath) return null;

    try {
      const segments = loaderPath.split("#");
      const modulePath = segments[0]!;
      const exportName = segments[1] ?? "moduleDataLoader";

      const mod = await import(modulePath);
      const loader = mod[exportName];

      if (typeof loader !== "function") {
        console.warn(`[DataLoader] Loader "${loaderPath}" is not a function`);
        return null;
      }

      return loader as ModuleDataLoaderFn;
    } catch (err) {
      console.warn(`[DataLoader] Failed to resolve loader "${loaderPath}":`, err);
      return null;
    }
  }
}
