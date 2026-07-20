import type { ResolvedTheme, ThemeToken, ThemeTokenGroup, ThemeQuery } from "./types";
import { themeRegistry } from "./registry";
import { themeResolver } from "./resolver";

export class ThemeQueryService {
  getResolved(): ResolvedTheme {
    return themeResolver.resolve();
  }

  getResolvedValue(key: string): string | null {
    return themeResolver.resolveSingle(key);
  }

  getToken(key: string): ThemeToken | null {
    return themeRegistry.getToken(key);
  }

  listTokens(query?: ThemeQuery): ThemeToken[] {
    return themeRegistry.listTokens(query);
  }

  searchTokens(query: string): ThemeToken[] {
    return themeRegistry.listTokens({ search: query });
  }

  listGroups(category?: string): ThemeTokenGroup[] {
    return themeRegistry.listGroups(category as Parameters<typeof themeRegistry.listGroups>[0]);
  }

  getTokenCount(): number { return themeRegistry.size; }

  getGroupCount(): number { return themeRegistry.groupCount; }
}

export const themeQuery = new ThemeQueryService();
