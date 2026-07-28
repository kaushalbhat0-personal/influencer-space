import type { BlueprintDefinition, BlueprintCategory } from "./types";
import { builtInBlueprintProvider } from "./providers/built-in";

export interface BlueprintProvider {
  readonly type: string;
  getAll(): BlueprintDefinition[];
  getById(id: string): BlueprintDefinition | undefined;
  list(options?: { category?: string; search?: string }): BlueprintDefinition[];
}

export class BlueprintRegistry {
  private providers: BlueprintProvider[] = [];
  private cache: Map<string, BlueprintDefinition> | null = null;
  private initialized = false;

  constructor() {
    this.registerProvider(builtInBlueprintProvider);
  }

  registerProvider(provider: BlueprintProvider): void {
    this.providers.push(provider);
    this.cache = null;
    this.initialized = false;
  }

  private ensureInitialized(): void {
    if (this.initialized) return;

    const all: BlueprintDefinition[] = [];
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();

    for (const provider of this.providers) {
      for (const bp of provider.getAll()) {
        if (seenIds.has(bp.id)) throw new Error(`Duplicate blueprint ID: ${bp.id}`);
        if (seenSlugs.has(bp.slug)) throw new Error(`Duplicate blueprint slug: ${bp.slug}`);
        seenIds.add(bp.id);
        seenSlugs.add(bp.slug);
        all.push(Object.freeze(bp));
      }
    }

    this.cache = new Map(all.map((b) => [b.id, b]));
    this.initialized = true;
  }

  getById(id: string): BlueprintDefinition | undefined {
    this.ensureInitialized();
    return this.cache?.get(id);
  }

  getAll(options?: {
    category?: BlueprintCategory;
    search?: string;
    entitlements?: string[];
    requireCapabilities?: string[];
  }): BlueprintDefinition[] {
    this.ensureInitialized();
    let results = Array.from(this.cache?.values() ?? []);

    if (options?.category) results = results.filter((b) => b.category === options.category);
    if (options?.search) {
      const q = options.search.toLowerCase();
      results = results.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (options?.entitlements) {
      results = results.filter((b) =>
        !b.requiredCapabilities.length ||
        b.requiredCapabilities.every((c) => options.entitlements?.includes(c)),
      );
    }
    if (options?.requireCapabilities) {
      results = results.filter((b) =>
        options.requireCapabilities!.every((c) => b.requiredCapabilities.includes(c)),
      );
    }

    return results;
  }

  getCategories(): BlueprintCategory[] {
    this.ensureInitialized();
    const cats = new Set<BlueprintCategory>();
    for (const bp of Array.from(this.cache?.values() ?? [])) {
      cats.add(bp.category);
    }
    return Array.from(cats).sort();
  }

  getCompatibleThemes(blueprintId: string): string[] {
    const bp = this.getById(blueprintId);
    return bp ? [...bp.recommendedThemes, ...bp.compatibleThemes] : [];
  }

  resolveInheritedBlueprint(blueprintId: string): BlueprintDefinition {
    const bp = this.getById(blueprintId);
    if (!bp) throw new Error(`Blueprint not found: ${blueprintId}`);

    if (!bp.inheritance.parentId) return bp;

    const parent = this.resolveInheritedBlueprint(bp.inheritance.parentId);
    return this.mergeBlueprints(parent, bp);
  }

  private mergeBlueprints(
    parent: BlueprintDefinition,
    child: BlueprintDefinition,
  ): BlueprintDefinition {
    const existingPageIds = new Set(parent.pages.map((p) => p.id));
    const mergedPages = [...parent.pages];

    for (const page of child.pages) {
      if (!existingPageIds.has(page.id)) {
        mergedPages.push(page);
      }
    }

    const existingNavIds = new Set(parent.navigation.map((n) => n.id));
    const mergedNav = [...parent.navigation];
    for (const item of child.navigation) {
      if (!existingNavIds.has(item.id)) {
        mergedNav.push(item);
      }
    }

    return Object.freeze({
      ...parent,
      ...child,
      pages: mergedPages,
      navigation: mergedNav,
      starterContent: {
        ...parent.starterContent,
        ...child.starterContent,
        placeholders: { ...parent.starterContent?.placeholders, ...child.starterContent?.placeholders },
      },
      recommendedThemes: Array.from(new Set([...parent.recommendedThemes, ...child.recommendedThemes])),
      compatibleThemes: Array.from(new Set([...parent.compatibleThemes, ...child.compatibleThemes])),
      incompatibleThemes: Array.from(new Set([...parent.incompatibleThemes, ...child.incompatibleThemes])),
      requiredCapabilities: Array.from(new Set([...parent.requiredCapabilities, ...child.requiredCapabilities])),
    });
  }

  getDiagnostics(): {
    providerCount: number;
    blueprintCount: number;
    categories: Record<string, number>;
  } {
    this.ensureInitialized();
    const all = Array.from(this.cache?.values() ?? []);
    const categories: Record<string, number> = {};
    for (const bp of all) {
      categories[bp.category] = (categories[bp.category] ?? 0) + 1;
    }
    return {
      providerCount: this.providers.length,
      blueprintCount: all.length,
      categories,
    };
  }
}

export const blueprintRegistry = new BlueprintRegistry();
