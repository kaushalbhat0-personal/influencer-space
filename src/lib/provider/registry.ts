import type { ProviderId, ProviderContract, ProviderEntry, ProviderType, ProviderHealthResult, ProviderDiagnostics } from "./types";
import { registryEvents } from "@/lib/registry/events";

export class ProviderRegistry {
  private providers = new Map<ProviderId, ProviderEntry>();

  register(contract: ProviderContract, options: { priority?: number; config?: Record<string, unknown>; metadata?: Record<string, unknown>; healthCheck?: () => Promise<boolean> } = {}): { success: boolean; error?: string } {
    if (this.providers.has(contract.id)) return { success: false, error: `Provider "${contract.id}" already registered` };
    this.providers.set(contract.id, {
      contract, priority: options.priority ?? 0, enabled: true, healthy: true,
      registeredAt: new Date().toISOString(),
      config: options.config ?? {}, metadata: options.metadata ?? {},
      healthCheck: options.healthCheck ?? (async () => true),
    });
    registryEvents.emit("provider:registered" as never, { providerId: contract.id, interfaceName: contract.type } as never);
    return { success: true };
  }

  unregister(id: ProviderId): boolean {
    const deleted = this.providers.delete(id);
    if (deleted) registryEvents.emit("provider:removed" as never, { providerId: id } as never);
    return deleted;
  }

  get(id: ProviderId): ProviderEntry | null { return this.providers.get(id) ?? null; }

  list(type?: ProviderType): ProviderEntry[] {
    let entries = Array.from(this.providers.values());
    if (type) entries = entries.filter((e) => e.contract.type === type);
    return entries.sort((a, b) => b.priority - a.priority);
  }

  getByType(type: ProviderType): ProviderEntry[] { return this.list(type); }
  getActive(type: ProviderType): ProviderEntry | null { return this.list(type).find((p) => p.enabled && p.healthy) ?? null; }
  getAlternatives(type: ProviderType, excludeId: ProviderId): ProviderEntry[] { return this.list(type).filter((p) => p.contract.id !== excludeId && p.enabled); }

  enable(id: ProviderId): boolean { const p = this.providers.get(id); if (!p) return false; this.providers.set(id, { ...p, enabled: true }); return true; }
  disable(id: ProviderId): boolean { const p = this.providers.get(id); if (!p) return false; this.providers.set(id, { ...p, enabled: false }); return true; }

  async runHealthChecks(): Promise<ProviderHealthResult[]> {
    const results: ProviderHealthResult[] = [];
    for (const [id, entry] of Array.from(this.providers.entries())) {
      const start = performance.now();
      try { const ok = await entry.healthCheck(); results.push({ providerId: id, healthy: ok, latency: Math.round(performance.now() - start), error: null }); }
      catch (err) { results.push({ providerId: id, healthy: false, latency: Math.round(performance.now() - start), error: err instanceof Error ? err.message : String(err) }); }
    }
    return results;
  }

  async failover(type: ProviderType): Promise<ProviderEntry | null> {
    const active = this.getActive(type);
    if (active) return active;
    const alternates = this.getByType(type).filter((p) => p.enabled);
    if (alternates.length === 0) return null;
    const health = await this.runHealthChecks();
    return alternates.find((p) => health.find((h) => h.providerId === p.contract.id)?.healthy) ?? null;
  }

  diagnostics(): ProviderDiagnostics {
    const all = this.list();
    const byType: Record<string, number> = {};
    for (const e of all) byType[e.contract.type] = (byType[e.contract.type] ?? 0) + 1;
    return { total: all.length, enabled: all.filter((p) => p.enabled).length, healthy: all.filter((p) => p.healthy).length, byType, health: [] };
  }

  get size(): number { return this.providers.size; }
}

export const providerRegistry = new ProviderRegistry();
