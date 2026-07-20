import type { ResolutionMiddleware } from "./types";
import type { ConfigLayer } from "../types";
import { configEngine } from "../engine";
import { themeRegistry } from "@/lib/theme/registry";
import { resolveTokenValue } from "@/lib/theme/validate";

function createLayerMiddleware(
  name: string,
  layer: ConfigLayer,
  priority: number
): ResolutionMiddleware {
  return {
    meta: { name, priority, layer, enabled: true },
    async handler(ctx) {
      const entries = await configEngine.store.list(ctx.tenantId);

      for (const entry of entries) {
        if (entry.layer !== layer) continue;
        if (!ctx.keys.includes(entry.key)) continue;
        if (ctx.locked.includes(entry.key)) continue;

        ctx.values[entry.key] = entry.value;
        ctx.sources[entry.key] = layer;

        if (entry.locked) {
          ctx.locked.push(entry.key);
        }
      }

      return ctx;
    },
  };
}

export function createPlatformResolutionMiddleware(): ResolutionMiddleware {
  return createLayerMiddleware("platform-resolution", "platform", 10);
}

export function createThemeResolutionMiddleware(): ResolutionMiddleware {
  return {
    meta: { name: "theme-resolution", priority: 20, layer: "theme", enabled: true },
    async handler(ctx) {
      try {
        const theme = themeRegistry.getDefault();
        if (theme) {
          for (const key of ctx.keys) {
            if (key.startsWith("theme.") || key.startsWith("color.") || key.startsWith("typography.")) {
              const tokenValue = theme.tokens[key];
              if (tokenValue && !ctx.locked.includes(key)) {
                ctx.values[key] = resolveTokenValue(tokenValue);
                ctx.sources[key] = "theme";
              }
            }
          }
        }
      } catch {
        // Theme resolution failure is non-fatal
      }
      return ctx;
    },
  };
}

export function createAgencyResolutionMiddleware(): ResolutionMiddleware {
  return createLayerMiddleware("agency-resolution", "agency", 30);
}

export function createCreatorResolutionMiddleware(): ResolutionMiddleware {
  return createLayerMiddleware("creator-resolution", "creator", 40);
}

export function createModuleResolutionMiddleware(): ResolutionMiddleware {
  return createLayerMiddleware("module-resolution", "module", 50);
}

export function createRuntimeResolutionMiddleware(): ResolutionMiddleware {
  return {
    meta: { name: "runtime-resolution", priority: 60, layer: "runtime", enabled: true },
    async handler(ctx) {
      if (ctx.metadata.device) {
        ctx.values["runtime.device"] = ctx.metadata.device;
        ctx.sources["runtime.device"] = "runtime";
      }
      if (ctx.metadata.darkMode !== undefined) {
        ctx.values["runtime.darkMode"] = ctx.metadata.darkMode;
        ctx.sources["runtime.darkMode"] = "runtime";
      }
      if (ctx.metadata.reducedMotion !== undefined) {
        ctx.values["runtime.reducedMotion"] = ctx.metadata.reducedMotion;
        ctx.sources["runtime.reducedMotion"] = "runtime";
      }
      if (ctx.metadata.locale) {
        ctx.values["runtime.locale"] = ctx.metadata.locale;
        ctx.sources["runtime.locale"] = "runtime";
      }
      return ctx;
    },
  };
}

export function createFeatureFlagResolutionMiddleware(): ResolutionMiddleware {
  return {
    meta: { name: "feature-flag-resolution", priority: 70, layer: "runtime", enabled: true },
    async handler(ctx) {
      const flagEntries = await configEngine.store.list(ctx.tenantId, "flag:");
      for (const entry of flagEntries) {
        if (ctx.locked.includes(entry.key)) continue;
        ctx.values[entry.key] = entry.value;
        ctx.sources[entry.key] = "runtime";
      }
      return ctx;
    },
  };
}

export function createSecretsResolutionMiddleware(): ResolutionMiddleware {
  return {
    meta: { name: "secrets-resolution", priority: 80, layer: "runtime", enabled: true },
    async handler(ctx) {
      const secretEntries = await configEngine.store.list(ctx.tenantId, "secret:");
      for (const entry of secretEntries) {
        if (ctx.locked.includes(entry.key)) continue;
        ctx.values[entry.key] = "[REDACTED]";
        ctx.sources[entry.key] = "runtime";
      }
      return ctx;
    },
  };
}

export function createEnvironmentResolutionMiddleware(): ResolutionMiddleware {
  return {
    meta: { name: "environment-resolution", priority: 90, layer: "runtime", enabled: true },
    async handler(ctx) {
      const envEntries = await configEngine.store.list(ctx.tenantId, "env:");
      for (const entry of envEntries) {
        if (ctx.locked.includes(entry.key)) continue;
        ctx.values[entry.key] = entry.value;
        ctx.sources[entry.key] = "runtime";
      }
      return ctx;
    },
  };
}

export function createDefaultResolutionMiddleware(): ResolutionMiddleware[] {
  return [
    createPlatformResolutionMiddleware(),
    createThemeResolutionMiddleware(),
    createAgencyResolutionMiddleware(),
    createCreatorResolutionMiddleware(),
    createModuleResolutionMiddleware(),
    createRuntimeResolutionMiddleware(),
    createFeatureFlagResolutionMiddleware(),
    createSecretsResolutionMiddleware(),
    createEnvironmentResolutionMiddleware(),
  ];
}

export function registerDefaultResolutionMiddleware(
  pipeline: { register: (mw: ResolutionMiddleware) => void }
): void {
  for (const mw of createDefaultResolutionMiddleware()) {
    pipeline.register(mw);
  }
}
