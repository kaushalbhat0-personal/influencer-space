import type { ThemeDefinition } from "./types-new";
import { builtInThemeProvider } from "./providers/built-in";

export interface ThemeProvider {
  readonly type: string;
  getAll(): ThemeDefinition[];
  getById(id: string): ThemeDefinition | undefined;
  list(options?: { category?: string; premium?: boolean; search?: string }): ThemeDefinition[];
}

export class ThemeRegistry {
  private providers: ThemeProvider[] = [];
  private themes: Map<string, ThemeDefinition> | null = null;
  private initialized = false;

  constructor() {
    this.registerProvider(builtInThemeProvider);
  }

  registerProvider(provider: ThemeProvider): void {
    this.providers.push(provider);
    this.themes = null;
    this.initialized = false;
  }

  private ensureInitialized(): void {
    if (this.initialized) return;

    const all: ThemeDefinition[] = [];
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();

    for (const provider of this.providers) {
      for (const theme of provider.getAll()) {
        if (seenIds.has(theme.id)) throw new Error(`Duplicate theme ID: ${theme.id}`);
        if (seenSlugs.has(theme.slug)) throw new Error(`Duplicate theme slug: ${theme.slug}`);
        seenIds.add(theme.id);
        seenSlugs.add(theme.slug);
        all.push(Object.freeze(theme));
      }
    }

    this.themes = new Map(all.map((t) => [t.id, t]));
    this.initialized = true;
  }

  getById(id: string): ThemeDefinition | undefined {
    this.ensureInitialized();
    return this.themes?.get(id);
  }

  getAll(options?: {
    category?: string;
    premium?: boolean;
    search?: string;
    entitlements?: string[];
  }): ThemeDefinition[] {
    this.ensureInitialized();
    let results = Array.from(this.themes?.values() ?? []);

    if (options?.category) results = results.filter((t) => t.category === options.category);
    if (options?.premium !== undefined) results = results.filter((t) => t.premium === options.premium);
    if (options?.entitlements) results = results.filter((t) => !t.premium || options.entitlements!.includes("premium_themes"));
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

  getCategories(): string[] {
    this.ensureInitialized();
    const cats = new Set<string>();
    for (const theme of Array.from(this.themes?.values() ?? [])) {
      cats.add(theme.category);
    }
    return Array.from(cats).sort();
  }

}

export const themeRegistry = new ThemeRegistry();
