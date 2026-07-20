import type { SerializedTheme, ThemeDefinition, ThemeToken, ThemeTokenGroup, TokenCategory } from "./types";
import { themeRegistry } from "./registry";

export class ThemeSerializer {
  serialize(): SerializedTheme {
    const tokens: SerializedTheme["tokens"] = {};
    const allTokens = themeRegistry.getAllTokens();
    for (const [key, token] of Array.from(allTokens.entries())) {
      tokens[key] = { value: token.value, category: token.category, group: token.group };
    }
    return {
      version: "1.0.0",
      themeId: themeRegistry.themeId,
      name: themeRegistry.themeName,
      exportedAt: new Date().toISOString(),
      tokens,
      metadata: {},
    };
  }

  deserialize(data: SerializedTheme): ThemeDefinition | null {
    const groups = new Map<string, { tokens: Array<{ key: string; value: string; category: string; group?: string }> }>();
    for (const [key, token] of Object.entries(data.tokens)) {
      const gid = token.group ?? "custom";
      if (!groups.has(gid)) groups.set(gid, { tokens: [] });
      groups.get(gid)!.tokens.push({ key, value: token.value, category: token.category, group: token.group });
    }
    return {
      id: data.themeId, name: data.name, version: data.version,
      description: "", author: "", groups: Array.from(groups.entries()).map(([id, g]) => ({
        id, label: id, category: (g.tokens[0]?.category ?? "custom") as TokenCategory,
        tokens: g.tokens.map((t): ThemeToken => ({ key: t.key, value: t.value, category: t.category as TokenCategory, group: t.group, editable: true, source: "theme" })),
      })) as ThemeTokenGroup[],
      metadata: data.metadata ?? {},
    };
  }

  static readonly VERSION = "1.0.0";
}

export const themeSerializer = new ThemeSerializer();
