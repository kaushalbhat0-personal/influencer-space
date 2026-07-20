import type { CapabilityId, CapabilityContract, CapabilityEntry, CapabilityQuery, CapabilityDependency, CapabilityDiagnostics, CapabilityStatus } from "./types";
import { registryEvents } from "@/lib/registry/events";

export class CapabilityRegistry {
  private capabilities = new Map<CapabilityId, CapabilityEntry>();
  private providers = new Map<CapabilityId, Array<{ id: string; name: string; priority: number; enabled: boolean }>>();

  register(contract: CapabilityContract): { success: boolean; error?: string } {
    if (this.capabilities.has(contract.id)) {
      return { success: false, error: `Capability "${contract.id}" already registered` };
    }
    if (!contract.id || !contract.name) {
      return { success: false, error: "Capability ID and name are required" };
    }

    this.capabilities.set(contract.id, {
      contract,
      status: "draft",
      registeredAt: new Date().toISOString(),
      enabled: true,
      metadata: {},
    });

    registryEvents.emit("capability:registered" as never, { capabilityId: contract.id, domain: contract.domain } as never);
    return { success: true };
  }

  unregister(id: CapabilityId): boolean {
    const deleted = this.capabilities.delete(id);
    this.providers.delete(id);
    if (deleted) registryEvents.emit("capability:removed" as never, { capabilityId: id } as never);
    return deleted;
  }

  get(id: CapabilityId): CapabilityEntry | null {
    return this.capabilities.get(id) ?? null;
  }

  list(query?: CapabilityQuery): CapabilityEntry[] {
    let entries = Array.from(this.capabilities.values());
    if (query?.domain) entries = entries.filter((e) => e.contract.domain === query.domain);
    if (query?.status) entries = entries.filter((e) => e.status === query.status);
    if (query?.category) entries = entries.filter((e) => e.contract.category === query.category);
    if (query?.enabled !== undefined) entries = entries.filter((e) => e.enabled === query.enabled);
    return entries;
  }

  enable(id: CapabilityId): boolean { const e = this.capabilities.get(id); if (!e) return false; this.capabilities.set(id, { ...e, enabled: true }); return true; }
  disable(id: CapabilityId): boolean { const e = this.capabilities.get(id); if (!e) return false; this.capabilities.set(id, { ...e, enabled: false }); return true; }

  setStatus(id: CapabilityId, status: CapabilityStatus): boolean {
    const e = this.capabilities.get(id); if (!e) return false;
    this.capabilities.set(id, { ...e, status }); return true;
  }

  registerProvider(capabilityId: CapabilityId, provider: { id: string; name: string; priority: number; enabled: boolean }): boolean {
    const cap = this.capabilities.get(capabilityId); if (!cap) return false;
    if (!this.providers.has(capabilityId)) this.providers.set(capabilityId, []);
    this.providers.get(capabilityId)!.push(provider);
    this.providers.get(capabilityId)!.sort((a, b) => b.priority - a.priority);
    return true;
  }

  getProviders(capabilityId: CapabilityId): Array<{ id: string; name: string; priority: number; enabled: boolean }> {
    return this.providers.get(capabilityId) ?? [];
  }

  getActiveProvider(capabilityId: CapabilityId): { id: string; name: string; priority: number; enabled: boolean } | null {
    const providers = this.getProviders(capabilityId);
    return providers.find((p) => p.enabled) ?? null;
  }

  resolveDependencies(): CapabilityDependency[] {
    const deps: CapabilityDependency[] = [];
    for (const [id, entry] of Array.from(this.capabilities.entries())) {
      for (const dep of entry.contract.dependencies) {
        const target = this.capabilities.get(dep.capabilityId);
        deps.push({ capabilityId: dep.capabilityId, requiredBy: id, minVersion: dep.minVersion, satisfied: !!target && target.enabled });
      }
    }
    return deps;
  }

  diagnostics(): CapabilityDiagnostics {
    const entries = this.list();
    const warnings: string[] = [];
    const byDomain: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const e of entries) {
      byDomain[e.contract.domain] = (byDomain[e.contract.domain] ?? 0) + 1;
      byCategory[e.contract.category] = (byCategory[e.contract.category] ?? 0) + 1;
    }
    const depGraph = this.resolveDependencies();
    for (const d of depGraph) { if (!d.satisfied) warnings.push(`Unsatisfied dependency: "${d.requiredBy}" requires "${d.capabilityId}"`); }
    return { total: entries.length, enabled: entries.filter((e) => e.enabled).length, byDomain, byCategory, dependencyGraph: depGraph, warnings };
  }

  get size(): number { return this.capabilities.size; }
}

export const capabilityRegistry = new CapabilityRegistry();
