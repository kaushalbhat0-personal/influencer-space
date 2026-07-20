import type { DomainId } from "@/lib/module/types";
import type { DomainContract, DomainEntry, DomainDependency, DomainDiagnostics } from "./types";

export class DomainRegistry {
  private domains = new Map<DomainId, DomainEntry>();

  register(contract: DomainContract): { success: boolean; error?: string } {
    if (this.domains.has(contract.id)) return { success: false, error: `Domain "${contract.id}" already registered` };
    this.domains.set(contract.id, { contract, registeredAt: new Date().toISOString(), metadata: {} });
    return { success: true };
  }

  unregister(id: DomainId): boolean { return this.domains.delete(id); }
  get(id: DomainId): DomainEntry | null { return this.domains.get(id) ?? null; }
  list(): DomainEntry[] { return Array.from(this.domains.values()); }
  listIds(): DomainId[] { return Array.from(this.domains.keys()); }

  resolveDependencies(): DomainDependency[] {
    const deps: DomainDependency[] = [];
    for (const [id, entry] of Array.from(this.domains.entries())) {
      for (const dep of entry.contract.dependencies) deps.push({ from: id, to: dep, valid: this.domains.has(dep) });
    }
    return deps;
  }

  detectCycles(): DomainId[][] {
    const cycles: DomainId[][] = [];
    const visited = new Set<DomainId>();
    const inStack = new Set<DomainId>();
    const stack: DomainId[] = [];
    const dfs = (id: DomainId): void => {
      if (inStack.has(id)) { cycles.push([...stack.slice(stack.indexOf(id)), id]); return; }
      if (visited.has(id)) return;
      visited.add(id); inStack.add(id); stack.push(id);
      const entry = this.domains.get(id);
      if (entry) for (const dep of entry.contract.dependencies) dfs(dep as DomainId);
      stack.pop(); inStack.delete(id);
    };
    for (const id of this.listIds()) dfs(id);
    return cycles;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const d of this.resolveDependencies()) { if (!d.valid) errors.push(`Domain "${d.from}" depends on unregistered domain "${d.to}"`); }
    for (const c of this.detectCycles()) errors.push(`Circular dependency: ${c.join(" → ")}`);
    return { valid: errors.length === 0, errors };
  }

  diagnostics(): DomainDiagnostics {
    const deps = this.resolveDependencies();
    const cycles = this.detectCycles();
    const allIds = new Set(this.listIds());
    const referenced = new Set(deps.map((d) => d.from));
    const orphanIds = Array.from(allIds).filter((id) => !referenced.has(id) && deps.filter((d) => d.to === id).length === 0);
    return { total: this.domains.size, dependencies: deps, circularReferences: cycles, orphanDomains: orphanIds, warnings: deps.filter((d) => !d.valid).map((d) => `Unregistered dependency: ${d.to}`) };
  }

  get size(): number { return this.domains.size; }
}

export const domainRegistry = new DomainRegistry();
