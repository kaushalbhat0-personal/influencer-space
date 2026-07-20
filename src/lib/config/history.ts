import type {
  ConfigEntry,
  ConfigHistoryEntry,
  ConfigKey,
  ConfigLayer,
  IConfigHistory,
} from "./types";

export class MemoryConfigHistory implements IConfigHistory {
  private history: ConfigHistoryEntry[] = [];

  async record(entry: ConfigHistoryEntry): Promise<void> {
    this.history.push(entry);
  }

  async list(
    tenantId: string,
    key?: ConfigKey,
    limit = 100
  ): Promise<ConfigHistoryEntry[]> {
    let filtered = this.history.filter((e) => e.configKey.startsWith(tenantId + ":"));
    if (key) {
      filtered = filtered.filter((e) => e.configKey === key);
    }
    return filtered.slice(-limit);
  }

  async getVersion(
    tenantId: string,
    key: ConfigKey,
    version: number
  ): Promise<ConfigEntry | null> {
    const entries = this.history.filter(
      (e) => e.configKey === key
    );

    if (entries.length === 0) return null;

    let currentValue: unknown = null;
    let currentLayer: ConfigLayer = "creator";
    let currentVersion = 0;

    for (const entry of entries) {
      currentVersion++;
      currentValue = entry.newValue;
      currentLayer = entry.layer;
      if (currentVersion >= version) break;
    }

    return {
      key,
      value: currentValue,
      layer: currentLayer,
      updatedAt: new Date().toISOString(),
      version: currentVersion,
      locked: false,
    };
  }

  async rollback(
    tenantId: string,
    key: ConfigKey,
    targetVersion: number
  ): Promise<ConfigEntry | null> {
    return this.getVersion(tenantId, key, targetVersion);
  }
}
