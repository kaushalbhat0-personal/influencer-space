import type { ThemePackage, ThemePresetEntry, ThemePresetQuery, MarketplaceHook, MarketplaceHooks } from "./packages";
import { builderEvents } from "../events";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

export class ThemePresetRegistry {
  private presets = new Map<string, ThemePresetEntry>();
  private hooks: MarketplaceHooks = { onInstall: [], onUpdate: [], onRemove: [], onPreview: [] };

  install(pkg: ThemePackage, source: ThemePresetEntry["source"] = "local"): { success: boolean; error?: string } {
    if (this.presets.has(pkg.id)) return { success: false, error: `Preset "${pkg.id}" already installed` };

    this.presets.set(pkg.id, {
      package: pkg,
      installedAt: new Date().toISOString(),
      lastUsedAt: null,
      isActive: false,
      source,
    });

    platformTelemetry.counter("builder.theme.preset.installed", 1, { source });
    return { success: true };
  }

  uninstall(id: string): boolean {
    const deleted = this.presets.delete(id);
    if (deleted) platformTelemetry.counter("builder.theme.preset.removed", 1);
    return deleted;
  }

  get(id: string): ThemePresetEntry | null { return this.presets.get(id) ?? null; }

  activate(id: string): boolean {
    const entry = this.presets.get(id);
    if (!entry) return false;
    for (const [key, e] of Array.from(this.presets.entries())) e.isActive = key === id;
    entry.isActive = true;
    entry.lastUsedAt = new Date().toISOString();
    builderEvents.emit("theme:changed" as never, { themeId: id } as never);
    return true;
  }

  deactivate(): void {
    for (const entry of Array.from(this.presets.values())) entry.isActive = false;
  }

  getActive(): ThemePresetEntry | null {
    for (const entry of Array.from(this.presets.values())) { if (entry.isActive) return entry; }
    return null;
  }

  list(query?: ThemePresetQuery): ThemePresetEntry[] {
    let results = Array.from(this.presets.values());
    if (query?.source) results = results.filter((e) => e.source === query.source);
    if (query?.active !== undefined) results = results.filter((e) => e.isActive === query.active);
    if (query?.tags && query.tags.length > 0) results = results.filter((e) => e.package.tags.some((t) => query.tags!.includes(t)));
    if (query?.search) {
      const s = query.search.toLowerCase();
      results = results.filter((e) => e.package.name.toLowerCase().includes(s) || e.package.description.toLowerCase().includes(s) || e.package.tags.some((t) => t.toLowerCase().includes(s)));
    }
    return results;
  }

  registerHook(type: keyof MarketplaceHooks, hook: MarketplaceHook): void {
    this.hooks[type].push(hook);
  }

  getHooks(): MarketplaceHooks { return this.hooks; }

  get size(): number { return this.presets.size; }
}

export const themePresets = new ThemePresetRegistry();
