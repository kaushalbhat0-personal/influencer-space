import type { ThemeDefinition, ThemeRegistryListOptions } from "./types-new";
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

  getAll(options?: ThemeRegistryListOptions): ThemeDefinition[] {
    this.ensureInitialized();
    let results = Array.from(this.themes?.values() ?? []);

    if (options?.category) results = results.filter((t) => t.category === options.category);
    if (options?.industries) results = results.filter((t) => t.industries?.some((i) => options.industries!.includes(i)));
    if (options?.premium !== undefined) results = results.filter((t) => t.premium === options.premium);
    if (options?.featured !== undefined) results = results.filter((t) => t.featured === options.featured);
    if (options?.entitlements) results = results.filter((t) => !t.premium || options.entitlements!.includes("premium_themes"));
    if (options?.search) {
      const q = options.search.toLowerCase();
      results = results.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    if (options?.sort) {
      results = [...results].sort((a, b) => {
        switch (options.sort) {
          case "newest": return new Date(b.releaseDate ?? 0).getTime() - new Date(a.releaseDate ?? 0).getTime();
          case "updated": return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
          case "rating": return (b.rating ?? 0) - (a.rating ?? 0);
          default: return a.name.localeCompare(b.name);
        }
      });
    }

    if (options?.offset) results = results.slice(options.offset);
    if (options?.limit) results = results.slice(0, options.limit);

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

  getIndustries(): string[] {
    this.ensureInitialized();
    const inds = new Set<string>();
    for (const theme of Array.from(this.themes?.values() ?? [])) {
      theme.industries?.forEach((i) => inds.add(i));
    }
    return Array.from(inds).sort();
  }

  getByIndustry(industryId: string): ThemeDefinition[] {
    return this.getAll({ industries: [industryId] });
  }

  getFeatured(): ThemeDefinition[] {
    return this.getAll({ featured: true });
  }

  count(): number {
    this.ensureInitialized();
    return this.themes?.size ?? 0;
  }

}

export const themeRegistry = new ThemeRegistry();
