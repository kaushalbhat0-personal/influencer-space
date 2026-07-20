import type {
  ConfigEntry,
  ConfigPatch,
  ConfigPatchResult,
  ConfigSnapshot,
  ConfigKey,
  IConfigStore,
  ConfigLayer,
} from "./types";

export class MemoryConfigStore implements IConfigStore {
  private store = new Map<string, Map<ConfigKey, ConfigEntry>>();
  private versions = new Map<string, ConfigSnapshot[]>();
  private versionCounter = 0;

  private tenantKey(tenantId: string): string {
    return tenantId;
  }

  async get(tenantId: string, key: ConfigKey): Promise<ConfigEntry | null> {
    const tenantStore = this.store.get(this.tenantKey(tenantId));
    return tenantStore?.get(key) ?? null;
  }

  async set(
    tenantId: string,
    key: ConfigKey,
    value: unknown,
    options?: { layer?: ConfigLayer; actor?: string; reason?: string }
  ): Promise<ConfigEntry> {
    const tk = this.tenantKey(tenantId);
    if (!this.store.has(tk)) {
      this.store.set(tk, new Map());
    }

    const tenantStore = this.store.get(tk)!;
    const existing = tenantStore.get(key);

    const entry: ConfigEntry = {
      key,
      value,
      layer: options?.layer ?? "creator",
      updatedAt: new Date().toISOString(),
      version: (existing?.version ?? 0) + 1,
      locked: existing?.locked ?? false,
    };

    tenantStore.set(key, entry);
    return entry;
  }

  async delete(tenantId: string, key: ConfigKey): Promise<boolean> {
    const tenantStore = this.store.get(this.tenantKey(tenantId));
    return tenantStore?.delete(key) ?? false;
  }

  async list(tenantId: string, prefix?: string): Promise<ConfigEntry[]> {
    const tenantStore = this.store.get(this.tenantKey(tenantId));
    if (!tenantStore) return [];

    const entries = Array.from(tenantStore.values());
    if (prefix) {
      return entries.filter((e) => e.key.startsWith(prefix));
    }
    return entries;
  }

  async patch(
    tenantId: string,
    patches: ConfigPatch[],
    options?: { layer?: ConfigLayer; actor?: string; reason?: string }
  ): Promise<ConfigPatchResult[]> {
    const results: ConfigPatchResult[] = [];

    for (const patch of patches) {
      const existing = await this.get(tenantId, patch.key);
      const prev = existing?.value ?? null;

      switch (patch.operation) {
        case "set":
          await this.set(tenantId, patch.key, patch.value, options);
          results.push({
            success: true,
            key: patch.key,
            operation: "set",
            previousValue: prev,
            newValue: patch.value,
            errors: [],
          });
          break;
        case "delete":
          await this.delete(tenantId, patch.key);
          results.push({
            success: true,
            key: patch.key,
            operation: "delete",
            previousValue: prev,
            newValue: null,
            errors: [],
          });
          break;
        case "merge":
          if (typeof patch.value === "object" && patch.value !== null && !Array.isArray(patch.value)) {
            const merged = typeof prev === "object" && prev !== null && !Array.isArray(prev)
              ? { ...prev as Record<string, unknown>, ...patch.value as Record<string, unknown> }
              : patch.value;
            await this.set(tenantId, patch.key, merged, options);
            results.push({
              success: true,
              key: patch.key,
              operation: "merge",
              previousValue: prev,
              newValue: merged,
              errors: [],
            });
          } else {
            await this.set(tenantId, patch.key, patch.value, options);
            results.push({
              success: true,
              key: patch.key,
              operation: "set",
              previousValue: prev,
              newValue: patch.value,
              errors: [],
            });
          }
          break;
      }
    }

    return results;
  }

  async snapshot(tenantId: string): Promise<ConfigSnapshot> {
    const entries = await this.list(tenantId);
    const entryMap: Record<string, ConfigEntry> = {};
    for (const entry of entries) {
      entryMap[entry.key] = entry;
    }

    this.versionCounter++;
    return {
      id: `snap_${this.versionCounter}`,
      version: this.versionCounter,
      entries: entryMap,
      createdAt: new Date().toISOString(),
      createdBy: null,
      reason: null,
      metadata: {},
    };
  }

  async restore(tenantId: string, snapshot: ConfigSnapshot): Promise<boolean> {
    const tk = this.tenantKey(tenantId);
    const tenantStore = this.store.get(tk) ?? new Map();

    tenantStore.clear();
    for (const [key, entry] of Object.entries(snapshot.entries)) {
      tenantStore.set(key, { ...entry });
    }

    this.store.set(tk, tenantStore);
    return true;
  }
}
