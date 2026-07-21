export type EntityStatus = "draft" | "published" | "archived" | "deleted";

export interface BaseEntity {
  id: string;
  tenantId: string;
  slug: string;
  status: EntityStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface RepositoryQuery {
  tenantId?: string;
  status?: EntityStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface IBaseRepository<T extends BaseEntity> {
  create(entity: T): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  findById(id: string): Promise<T | null>;
  findBySlug(tenantId: string, slug: string): Promise<T | null>;
  findByTenant(tenantId: string): Promise<T[]>;
  query(query: RepositoryQuery): Promise<T[]>;
  count(query?: RepositoryQuery): Promise<number>;
}

export interface EntityDiagnostics {
  total: number;
  draft: number;
  published: number;
  archived: number;
  errors: string[];
}

export interface LifecycleHooks<T extends BaseEntity> {
  beforeCreate?(entity: T): void | Promise<void>;
  afterCreate?(entity: T): void | Promise<void>;
  beforeUpdate?(id: string, data: Partial<T>): void | Promise<void>;
  afterUpdate?(entity: T): void | Promise<void>;
  beforeDelete?(id: string): void | Promise<void>;
  afterDelete?(id: string): void | Promise<void>;
  validate?(entity: T): string[];
}
