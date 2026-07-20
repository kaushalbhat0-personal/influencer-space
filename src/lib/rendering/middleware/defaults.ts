import type { RenderMiddleware } from "./types";
import type { RenderResult } from "../types";
import type { ModuleId } from "@/lib/module/types";
import { LayoutResolver } from "../layout";
import { DataLoader } from "../loader";
import { RenderDiagnosticsCollector } from "../diagnostics";
import { themeRegistry } from "@/lib/theme/registry";
import { surfaceRegistry } from "@/lib/module/surface-registry";
import { registryFacade } from "@/lib/registry/facade";

const DEFAULT_TIMEOUT = 30000;

export function createThemeResolutionMiddleware(): RenderMiddleware {
  return {
    meta: { name: "theme-resolution", priority: 10, phase: "before", enabled: true },
    async handler(ctx) {
      try {
        const theme = themeRegistry.getDefault();
        if (theme) {
          ctx.metadata.theme = theme;
          ctx.metadata.tokens = theme.tokens;
        }
      } catch {
        // Theme resolution failure is non-fatal
        ctx.metadata.theme = null;
        ctx.metadata.tokens = {};
      }
      return ctx;
    },
  };
}

export function createSurfaceValidationMiddleware(): RenderMiddleware {
  return {
    meta: { name: "surface-validation", priority: 20, phase: "before", enabled: true },
    async handler(ctx) {
      const surface = ctx.options.context.surface;
      const def = surfaceRegistry.get(surface);
      if (!def) {
        throw new Error(`Surface "${surface}" is not registered`);
      }
      ctx.metadata.surfaceDefinition = def;
      return ctx;
    },
  };
}

export function createModuleResolutionMiddleware(): RenderMiddleware {
  return {
    meta: { name: "module-resolution", priority: 30, phase: "before", enabled: true },
    async handler(ctx) {
      const surface = ctx.options.context.surface;
      const moduleIds = ctx.options.modules;

      if (moduleIds && moduleIds.length > 0) {
        const entries: Array<{ moduleId: ModuleId; definition: unknown }> = [];
        for (const id of moduleIds) {
          const entry = registryFacade.module.get(id);
          if (entry) entries.push({ moduleId: id, definition: entry.definition });
        }
        ctx.metadata.enabledModules = entries;
      } else {
        const entries = registryFacade.module.list({ surface });
        ctx.metadata.enabledModules = entries.map((e) => ({
          moduleId: e.definition.identity.id,
          definition: e.definition,
        }));
      }
      return ctx;
    },
  };
}

export function createLayoutResolutionMiddleware(): RenderMiddleware {
  const layoutResolver = new LayoutResolver();

  return {
    meta: { name: "layout-resolution", priority: 40, phase: "before", enabled: true },
    async handler(ctx) {
      const modules = (ctx.metadata.enabledModules as Array<{ moduleId: ModuleId; definition: unknown }> | undefined) ?? [];
      const regEntries = modules.map((m) => ({
        definition: m.definition,
        state: "enabled" as const,
        registeredAt: new Date(),
        installedAt: null,
        enabledAt: null,
        source: "platform" as const,
        metadata: {},
      }));

      let layout: Parameters<typeof layoutResolver.resolve>[1] | undefined;
      if (ctx.options.layout) {
        try {
          layout = JSON.parse(ctx.options.layout) as Parameters<typeof layoutResolver.resolve>[1];
        } catch {
          // Invalid layout JSON — use default
        }
      }

      const resolved = layoutResolver.resolve(regEntries as Parameters<typeof layoutResolver.resolve>[0], layout);
      ctx.metadata.resolvedLayout = resolved;
      return ctx;
    },
  };
}

export function createDataLoadingMiddleware(): RenderMiddleware {
  const loader = new DataLoader();

  return {
    meta: { name: "data-loading", priority: 50, phase: "before", enabled: true },
    async handler(ctx) {
      const modules = (ctx.metadata.enabledModules as Array<{ moduleId: ModuleId; definition: { surfaces: { supported: unknown[] } } }> | undefined) ?? [];
      const layout = ctx.metadata.resolvedLayout as { modules: Array<{ moduleId: ModuleId; order: number; visible: boolean }> } | undefined;

      const visible = layout
        ? layout.modules.filter((m) => m.visible)
        : modules.map((m) => ({ moduleId: m.moduleId, order: 0, visible: true }));

      const loadTargets = visible.map((m) => {
        const mod = modules.find((x) => x.moduleId === m.moduleId)!;
        return {
          moduleId: m.moduleId,
          definition: mod.definition as Parameters<typeof loader.loadAll>[0][number]["definition"],
        };
      });

      const timeout = ctx.options.timeout ?? DEFAULT_TIMEOUT;
      const slots = await loader.loadAll(loadTargets, ctx.options.context.tenantId, {
        timeout,
        abortSignal: ctx.options.abortSignal,
      });

      for (const slot of slots) {
        const layoutEntry = visible.find((m) => m.moduleId === slot.moduleId);
        if (layoutEntry) {
          slot.order = layoutEntry.order;
          slot.visible = layoutEntry.visible;
        }
      }

      ctx.metadata.slots = slots;
      return ctx;
    },
  };
}

export function createDiagnosticsMiddleware(): RenderMiddleware {
  return {
    meta: { name: "diagnostics", priority: 60, phase: "after", enabled: true },
    async handler(ctx) {
      if (!ctx.options.collectDiagnostics || !ctx.result) return ctx;

      const diag = new RenderDiagnosticsCollector();
      const slots = ctx.metadata.slots as NonNullable<RenderResult["slots"]> | undefined;
      if (slots) {
        for (const slot of slots) {
          diag.recordSlot(slot);
        }
      }
      diag.stop();

      const modules = (ctx.metadata.enabledModules as Array<{ moduleId: ModuleId }> | undefined) ?? [];
      ctx.result = {
        ...ctx.result,
        diagnostics: diag.collect(modules.length),
      };

      return ctx;
    },
  };
}

export function createDefaultMiddleware(): RenderMiddleware[] {
  return [
    createThemeResolutionMiddleware(),
    createSurfaceValidationMiddleware(),
    createModuleResolutionMiddleware(),
    createLayoutResolutionMiddleware(),
    createDataLoadingMiddleware(),
    createDiagnosticsMiddleware(),
  ];
}

export function registerDefaultMiddleware(pipeline: { register: (mw: RenderMiddleware) => void }): void {
  for (const mw of createDefaultMiddleware()) {
    pipeline.register(mw);
  }
}
