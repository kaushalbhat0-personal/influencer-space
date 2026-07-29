import type { ThemeDefinition } from "../types-new";
import { ALL_THEMES } from "../themes";

const BUILT_IN_THEMES: ThemeDefinition[] = [...ALL_THEMES];

export class BuiltInThemeProvider {
  readonly type = "built-in";

  getAll(): ThemeDefinition[] { return BUILT_IN_THEMES.map((t) => ({ ...t })); }
  getById(id: string): ThemeDefinition | undefined { return BUILT_IN_THEMES.find((t) => t.id === id); }

  list(options?: { category?: string; premium?: boolean; search?: string }): ThemeDefinition[] {
    let results = [...BUILT_IN_THEMES];
    if (options?.category) results = results.filter((t) => t.category === options.category);
    if (options?.premium !== undefined) results = results.filter((t) => t.premium === options.premium);
    if (options?.search) {
      const q = options.search.toLowerCase();
      results = results.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    return results;
  }
}

export const builtInThemeProvider = new BuiltInThemeProvider();
