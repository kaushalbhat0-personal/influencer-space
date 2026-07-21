import type { ContentEntity, ContentEntityRegistration, ContentEntityType, ContentQuery } from "./types";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

export class ContentRegistry {
  private entityTypes = new Map<ContentEntityType, ContentEntityRegistration>();
  private entities = new Map<string, ContentEntity>();

  registerType(registration: ContentEntityRegistration): { success: boolean; error?: string } {
    if (this.entityTypes.has(registration.type)) return { success: false, error: `Entity type "${registration.type}" already registered` };
    this.entityTypes.set(registration.type, { ...registration });
    platformTelemetry.counter("content.registry.type.registered", 1, { type: registration.type });
    return { success: true };
  }

  getType(type: ContentEntityType): ContentEntityRegistration | null { return this.entityTypes.get(type) ?? null; }
  listTypes(): ContentEntityRegistration[] { return Array.from(this.entityTypes.values()); }

  register(entity: ContentEntity): void {
    this.entities.set(entity.id, { ...entity });
    platformTelemetry.counter("content.registry.entity.created", 1, { type: entity.type });
  }

  update(id: string, updates: Partial<ContentEntity>): ContentEntity | null {
    const existing = this.entities.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, version: existing.version + 1, updatedAt: new Date().toISOString() };
    this.entities.set(id, updated);
    return updated;
  }

  delete(id: string): boolean { return this.entities.delete(id); }

  get(id: string): ContentEntity | null { return this.entities.get(id) ?? null; }
  getBySlug(tenantId: string, slug: string): ContentEntity | null {
    for (const entity of Array.from(this.entities.values())) { if (entity.tenantId === tenantId && entity.slug === slug) return entity; }
    return null;
  }

  query(query: ContentQuery): ContentEntity[] {
    let results = Array.from(this.entities.values());
    if (query.tenantId) results = results.filter((e) => e.tenantId === query.tenantId);
    if (query.type) results = results.filter((e) => e.type === query.type);
    if (query.status) results = results.filter((e) => e.status === query.status);
    if (query.visibility) results = results.filter((e) => e.visibility === query.visibility);
    if (query.tags && query.tags.length > 0) results = results.filter((e) => query.tags!.some((t) => e.tags.includes(t)));
    if (query.search) {
      const s = query.search.toLowerCase();
      results = results.filter((e) => JSON.stringify(e.data).toLowerCase().includes(s) || e.slug.toLowerCase().includes(s));
    }
    if (query.sortBy) {
      results.sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[query.sortBy!] as string ?? "";
        const bv = (b as unknown as Record<string, unknown>)[query.sortBy!] as string ?? "";
        return query.sortOrder === "desc" ? bv.localeCompare(av) : av.localeCompare(bv);
      });
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return results.slice((page - 1) * limit, page * limit);
  }

  count(query?: ContentQuery): number { return this.query(query ?? {}).length; }
  getAll(): ContentEntity[] { return Array.from(this.entities.values()); }

  get size(): number { return this.entities.size; }
  get typeCount(): number { return this.entityTypes.size; }
}

export const contentRegistry = new ContentRegistry();
