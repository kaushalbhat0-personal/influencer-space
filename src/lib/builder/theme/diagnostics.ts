import type { ThemeDiagnostics } from "./types";
import { themeRegistry } from "./registry";
import { themeResolver } from "./resolver";

const REF_PATTERN = /\{([^}]+)\}/g;

export class ThemeDiagnosticsEngine {
  run(): ThemeDiagnostics {
    const tokens = themeRegistry.getAllTokens();
    const missing: string[] = [];
    const duplicates: string[] = [];
    const invalidRefs: { key: string; reference: string }[] = [];
    const unused: string[] = [];

    const keyCount = new Map<string, number>();
    for (const [key] of Array.from(tokens.entries())) keyCount.set(key, (keyCount.get(key) ?? 0) + 1);
    for (const [key, count] of Array.from(keyCount.entries())) { if (count > 1) duplicates.push(key); }

    for (const [, token] of Array.from(tokens.entries())) {
      const regex = new RegExp(REF_PATTERN.source, "g");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(token.value)) !== null) {
        const ref = match[1]!;
        if (!tokens.has(ref)) invalidRefs.push({ key: token.key, reference: ref });
      }
      if (token.value === "" || token.value === undefined) missing.push(token.key);
    }

    const allKeys = new Set(tokens.keys());
    for (const [, token] of Array.from(tokens.entries())) {
      const regex = new RegExp(REF_PATTERN.source, "g");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(token.value)) !== null) {
        if (allKeys.has(match[1]!)) unused.push(match[1]!);
      }
    }

    const cycles = themeResolver.detectCircularReferences();

    return {
      totalTokens: tokens.size,
      totalGroups: themeRegistry.groupCount,
      missingTokens: missing,
      duplicateTokens: duplicates,
      circularReferences: cycles,
      invalidReferences: invalidRefs,
      unusedTokens: unused,
    };
  }
}

export const themeDiagnostics = new ThemeDiagnosticsEngine();
