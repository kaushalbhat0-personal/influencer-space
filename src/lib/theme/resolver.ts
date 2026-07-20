import type {
  DesignTokenMap,
  Theme,
  ThemeOverride,
  ThemeValidationError,
  ResolveOptions,
} from "./types";
import { isResponsiveTokenValue, resolveTokenValue } from "./validate";

export function resolveTokenMap(
  baseTokens: DesignTokenMap,
  overrides: ThemeOverride[],
  lockedTokens: string[] = []
): { tokens: DesignTokenMap; errors: ThemeValidationError[] } {
  const errors: ThemeValidationError[] = [];
  const resolved: DesignTokenMap = { ...baseTokens };
  const lockedSet = new Set(lockedTokens);

  for (const override of overrides) {
    for (const [path, value] of Object.entries(override.tokens)) {
      if (lockedSet.has(path)) {
        errors.push({
          path,
          message: `Cannot override locked token "${path}" from layer "${override.layer}"`,
          layer: override.layer,
        });
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      const existing = resolved[path];
      const existingResolved = existing
        ? resolveTokenValue(existing)
        : undefined;

      if (
        typeof value === "string" &&
        value === existingResolved
      ) {
        continue;
      }

      if (isResponsiveTokenValue(value)) {
        const existingObj =
          existing && isResponsiveTokenValue(existing)
            ? { ...existing }
            : { default: existingResolved ?? "" };

        resolved[path] = {
          ...existingObj,
          ...value,
        };
        continue;
      }

      if (typeof value === "string") {
        if (existing && isResponsiveTokenValue(existing)) {
          resolved[path] = {
            ...existing,
            default: value,
          };
        } else {
          resolved[path] = value;
        }
      }
    }
  }

  return { tokens: resolved, errors };
}

export function resolveTheme(options: ResolveOptions): {
  tokens: DesignTokenMap;
  errors: ThemeValidationError[];
} {
  const { baseTheme, overrides } = options;

  const sortedOverrides = [...overrides].sort((a, b) => {
    const order: Record<string, number> = {
      platform: 0,
      theme: 1,
      agency: 2,
      creator: 3,
      module: 4,
      runtime: 5,
    };
    return (order[a.layer] ?? 99) - (order[b.layer] ?? 99);
  });

  const allLockedTokens = [
    ...baseTheme.inheritance.lockedTokens,
  ];

  for (const override of sortedOverrides) {
    if (override.layer === "agency" || override.layer === "creator") {
      const lockedByTheme = baseTheme.inheritance.lockedTokens.filter(
        (t) => !baseTheme.inheritance.overridableTokens.includes(t)
      );
      allLockedTokens.push(...lockedByTheme);
    }
  }

  return resolveTokenMap(
    baseTheme.tokens,
    sortedOverrides,
    Array.from(new Set(allLockedTokens))
  );
}

export function resolveSurfaceTokens(
  tokens: DesignTokenMap,
  theme: Theme,
  surface: string
): DesignTokenMap {
  const surfaceOverrides = theme.surfaceOverrides[surface as keyof typeof theme.surfaceOverrides];
  if (!surfaceOverrides) return tokens;

  const resolved: DesignTokenMap = { ...tokens };
  for (const [path, value] of Object.entries(surfaceOverrides)) {
    resolved[path] = value as DesignTokenMap[string];
  }

  return resolved;
}

export function applyRuntimeContext(
  tokens: DesignTokenMap,
  runtime: {
    device?: "mobile" | "tablet" | "desktop";
    darkMode?: boolean;
    reducedMotion?: boolean;
    highContrast?: boolean;
  } = {}
): DesignTokenMap {
  const resolved: DesignTokenMap = { ...tokens };

  if (runtime.reducedMotion) {
    const motionTokens = Object.keys(resolved).filter((p) =>
      p.startsWith("animation.")
    );
    for (const path of motionTokens) {
      if (path.includes("duration.")) {
        resolved[path] = "0ms";
      }
    }
  }

  if (runtime.highContrast) {
    resolved["color.text.primary"] = "#ffffff";
    resolved["color.text.secondary"] = "#e5e5e5";
    resolved["color.surface.primary"] = "#000000";
    resolved["color.surface.secondary"] = "#0a0a0a";
    resolved["color.border.default"] = "rgba(255,255,255,0.2)";
  }

  if (runtime.darkMode) {
    for (const [path, value] of Object.entries(resolved)) {
      if (isResponsiveTokenValue(value) && value.dark) {
        resolved[path] = { ...value, default: value.dark };
      }
    }
  }

  return resolved;
}

export function deepMergeTokens(
  ...tokenMaps: Partial<DesignTokenMap>[]
): DesignTokenMap {
  const result: DesignTokenMap = {};

  for (const map of tokenMaps) {
    for (const [path, value] of Object.entries(map)) {
      if (value === undefined || value === null) continue;

      const existing = result[path];
      if (
        existing &&
        isResponsiveTokenValue(existing) &&
        isResponsiveTokenValue(value)
      ) {
        result[path] = { ...existing, ...value };
      } else {
        result[path] = value;
      }
    }
  }

  return result;
}
