import type {
  Theme,
  ThemeId,
  ThemeManifest,
  ThemeValidationResult,
  ThemeValidationError,
} from "./types";
import { validateThemeId } from "./types";
import { validateThemeTokens, validateThemeInheritance } from "./validate";
import { registryEvents } from "@/lib/registry/events";
import {
  type ISnapshotable,
  type RegistrySnapshot,
  createSnapshotMetadata,
} from "@/lib/registry/snapshot";
import { RegistryCache } from "@/lib/registry/cache";

export interface RegistryEntry {
  theme: Theme;
  manifest: ThemeManifest | null;
  registeredAt: Date;
  source: "platform" | "agency" | "marketplace";
}

interface ThemeSnapshotItem {
  id: string;
  name: string;
  version: string;
  author: string;
  tokenCount: number;
  extends: string | null;
  registeredAt: string;
  source: string;
}

export class ThemeRegistry implements ISnapshotable<RegistryEntry> {
  private themes = new Map<ThemeId, RegistryEntry>();
  private defaultThemeId: ThemeId | null = null;
  private queryCache = new RegistryCache<RegistryEntry[]>("theme:query");

  register(
    theme: Theme,
    manifest?: ThemeManifest,
    source: RegistryEntry["source"] = "platform"
  ): { success: boolean; errors: ThemeValidationError[] } {
    const idValidation = validateThemeId(theme.identity.id);
    if (!idValidation.valid) {
      return {
        success: false,
        errors: [
          {
            path: "identity.id",
            message: idValidation.message ?? "Invalid theme ID",
          },
        ],
      };
    }

    if (this.themes.has(theme.identity.id)) {
      return {
        success: false,
        errors: [
          {
            path: "identity.id",
            message: `Theme "${theme.identity.id}" is already registered`,
          },
        ],
      };
    }

    const tokenValidation = validateThemeTokens(theme);
    if (!tokenValidation.valid) {
      return { success: false, errors: tokenValidation.errors };
    }

    if (theme.inheritance.extends) {
      const parent = this.themes.get(theme.inheritance.extends);
      if (parent) {
        const inheritanceValidation = validateThemeInheritance(theme, parent.theme);
        if (!inheritanceValidation.valid) {
          return { success: false, errors: inheritanceValidation.errors };
        }
      }
    }

    const resolvedManifest: ThemeManifest | null = manifest ?? {
      id: theme.identity.id,
      name: theme.identity.name,
      version: theme.identity.version,
      description: `Theme: ${theme.identity.name}`,
      author: {
        name: theme.identity.author.id,
        type: theme.identity.author.type,
        id: theme.identity.author.id,
      },
      license: "UNLICENSED",
      previewImages: theme.marketplace.previewImages,
      tags: theme.marketplace.tags,
      minPlatformVersion: theme.marketplace.minPlatformVersion,
      supportedSurfaces: Object.keys(theme.surfaceOverrides) as Array<keyof typeof theme.surfaceOverrides>,
      supportedModules: theme.marketplace.compatibleModules,
      pricing: {
        free: theme.marketplace.pricing.free,
        price: theme.marketplace.pricing.price,
        currency: theme.marketplace.pricing.currency,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.themes.set(theme.identity.id, {
      theme,
      manifest: resolvedManifest,
      registeredAt: new Date(),
      source,
    });

    if (!this.defaultThemeId) {
      this.defaultThemeId = theme.identity.id;
    }

    this.queryCache.clear();

    registryEvents.emit("theme:registered", {
      themeId: theme.identity.id,
      themeName: theme.identity.name,
      source,
    });

    return { success: true, errors: [] };
  }

  get(id: ThemeId): RegistryEntry | null {
    return this.themes.get(id) ?? null;
  }

  getTheme(id: ThemeId): Theme | null {
    return this.themes.get(id)?.theme ?? null;
  }

  getManifest(id: ThemeId): ThemeManifest | null {
    return this.themes.get(id)?.manifest ?? null;
  }

  getDefault(): Theme | null {
    if (!this.defaultThemeId) return null;
    return this.getTheme(this.defaultThemeId);
  }

  setDefault(id: ThemeId): boolean {
    if (!this.themes.has(id)) return false;
    const previous = this.defaultThemeId;
    this.defaultThemeId = id;
    registryEvents.emit("theme:default-changed", {
      previousId: previous,
      newId: id,
    });
    return true;
  }

  list(): RegistryEntry[] {
    const cached = this.queryCache.get("all");
    if (cached) return cached;

    const result = Array.from(this.themes.values());
    this.queryCache.set("all", result);
    return result;
  }

  listIds(): ThemeId[] {
    return Array.from(this.themes.keys());
  }

  validate(id: ThemeId): ThemeValidationResult | null {
    const entry = this.themes.get(id);
    if (!entry) return null;

    const result = validateThemeTokens(entry.theme);

    if (entry.theme.inheritance.extends) {
      const parent = this.themes.get(entry.theme.inheritance.extends);
      if (parent) {
        const inheritanceResult = validateThemeInheritance(entry.theme, parent.theme);
        result.errors.push(...inheritanceResult.errors);
        result.warnings.push(...inheritanceResult.warnings);
      }
    }

    return result;
  }

  remove(id: ThemeId): boolean {
    if (this.defaultThemeId === id) {
      this.defaultThemeId = null;
    }
    const deleted = this.themes.delete(id);
    if (deleted) {
      this.queryCache.clear();
      registryEvents.emit("theme:removed", { themeId: id });
    }
    return deleted;
  }

  has(id: ThemeId): boolean {
    return this.themes.has(id);
  }

  get size(): number {
    return this.themes.size;
  }

  resolveInheritanceChain(id: ThemeId): Theme[] {
    const chain: Theme[] = [];
    const visited = new Set<ThemeId>();
    let currentId: ThemeId | null = id;

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const theme = this.getTheme(currentId);
      if (!theme) break;
      chain.unshift(theme);
      currentId = theme.inheritance.extends;
    }

    return chain;
  }

  snapshot(): RegistrySnapshot<RegistryEntry> {
    const items: Record<string, RegistryEntry> = {};
    for (const [id, entry] of Array.from(this.themes.entries())) {
      items[id] = { ...entry };
    }

    return {
      metadata: createSnapshotMetadata("theme", "platform"),
      items,
      stats: {
        totalItems: this.themes.size,
        snapshotSize: JSON.stringify(items).length,
      },
    };
  }

  serialize(): string {
    return JSON.stringify(this.snapshot(), null, 2);
  }

  deserialize(raw: string): RegistrySnapshot<RegistryEntry> | null {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.metadata || !parsed.items) return null;
      return parsed as RegistrySnapshot<RegistryEntry>;
    } catch {
      return null;
    }
  }

  export(): Record<string, unknown> {
    const snapshot = this.snapshot();
    const exportedItems: Record<string, ThemeSnapshotItem> = {};

    for (const [id, entry] of Object.entries(snapshot.items)) {
      exportedItems[id] = {
        id: entry.theme.identity.id,
        name: entry.theme.identity.name,
        version: entry.theme.identity.version,
        author: entry.theme.identity.author.id,
        tokenCount: Object.keys(entry.theme.tokens).length,
        extends: entry.theme.inheritance.extends,
        registeredAt: entry.registeredAt.toISOString(),
        source: entry.source,
      };
    }

    return {
      metadata: snapshot.metadata,
      items: exportedItems,
      stats: snapshot.stats,
    };
  }

  import(data: Record<string, unknown>): { success: boolean; imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    const items = data.items as Record<string, ThemeSnapshotItem> | undefined;
    if (!items) {
      return { success: false, imported: 0, errors: ["No items found in import data"] };
    }

    for (const id of Object.keys(items)) {
      try {
        const entry = this.themes.get(id);
        if (!entry) {
          errors.push(`Theme "${id}" is not registered — cannot import metadata for unregistered themes`);
          continue;
        }
        imported++;
      } catch (err) {
        errors.push(`Failed to import theme "${id}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    registryEvents.emit("snapshot:imported", {
      registryType: "theme",
      itemCount: imported,
    });

    return { success: errors.length === 0, imported, errors };
  }

  get cacheStats() {
    return this.queryCache.stats();
  }
}

export const themeRegistry = new ThemeRegistry();
