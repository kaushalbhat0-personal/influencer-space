import type { DesignTokenMap, NestedTokenMap, ResolvedTheme, Theme, SurfaceId } from "./types";
import { isResponsiveTokenValue, resolveTokenValue } from "./validate";

export function compileTokensToNestedObject(
  tokens: DesignTokenMap
): NestedTokenMap {
  const result: NestedTokenMap = {};

  for (const [path, value] of Object.entries(tokens)) {
    const parts = path.split(".");
    const resolvedValue = resolveTokenValue(value);

    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!(part in current)) {
        current[part] = {};
      }
      const next = current[part];
      if (typeof next === "string") {
        current[part] = { _value: next };
      }
      current = current[part] as NestedTokenMap;
    }

    const lastPart = parts[parts.length - 1]!;
    current[lastPart] = resolvedValue;
  }

  return result;
}

export function compileTokensToCssVariables(
  tokens: DesignTokenMap,
  surface?: SurfaceId,
  runtime?: {
    device?: "mobile" | "tablet" | "desktop";
    darkMode?: boolean;
    reducedMotion?: boolean;
    highContrast?: boolean;
  }
): string {
  const variables: string[] = [];

  for (const [path, value] of Object.entries(tokens)) {
    const cssVarName = `--${path.replace(/\./g, "-")}`;

    if (typeof value === "string") {
      variables.push(`${cssVarName}: ${value};`);
      continue;
    }

    if (isResponsiveTokenValue(value)) {
      variables.push(`${cssVarName}: ${value.default};`);

      if (value.sm) {
        variables.push(
          `@media (min-width: 640px) { :root { ${cssVarName}: ${value.sm}; } }`
        );
      }
      if (value.md) {
        variables.push(
          `@media (min-width: 768px) { :root { ${cssVarName}: ${value.md}; } }`
        );
      }
      if (value.lg) {
        variables.push(
          `@media (min-width: 1024px) { :root { ${cssVarName}: ${value.lg}; } }`
        );
      }
      if (value.xl) {
        variables.push(
          `@media (min-width: 1280px) { :root { ${cssVarName}: ${value.xl}; } }`
        );
      }
      if (value["2xl"]) {
        variables.push(
          `@media (min-width: 1536px) { :root { ${cssVarName}: ${value["2xl"]}; } }`
        );
      }

      if (value.dark) {
        variables.push(
          `[data-theme="dark"] { ${cssVarName}: ${value.dark}; }`
        );
        variables.push(
          `@media (prefers-color-scheme: dark) { :root { ${cssVarName}: ${value.dark}; } }`
        );
      }
    }
  }

  if (runtime?.darkMode) {
    for (const [path, value] of Object.entries(tokens)) {
      if (isResponsiveTokenValue(value) && value.dark) {
        const cssVarName = `--${path.replace(/\./g, "-")}`;
        variables.push(`:root { ${cssVarName}: ${value.dark}; }`);
      }
    }
  }

  if (runtime?.reducedMotion) {
    variables.push(`--animation-duration-instant: 0ms;`);
    variables.push(`--animation-duration-fast: 0ms;`);
    variables.push(`--animation-duration-normal: 0ms;`);
    variables.push(`--animation-duration-slow: 0ms;`);
  }

  if (runtime?.highContrast) {
    const textPrimary = tokens["color.text.primary"];
    const textValue = resolveTokenValue(textPrimary ?? "#ffffff");
    if (textValue === "#ffffff" || textValue.includes("255,255,255")) {
      variables.push(`--color-text-primary: #ffffff;`);
      variables.push(`--color-surface-primary: #000000;`);
    }
  }

  return variables.join("\n");
}

export function compileTokensToTailwindConfig(
  tokens: DesignTokenMap
): Record<string, unknown> {
  const colors: Record<string, string> = {};

  for (const [path, value] of Object.entries(tokens)) {
    if (!path.startsWith("color.")) continue;

    const colorName = path
      .replace("color.", "")
      .replace(/\./g, "-");

    const resolvedValue = resolveTokenValue(value);
    const cssVarName = `--${path.replace(/\./g, "-")}`;
    colors[colorName] = `var(${cssVarName}, ${resolvedValue})`;
  }

  const spacing: Record<string, string> = {};
  for (const [path, value] of Object.entries(tokens)) {
    if (!path.startsWith("spacing.")) continue;
    const spacingName = path.replace("spacing.", "").replace(/\./g, "-");
    const cssVarName = `--${path.replace(/\./g, "-")}`;
    spacing[spacingName] = `var(${cssVarName}, ${resolveTokenValue(value)})`;
  }

  const borderRadius: Record<string, string> = {};
  for (const [path, value] of Object.entries(tokens)) {
    if (!path.startsWith("radius.")) continue;
    const radiusName = path.replace("radius.", "");
    const cssVarName = `--${path.replace(/\./g, "-")}`;
    borderRadius[radiusName] = `var(${cssVarName}, ${resolveTokenValue(value)})`;
  }

  const fontFamily: Record<string, string[]> = {};
  for (const [path, value] of Object.entries(tokens)) {
    if (!path.startsWith("typography.family.")) continue;
    const familyName = path.replace("typography.family.", "");
    const cssVarName = `--${path.replace(/\./g, "-")}`;
    fontFamily[familyName] = [
      `var(${cssVarName}, ${resolveTokenValue(value)})`,
    ];
  }

  const fontSize: Record<string, [string, { lineHeight: string }]> = {};
  for (const [path, value] of Object.entries(tokens)) {
    if (!path.startsWith("typography.scale.")) continue;
    const scaleName = path.replace("typography.scale.", "");
    const cssVarName = `--${path.replace(/\./g, "-")}`;
    const lineHeightPath = path.replace(/scale\.\w+$/, `lineHeight.normal`);
    const lineHeightValue = resolveTokenValue(tokens[lineHeightPath] ?? "1.5");
    fontSize[scaleName] = [
      `var(${cssVarName}, ${resolveTokenValue(value)})`,
      { lineHeight: lineHeightValue },
    ];
  }

  const boxShadow: Record<string, string> = {};
  for (const [path, value] of Object.entries(tokens)) {
    if (!path.startsWith("elevation.")) continue;
    const shadowName = path.replace("elevation.", "");
    const cssVarName = `--${path.replace(/\./g, "-")}`;
    boxShadow[shadowName] = `var(${cssVarName}, ${resolveTokenValue(value)})`;
  }

  const animation: Record<string, string> = {};
  const keyframes: Record<string, Record<string, Record<string, string>>> = {};

  for (const [path, value] of Object.entries(tokens)) {
    if (!path.startsWith("animation.duration.") && !path.startsWith("animation.easing.")) continue;
    const animName = path.replace("animation.", "").replace(/\./g, "-");
    const cssVarName = `--${path.replace(/\./g, "-")}`;
    if (path.startsWith("animation.duration.")) {
      animation[animName] = `var(${cssVarName}, ${resolveTokenValue(value)})`;
    }
  }

  const screens: Record<string, string> = {};
  for (const [path, value] of Object.entries(tokens)) {
    if (!path.startsWith("breakpoint.")) continue;
    const bpName = path.replace("breakpoint.", "");
    screens[bpName] = resolveTokenValue(value);
  }

  return {
    theme: {
      extend: {
        colors: {
          ...colors,
          brand: colors,
        },
        spacing,
        borderRadius,
        fontFamily,
        fontSize,
        boxShadow,
        animation,
        keyframes,
        screens,
      },
    },
  };
}

export function compileTokensToRuntimeObject(
  tokens: DesignTokenMap
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [path, value] of Object.entries(tokens)) {
    result[path] = resolveTokenValue(value);
  }

  return result;
}

export function compileThemeToResolvedTheme(
  theme: Theme,
  tokens: DesignTokenMap,
  surface: SurfaceId = "website",
  runtime?: ResolvedTheme["surface"] extends SurfaceId
    ? Record<string, unknown>
    : undefined
): ResolvedTheme {
  const surfaceTokens = theme.surfaceOverrides[surface] ?? {};
  const mergedTokens: DesignTokenMap = { ...tokens, ...surfaceTokens };

  const cssVariables = compileTokensToCssVariables(
    mergedTokens,
    surface,
    runtime as { device?: "mobile" | "tablet" | "desktop"; darkMode?: boolean; reducedMotion?: boolean; highContrast?: boolean } | undefined
  );

  const tailwindConfig = compileTokensToTailwindConfig(mergedTokens);

  return {
    identity: theme.identity,
    tokens: mergedTokens,
    nestedTokens: compileTokensToNestedObject(mergedTokens),
    cssVariables,
    tailwindConfig,
    fonts: theme.fonts,
    animations: theme.animations,
    layouts: theme.layouts,
    surface,
  };
}
