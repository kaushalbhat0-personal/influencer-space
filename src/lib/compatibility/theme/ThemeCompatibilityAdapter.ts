import { themeRegistry, themeQuery, themeTransaction } from "@/lib/builder/theme";
import type { ThemeDefinition } from "@/lib/builder/theme/types";

/**
 * Backward-compatible Theme Adapter.
 * Wraps the new platform.theme subsystem so legacy code continues working.
 *
 * @deprecated Legacy code should migrate to platform.theme.* directly.
 *   This adapter exists only for backward compatibility during migration.
 */
export class ThemeAdapter {
  private static instance: ThemeAdapter;
  private loaded = false;

  static getInstance(): ThemeAdapter {
    if (!this.instance) this.instance = new ThemeAdapter();
    return this.instance;
  }

  ensureLoaded(): void {
    if (this.loaded) return;
    if (themeRegistry.size === 0) {
      const defaultTheme: ThemeDefinition = {
        id: "com.creatos.neon-dark", name: "Neon Dark", version: "1.0.0",
        description: "Default dark theme", author: "CreatorOS",
        groups: [
          { id: "colors", label: "Colors", category: "color", tokens: [
            { key: "color.primary", value: "#2D1B69", category: "color", group: "colors", editable: true, source: "theme", description: "Primary brand color" },
            { key: "color.secondary", value: "#00f5ff", category: "color", group: "colors", editable: true, source: "theme", description: "Secondary accent color" },
            { key: "color.accent", value: "#ff00e5", category: "color", group: "colors", editable: true, source: "theme", description: "Accent highlight color" },
            { key: "color.surface.primary", value: "#09090b", category: "color", group: "colors", editable: true, source: "theme" },
            { key: "color.text.primary", value: "#ffffff", category: "color", group: "colors", editable: true, source: "theme" },
            { key: "color.border.default", value: "rgba(255,255,255,0.08)", category: "border", group: "colors", editable: true, source: "theme" },
          ]},
          { id: "typography", label: "Typography", category: "typography", tokens: [
            { key: "font.base", value: "Inter, system-ui, sans-serif", category: "typography", group: "typography", editable: true, source: "theme" },
            { key: "font.size", value: "16px", category: "typography", group: "typography", editable: true, source: "theme" },
          ]},
          { id: "spacing", label: "Spacing", category: "spacing", tokens: [
            { key: "radius.default", value: "8px", category: "radius", group: "spacing", editable: true, source: "theme" },
          ]},
        ],
        metadata: {},
      };
      themeRegistry.load(defaultTheme);
    }
    this.loaded = true;
  }

  /**
   * Provides backward-compatible getThemeConfig() return value
   * matching the old theme_config Setting JSON shape.
   */
  getThemeConfig(): Record<string, unknown> {
    this.ensureLoaded();
    const resolved = themeQuery.getResolved();
    return {
      primary: resolved["color.primary"] ?? "#2D1B69",
      secondary: resolved["color.secondary"] ?? "#00f5ff",
      accent: resolved["color.accent"] ?? "#ff00e5",
      font: resolved["font.base"] ?? "geist",
      borderRadius: resolved["radius.default"] ?? "8",
      layoutDensity: "comfortable",
    };
  }

  /**
   * Provides backward-compatible setThemeConfig() mutation
   * through the Theme Transaction system.
   */
  updateThemeConfig(updates: Record<string, string>): void {
    this.ensureLoaded();
    themeTransaction.begin();
    try {
      const keyMap: Record<string, string> = {
        primary: "color.primary",
        secondary: "color.secondary",
        accent: "color.accent",
        font: "font.base",
        borderRadius: "radius.default",
      };
      for (const [k, v] of Object.entries(updates)) {
        const tokenKey = keyMap[k] ?? k;
        if (themeRegistry.getToken(tokenKey)) {
          themeRegistry.setTokenValue(tokenKey, v);
        }
      }
      themeTransaction.commit();
    } catch {
      themeTransaction.rollback();
    }
  }

  /**
   * Returns CSS custom properties string for the resolved theme.
   */
  getCssVariables(): string {
    this.ensureLoaded();
    const resolved = themeQuery.getResolved();
    const vars: string[] = [];
    for (const [key, value] of Object.entries(resolved)) {
      const varName = `--${key.replace(/\./g, "-")}`;
      vars.push(`${varName}: ${value};`);
    }
    return vars.join("\n");
  }

  /**
   * Returns resolved theme colors in legacy format.
   */
  getColors(): { primary: string; secondary: string; accent: string; background: string; text: string } {
    this.ensureLoaded();
    const resolved = themeQuery.getResolved();
    return {
      primary: resolved["color.primary"] ?? "#2D1B69",
      secondary: resolved["color.secondary"] ?? "#00f5ff",
      accent: resolved["color.accent"] ?? "#ff00e5",
      background: resolved["color.surface.primary"] ?? "#09090b",
      text: resolved["color.text.primary"] ?? "#ffffff",
    };
  }
}

export const themeAdapter = ThemeAdapter.getInstance();
