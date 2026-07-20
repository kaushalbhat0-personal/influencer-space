import type {
  ModuleId,
  ModuleDefinition,
  ModuleDependency,
  ModuleQuery,
  RegistryEntry,
  ModuleLifecycleState,
  ModuleValidationResult,
  DependencyGraph,
  SemVer,
} from "./types";
import { validateModuleId } from "./types";
import type { SurfaceRegistry } from "./surface-registry";
import { ModuleValidator } from "./validator";
import { ModuleLifecycleManager } from "./lifecycle";
import { DependencyResolver } from "./dependency-resolver";
import { registryEvents } from "@/lib/registry/events";
import {
  type ISnapshotable,
  type RegistrySnapshot,
  createSnapshotMetadata,
} from "@/lib/registry/snapshot";
import { RegistryCache } from "@/lib/registry/cache";

interface ModuleSnapshotItem {
  id: string;
  name: string;
  version: string;
  domain: string;
  authorId: string;
  dependencyCount: number;
  surfaceCount: number;
  lifecycleState: string;
  source: string;
}

export class ModuleRegistry implements ISnapshotable<RegistryEntry> {
  private modules = new Map<ModuleId, RegistryEntry>();
  private validator: ModuleValidator;
  lifecycleManager: ModuleLifecycleManager;
  dependencyResolver: DependencyResolver;
  private queryCache = new RegistryCache<RegistryEntry[]>("module:query");
  private depGraphCache = new RegistryCache<DependencyGraph>("module:dep-graph");

  constructor(surfaceRegistry: SurfaceRegistry) {
    this.validator = new ModuleValidator(surfaceRegistry);
    this.lifecycleManager = new ModuleLifecycleManager();
    this.dependencyResolver = new DependencyResolver();
  }

  register(
    definition: ModuleDefinition,
    source: RegistryEntry["source"] = "platform"
  ): { success: boolean; errors: ModuleValidationResult["errors"] } {
    const idCheck = validateModuleId(definition.identity.id);
    if (!idCheck.valid) {
      return {
        success: false,
        errors: [
          {
            path: "identity.id",
            message: idCheck.message ?? "Invalid module ID",
            severity: "error",
          },
        ],
      };
    }

    if (this.modules.has(definition.identity.id)) {
      return {
        success: false,
        errors: [
          {
            path: "identity.id",
            message: `Module "${definition.identity.id}" is already registered`,
            severity: "error",
          },
        ],
      };
    }

    const validation = this.validator.validate(definition);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    const entry: RegistryEntry = {
      definition,
      state: "draft",
      registeredAt: new Date(),
      installedAt: null,
      enabledAt: null,
      source,
      metadata: {},
    };

    this.modules.set(definition.identity.id, Object.freeze(entry));
    this.lifecycleManager.setState(definition.identity.id, "draft");
    this.syncDependencyResolver();
    this.invalidateCaches();

    registryEvents.emit("module:registered", {
      moduleId: definition.identity.id,
      moduleName: definition.identity.name,
      domain: definition.identity.domain,
      source,
    });

    registryEvents.emit("module:validated", {
      moduleId: definition.identity.id,
      valid: validation.valid,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    });

    return { success: true, errors: [] };
  }

  unregister(id: ModuleId): boolean {
    if (!this.modules.has(id)) return false;

    const requiredBy = this.getDependents(id);
    if (requiredBy.length > 0) {
      return false;
    }

    this.modules.delete(id);
    this.invalidateCaches();
    this.syncDependencyResolver();

    registryEvents.emit("module:removed", { moduleId: id });

    return true;
  }

  get(id: ModuleId): RegistryEntry | null {
    return this.modules.get(id) ?? null;
  }

  getDefinition(id: ModuleId): ModuleDefinition | null {
    return this.modules.get(id)?.definition ?? null;
  }

  list(query?: ModuleQuery): RegistryEntry[] {
    if (!query) {
      const cached = this.queryCache.get("all");
      if (cached) return cached;
    }

    let entries = Array.from(this.modules.values());

    if (query) {
      if (query.domain) {
        entries = entries.filter((e) => e.definition.identity.domain === query.domain);
      }
      if (query.state) {
        entries = entries.filter(
          (e) => this.lifecycleManager.getState(e.definition.identity.id) === query.state
        );
      }
      if (query.source) {
        entries = entries.filter((e) => e.source === query.source);
      }
      if (query.surface) {
        entries = entries.filter((e) =>
          e.definition.surfaces.supported.some((s) => s.surfaceId === query.surface)
        );
      }
      if (query.planTier) {
        entries = entries.filter((e) =>
          e.definition.permissions.requiredPlanTiers.includes(query.planTier!)
        );
      }
      if (query.search) {
        const search = query.search.toLowerCase();
        entries = entries.filter(
          (e) =>
            e.definition.identity.name.toLowerCase().includes(search) ||
            e.definition.identity.id.toLowerCase().includes(search) ||
            e.definition.identity.description.toLowerCase().includes(search)
        );
      }
    }

    if (!query) {
      this.queryCache.set("all", entries);
    }

    return entries;
  }

  listIds(): ModuleId[] {
    return Array.from(this.modules.keys());
  }

  find(predicate: (entry: RegistryEntry) => boolean): RegistryEntry | null {
    for (const entry of Array.from(this.modules.values())) {
      if (predicate(entry)) return entry;
    }
    return null;
  }

  validate(id: ModuleId): ModuleValidationResult | null {
    const entry = this.modules.get(id);
    if (!entry) return null;

    const result = this.validator.validate(entry.definition);

    registryEvents.emit("module:validated", {
      moduleId: id,
      valid: result.valid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
    });

    return result;
  }

  validateAll(): Map<ModuleId, ModuleValidationResult> {
    const results = new Map<ModuleId, ModuleValidationResult>();
    for (const [id, entry] of Array.from(this.modules.entries())) {
      const result = this.validator.validate(entry.definition);
      results.set(id, result);
    }
    return results;
  }

  buildDependencyGraph(moduleIds?: ModuleId[]): DependencyGraph {
    const ids = moduleIds ?? this.listIds();
    const cacheKey = `dep-graph:${ids.sort().join(",")}`;

    const cached = this.depGraphCache.get(cacheKey);
    if (cached) return cached;

    const graph = this.dependencyResolver.buildGraph(ids);
    this.depGraphCache.set(cacheKey, graph);
    return graph;
  }

  detectCycles(moduleIds?: ModuleId[]): ModuleId[][] {
    const ids = moduleIds ?? this.listIds();
    return this.dependencyResolver.detectCycles(ids);
  }

  topologicalSort(moduleIds?: ModuleId[]): ModuleId[] {
    const ids = moduleIds ?? this.listIds();
    return this.dependencyResolver.topologicalSort(ids);
  }

  getDependents(moduleId: ModuleId): ModuleId[] {
    const dependents: ModuleId[] = [];
    for (const [id, entry] of Array.from(this.modules.entries())) {
      if (
        entry.definition.composition.dependencies.some(
          (d: ModuleDependency) => d.moduleId === moduleId
        )
      ) {
        dependents.push(id);
      }
    }
    return dependents;
  }

  getDependencyTree(moduleId: ModuleId): string {
    return this.dependencyResolver.getDependencyTree(moduleId);
  }

  checkCompatibility(
    moduleId: ModuleId,
    targetVersion: SemVer
  ): { compatible: boolean; reason?: string } {
    const entry = this.modules.get(moduleId);
    if (!entry) {
      return { compatible: false, reason: `Module "${moduleId}" is not registered` };
    }

    const requiredBy = this.getDependents(moduleId);
    for (const dependentId of requiredBy) {
      const dependent = this.modules.get(dependentId);
      if (!dependent) continue;

      const dep = dependent.definition.composition.dependencies.find(
        (d) => d.moduleId === moduleId
      );

      if (dep?.minVersion) {
        const [targetMajor, targetMinor, targetPatch] = targetVersion.split(".").map(Number);
        const [minMajor, minMinor, minPatch] = dep.minVersion.split(".").map(Number);

        if (
          targetMajor! < minMajor! ||
          (targetMajor === minMajor && targetMinor! < minMinor!) ||
          (targetMajor === minMajor && targetMinor === minMinor && targetPatch! < minPatch!)
        ) {
          return {
            compatible: false,
            reason: `Module "${dependentId}" requires "${moduleId}" >= ${dep.minVersion}`,
          };
        }
      }
    }

    return { compatible: true };
  }

  getByDomain(domain: string): RegistryEntry[] {
    return this.list({ domain: domain as ModuleDefinition["identity"]["domain"] });
  }

  getBySurface(surfaceId: string): RegistryEntry[] {
    return this.list({ surface: surfaceId as ModuleDefinition["surfaces"]["supported"][number]["surfaceId"] });
  }

  getByState(state: ModuleLifecycleState): RegistryEntry[] {
    return this.list({ state });
  }

  discover(
    sources: { type: RegistryEntry["source"]; definitions: ModuleDefinition[] }[]
  ): { registered: number; failed: { id: string; errors: ModuleValidationResult["errors"] }[] } {
    let registered = 0;
    const failed: { id: string; errors: ModuleValidationResult["errors"] }[] = [];

    for (const source of sources) {
      for (const definition of source.definitions) {
        const result = this.register(definition, source.type);
        if (result.success) {
          registered++;
        } else {
          failed.push({ id: definition.identity.id, errors: result.errors });
        }
      }
    }

    return { registered, failed };
  }

  has(id: ModuleId): boolean {
    return this.modules.has(id);
  }

  get size(): number {
    return this.modules.size;
  }

  snapshot(): RegistrySnapshot<RegistryEntry> {
    const items: Record<string, RegistryEntry> = {};
    for (const [id, entry] of Array.from(this.modules.entries())) {
      items[id] = {
        definition: { ...entry.definition },
        state: entry.state,
        registeredAt: entry.registeredAt,
        installedAt: entry.installedAt,
        enabledAt: entry.enabledAt,
        source: entry.source,
        metadata: { ...entry.metadata },
      };
    }

    return {
      metadata: createSnapshotMetadata("module", "platform"),
      items,
      stats: {
        totalItems: this.modules.size,
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
    const exportedItems: Record<string, ModuleSnapshotItem> = {};

    for (const [id, entry] of Object.entries(snapshot.items)) {
      exportedItems[id] = {
        id: entry.definition.identity.id,
        name: entry.definition.identity.name,
        version: entry.definition.identity.version,
        domain: entry.definition.identity.domain,
        authorId: entry.definition.identity.author.id,
        dependencyCount: entry.definition.composition.dependencies.length,
        surfaceCount: entry.definition.surfaces.supported.length,
        lifecycleState: this.lifecycleManager.getState(id as ModuleId),
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

    const items = data.items as Record<string, ModuleSnapshotItem> | undefined;
    if (!items) {
      return { success: false, imported: 0, errors: ["No items found in import data"] };
    }

    for (const id of Object.keys(items)) {
      try {
        const entry = this.modules.get(id as ModuleId);
        if (!entry) {
          errors.push(`Module "${id}" is not registered`);
          continue;
        }
        imported++;
      } catch (err) {
        errors.push(`Failed to import module "${id}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    registryEvents.emit("snapshot:imported", {
      registryType: "module",
      itemCount: imported,
    });

    return { success: errors.length === 0, imported, errors };
  }

  get cacheStats() {
    return {
      query: this.queryCache.stats(),
      depGraph: this.depGraphCache.stats(),
    };
  }

  private syncDependencyResolver(): void {
    const definitionMap = new Map<ModuleId, ModuleDefinition>();
    for (const [id, entry] of Array.from(this.modules.entries())) {
      definitionMap.set(id, entry.definition);
    }
    this.dependencyResolver.setDefinitions(definitionMap);
  }

  private invalidateCaches(): void {
    this.queryCache.clear();
    this.depGraphCache.clear();
    registryEvents.emit("cache:invalidated", {
      cacheName: "module:all",
      reason: "registry mutation",
    });
  }
}
