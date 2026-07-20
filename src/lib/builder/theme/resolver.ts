import type { ResolvedTheme } from "./types";
import { themeRegistry } from "./registry";

const REFERENCE_PATTERN = /\{([^}]+)\}/g;

export class ThemeResolver {
  resolve(): ResolvedTheme {
    const result: ResolvedTheme = {};
    const tokens = themeRegistry.getAllTokens();

    for (const [key, token] of Array.from(tokens.entries())) {
      result[key] = this.resolveValue(token.value, tokens, new Set(), []);
    }

    return result;
  }

  resolveValue(
    value: string,
    tokens: Map<string, { value: string }>,
    visited: Set<string>,
    path: string[]
  ): string {
    let resolved = value;
    let match: RegExpExecArray | null;
    void (path.length); // used for debugging

    const regex = new RegExp(REFERENCE_PATTERN.source, "g");
    while ((match = regex.exec(value)) !== null) {
      const refKey = match[1]!;
      if (visited.has(refKey)) {
        console.warn(`[ThemeResolver] Circular reference detected: ${path.join(" → ")} → ${refKey}`);
        continue;
      }
      const refToken = tokens.get(refKey);
      if (refToken) {
        visited.add(refKey);
        const refValue = this.resolveValue(refToken.value, tokens, new Set(visited), [...path, refKey]);
        resolved = resolved.replaceAll(`{${refKey}}`, refValue);
        visited.delete(refKey);
      }
    }

    return resolved;
  }

  resolveSingle(key: string): string | null {
    const token = themeRegistry.getToken(key);
    if (!token) return null;
    const tokens = themeRegistry.getAllTokens();
    return this.resolveValue(token.value, tokens, new Set(), [key]);
  }

  detectCircularReferences(): string[][] {
    const tokens = themeRegistry.getAllTokens();
    const cycles: string[][] = [];

    for (const [key, token] of Array.from(tokens.entries())) {
      this.checkCircular(key, token, tokens, new Set(), [key], cycles);
    }

    return cycles;
  }

  private checkCircular(
    key: string,
    token: { value: string },
    tokens: Map<string, { value: string }>,
    visited: Set<string>,
    path: string[],
    cycles: string[][]
  ): void {
    if (visited.has(key)) {
      cycles.push([...path]);
      return;
    }
    visited.add(key);
    const regex = new RegExp(REFERENCE_PATTERN.source, "g");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(token.value)) !== null) {
      const refKey = match[1]!;
      const refToken = tokens.get(refKey);
      if (refToken) this.checkCircular(refKey, refToken, tokens, new Set(visited), [...path, refKey], cycles);
    }
  }
}

export const themeResolver = new ThemeResolver();
