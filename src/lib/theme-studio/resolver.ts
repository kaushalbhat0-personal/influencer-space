import { themeRegistry } from "./registry";
import { DEFAULT_TOKENS } from "./tokens";
import type { DesignTokens } from "./tokens";

/**
 * TokenResolver — resolves design token references to concrete values.
 * Components call resolve(tokenPath) instead of reading hardcoded CSS values.
 *
 * Example:
 *   resolver.resolve("colors.primary") → "#6366f1"
 *   resolver.resolve("spacing.md") → "16px"
 */
export class TokenResolver {
  private tokens: DesignTokens = DEFAULT_TOKENS;

  async load(tenantId: string): Promise<void> {
    const active = await themeRegistry.getActive(tenantId);
    if (active) {
      this.tokens = active.tokens;
    }
  }

  /** Resolve a dot-notation token path to its value. */
  resolve(path: string): string {
    const parts = path.split(".");
    let current: unknown = this.tokens;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return path; // Return the path itself as fallback
      }
    }
    return String(current ?? path);
  }

  /** Resolve a CSS variable reference like --color-primary → actual value. */
  resolveVar(varName: string): string {
    const path = varName
      .replace(/^--/, "")
      .replace(/-/g, ".");
    return this.resolve(path);
  }

  /** Get all tokens as CSS custom properties string. */
  toCss(): string {
    const vars: string[] = [];
    for (const [category, values] of Object.entries(this.tokens)) {
      for (const [key, value] of Object.entries(values)) {
        vars.push(`--${category}-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${value};`);
      }
    }
    return vars.join("\n");
  }

  /** Get all tokens as a flat CSS custom properties object. */
  toStyle(): Record<string, string> {
    const style: Record<string, string> = {};
    const entries = Object.entries(this.tokens) as [string, Record<string, string>][];
    for (const [category, values] of entries) {
      for (const [key, value] of Object.entries(values)) {
        style[`--${category}-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`] = value;
      }
    }
    return style;
  }
}

export const tokenResolver = new TokenResolver();
