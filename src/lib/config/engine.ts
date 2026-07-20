import type {
  ConfigKey,
  ConfigValue,
  ConfigEntry,
  ConfigPatch,
  ConfigPatchResult,
  ConfigSnapshot,
  ConfigDiff,
  ConfigLayer,
  IConfigStore,
  IConfigHistory,
} from "./types";
import { MemoryConfigStore } from "./store";
import { MemoryConfigHistory } from "./history";
import { DiffEngine } from "./diff";
import { ConfigValidator } from "./validator";
import { registryEvents } from "@/lib/registry/events";

export interface ConfigurationEngineOptions {
  store?: IConfigStore;
  history?: IConfigHistory;
}

export class ConfigurationEngine {
  readonly store: IConfigStore;
  readonly history: IConfigHistory;
  readonly diff: DiffEngine;
  readonly validator: ConfigValidator;

  constructor(options: ConfigurationEngineOptions = {}) {
    this.store = options.store ?? new MemoryConfigStore();
    this.history = options.history ?? new MemoryConfigHistory();
    this.diff = new DiffEngine();
    this.validator = new ConfigValidator();
  }

  async get(tenantId: string, key: ConfigKey): Promise<ConfigValue | null> {
    const entry = await this.store.get(tenantId, key);
    return entry?.value ?? null;
  }

  async getEntry(tenantId: string, key: ConfigKey): Promise<ConfigEntry | null> {
    return this.store.get(tenantId, key);
  }

  async set(
    tenantId: string,
    key: ConfigKey,
    value: ConfigValue,
    options?: { layer?: ConfigLayer; actor?: string; reason?: string }
  ): Promise<ConfigEntry> {
    const prev = await this.store.get(tenantId, key);

    const validation = this.validator.validate(key, value);
    if (!validation.valid) {
      throw new Error(`Validation failed for "${key}": ${validation.errors.map((e) => e.message).join(", ")}`);
    }

    const entry = await this.store.set(tenantId, key, value, options);

    await this.history.record({
      id: `hist_${Date.now()}`,
      configKey: key,
      previousValue: prev?.value ?? null,
      newValue: value,
      layer: options?.layer ?? "creator",
      timestamp: new Date().toISOString(),
      actor: options?.actor ?? null,
      reason: options?.reason ?? null,
      metadata: {},
    });

    registryEvents.emit(prev ? "config:updated" as never : "config:created" as never, {
      key,
      layer: options?.layer ?? "creator",
    } as never);

    return entry;
  }

  async delete(
    tenantId: string,
    key: ConfigKey,
    options?: { actor?: string; reason?: string }
  ): Promise<boolean> {
    const prev = await this.store.get(tenantId, key);
    const deleted = await this.store.delete(tenantId, key);

    if (deleted) {
      await this.history.record({
        id: `hist_${Date.now()}`,
        configKey: key,
        previousValue: prev?.value ?? null,
        newValue: null,
        layer: prev?.layer ?? "creator",
        timestamp: new Date().toISOString(),
        actor: options?.actor ?? null,
        reason: options?.reason ?? null,
        metadata: {},
      });
    }

    return deleted;
  }

  async patch(
    tenantId: string,
    patches: ConfigPatch[],
    options?: { layer?: ConfigLayer; actor?: string; reason?: string }
  ): Promise<ConfigPatchResult[]> {
    const results = await this.store.patch(tenantId, patches, options);

    for (const result of results) {
      if (result.success) {
        await this.history.record({
          id: `hist_${Date.now()}`,
          configKey: result.key,
          previousValue: result.previousValue,
          newValue: result.newValue,
          layer: options?.layer ?? "creator",
          timestamp: new Date().toISOString(),
          actor: options?.actor ?? null,
          reason: options?.reason ?? null,
          metadata: {},
        });
      }
    }

    return results;
  }

  async list(tenantId: string, prefix?: string): Promise<ConfigEntry[]> {
    return this.store.list(tenantId, prefix);
  }

  async snapshot(tenantId: string): Promise<ConfigSnapshot> {
    return this.store.snapshot(tenantId);
  }

  async restore(
    tenantId: string,
    snapshot: ConfigSnapshot
  ): Promise<boolean> {
    const before = await this.store.snapshot(tenantId);
    const restored = await this.store.restore(tenantId, snapshot);

    if (restored) {
      registryEvents.emit("config:rollback" as never, {
        tenantId,
        fromVersion: before.version,
        toVersion: snapshot.version,
      } as never);
    }

    return restored;
  }

  async rollback(
    tenantId: string,
    key: ConfigKey,
    targetVersion: number,
    _options?: { actor?: string; reason?: string }
  ): Promise<ConfigEntry | null> {
    const rolledBack = await this.history.rollback(tenantId, key, targetVersion);
    if (rolledBack) {
      await this.store.set(tenantId, key, rolledBack.value, {
        layer: rolledBack.layer,
        actor: _options?.actor,
        reason: _options?.reason ?? `Rollback to version ${targetVersion}`,
      });
    }
    return rolledBack;
  }

  async compare(
    tenantId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<ConfigDiff[] | null> {
    const before = await this.store.snapshot(tenantId);
    const after = await this.store.snapshot(tenantId);

    const diffResult = this.diff.compare(
      { ...before, version: fromVersion },
      { ...after, version: toVersion }
    );

    return diffResult.changes;
  }

  async historyList(
    tenantId: string,
    key?: ConfigKey,
    limit?: number
  ): Promise<ConfigEntry[]> {
    const entries = await this.history.list(tenantId, key, limit);
    return entries.map((e) => ({
      key: e.configKey,
      value: e.newValue,
      layer: e.layer,
      updatedAt: e.timestamp,
      version: 0,
      locked: false,
    }));
  }

  validate(key: string, value: ConfigValue) {
    return this.validator.validate(key, value);
  }

  validateBatch(entries: Array<{ key: string; value: ConfigValue }>) {
    return this.validator.validateBatch(entries);
  }

  registerSchema(key: string, schema: Parameters<ConfigValidator["registerSchema"]>[1]): void {
    this.validator.registerSchema(key, schema);
  }

  private computeEntryDiff(
    prev: ConfigEntry | null,
    next: ConfigEntry
  ): ConfigDiff[] | null {
    if (!prev) return null;

    const beforeSnapshot: ConfigSnapshot = {
      id: "diff",
      version: 0,
      entries: { [prev.key]: prev },
      createdAt: "",
      createdBy: null,
      reason: null,
      metadata: {},
    };

    const afterSnapshot: ConfigSnapshot = {
      id: "diff",
      version: 1,
      entries: { [next.key]: next },
      createdAt: "",
      createdBy: null,
      reason: null,
      metadata: {},
    };

    return this.diff.compare(beforeSnapshot, afterSnapshot).changes;
  }
}

export const configEngine = new ConfigurationEngine();
