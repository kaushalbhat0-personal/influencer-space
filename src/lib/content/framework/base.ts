import type { BaseEntity, RepositoryQuery, IBaseRepository, LifecycleHooks, EntityDiagnostics } from "./types";

let uidCounter = Date.now();
export function generateId(prefix: string): string { return `${prefix}_${++uidCounter}`; }

export class InMemoryBaseRepository<T extends BaseEntity> implements IBaseRepository<T> {
  protected entities = new Map<string, T>();

  async create(entity: T): Promise<T> {
    const e = { ...entity, id: entity.id || generateId("ent"), version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    this.entities.set(e.id, e);
    return e;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const existing = this.entities.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...data, version: existing.version + 1, updatedAt: new Date().toISOString() } as T;
    this.entities.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> { return this.entities.delete(id); }
  async findById(id: string): Promise<T | null> { return this.entities.get(id) ?? null; }

  async findBySlug(tenantId: string, slug: string): Promise<T | null> {
    for (const e of Array.from(this.entities.values())) { if (e.tenantId === tenantId && e.slug === slug) return e; }
    return null;
  }

  async findByTenant(tenantId: string): Promise<T[]> {
    return Array.from(this.entities.values()).filter((e) => e.tenantId === tenantId);
  }

  async query(query: RepositoryQuery): Promise<T[]> {
    let results = Array.from(this.entities.values());
    if (query.tenantId) results = results.filter((e) => e.tenantId === query.tenantId);
    if (query.status) results = results.filter((e) => e.status === query.status);
    if (query.search) {
      const s = query.search.toLowerCase();
      results = results.filter((e) => JSON.stringify(e).toLowerCase().includes(s));
    }
    if (query.sortBy) {
      results.sort((a, b) => {
        const av = ((a as unknown as Record<string, unknown>)[query.sortBy!] as string) ?? "";
        const bv = ((b as unknown as Record<string, unknown>)[query.sortBy!] as string) ?? "";
        return query.sortOrder === "desc" ? bv.localeCompare(av) : av.localeCompare(bv);
      });
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return results.slice((page - 1) * limit, page * limit);
  }

  async count(query?: RepositoryQuery): Promise<number> {
    const results = query ? await this.query(query) : Array.from(this.entities.values());
    return results.length;
  }
}

export abstract class BaseApplicationService<T extends BaseEntity> {
  constructor(protected repo: IBaseRepository<T>, protected lifecycle: LifecycleHooks<T> = {}) {}

  async create(entity: T): Promise<T> {
    await this.lifecycle.beforeCreate?.(entity);
    const created = await this.repo.create(entity);
    await this.lifecycle.afterCreate?.(created);
    return created;
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    await this.lifecycle.beforeUpdate?.(id, data);
    const updated = await this.repo.update(id, data);
    if (updated) await this.lifecycle.afterUpdate?.(updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    await this.lifecycle.beforeDelete?.(id);
    const deleted = await this.repo.delete(id);
    if (deleted) await this.lifecycle.afterDelete?.(id);
    return deleted;
  }

  async findById(id: string): Promise<T | null> { return this.repo.findById(id); }
  async findBySlug(tenantId: string, slug: string): Promise<T | null> { return this.repo.findBySlug(tenantId, slug); }
  async findByTenant(tenantId: string): Promise<T[]> { return this.repo.findByTenant(tenantId); }
  async query(query: RepositoryQuery): Promise<T[]> { return this.repo.query(query); }

  async diagnostics(): Promise<EntityDiagnostics> {
    const all = await this.repo.query({});
    return { total: all.length, draft: all.filter((e) => e.status === "draft").length, published: all.filter((e) => e.status === "published").length, archived: all.filter((e) => e.status === "archived").length, errors: [] };
  }
}
