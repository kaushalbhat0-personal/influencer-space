/**
 * Content Module Contract v1.0.0
 *
 * Every content module registers a typed manifest describing its public API.
 * Applications consume only module APIs, never internal services or repositories.
 */

import type { Product, CreateProductInput, UpdateProductInput, ProductQuery, ProductDiagnostics } from "./entities/product/types";
export type { GalleryModuleAPI } from "./entities/gallery/manifest";

// ── VERSION ──────────────────────────────────────────────────────────────────

export const CONTENT_MODULE_CONTRACT_VERSION = "1.0.0";

// ── CAPABILITIES ─────────────────────────────────────────────────────────────

export interface ContentModuleCapabilities {
  creatable: boolean;
  updatable: boolean;
  deletable: boolean;
  archivable: boolean;
  restorable: boolean;
  duplicatable: boolean;
  publishable: boolean;
  searchable: boolean;
  sortable: boolean;
  filterable: boolean;
}

// ── PERMISSIONS ──────────────────────────────────────────────────────────────

export interface ContentModulePermissions {
  create: string[];
  read: string[];
  update: string[];
  delete: string[];
  publish: string[];
  admin: string[];
}

// ── EVENTS ───────────────────────────────────────────────────────────────────

export interface ContentModuleEvents {
  created: string;
  updated: string;
  deleted: string;
  published: string;
  archived: string;
  custom: Record<string, string>;
}

// ── METADATA ─────────────────────────────────────────────────────────────────

export interface ContentModuleMetadata {
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
}

// ── DIAGNOSTICS ──────────────────────────────────────────────────────────────

export interface ContentModuleDiagnostics {
  run(): Promise<Record<string, unknown>>;
}

// ── SERIALIZER ───────────────────────────────────────────────────────────────

export interface ContentModuleSerializer {
  serialize(): string;
  deserialize(json: string): { success: boolean; imported: number; error?: string };
}

// ── MIGRATION ────────────────────────────────────────────────────────────────

export interface ContentModuleMigration {
  version: string;
  up(): Promise<void>;
  down(): Promise<void>;
}

// ── MANIFEST ─────────────────────────────────────────────────────────────────

export interface ContentModuleManifest {
  /** Unique module identifier (reverse-DNS format recommended) */
  readonly id: string;
  /** Machine-readable short name */
  readonly name: string;
  /** Semver version */
  readonly version: string;
  /** Human-readable display name */
  readonly displayName: string;
  /** Module description */
  readonly description: string;
  /** Icon name from the design system */
  readonly icon: string;
  /** Business domain category */
  readonly category: string;
  /** Search / filter tags */
  readonly tags: string[];
  /** CRUD and behavior capabilities */
  readonly capabilities: ContentModuleCapabilities;
  /** Role-based permission declarations */
  readonly permissions: ContentModulePermissions;
  /** Event names emitted by this module */
  readonly events: ContentModuleEvents;
  /** Module-level metadata (author, license, links, etc.) */
  readonly metadata: ContentModuleMetadata;
  /** Module diagnostics (optional) */
  readonly diagnostics?: ContentModuleDiagnostics;
  /** Serialization provider (optional) */
  readonly serializer?: ContentModuleSerializer;
  /** Migration provider (optional) */
  readonly migration?: ContentModuleMigration;
  /** Reserved for future extensions */
  readonly extensions?: Record<string, unknown>;
}

// ── REGISTRATION ─────────────────────────────────────────────────────────────

export interface ContentModuleRegistration<TAPI extends ContentModuleAPI = ContentModuleAPI> {
  readonly manifest: ContentModuleManifest;
  readonly factory: () => TAPI;
}

// ── BASE API ─────────────────────────────────────────────────────────────────

export interface ContentModuleAPI {
  readonly manifest: ContentModuleManifest;
}

// ── PRODUCT API ──────────────────────────────────────────────────────────────

export interface ProductModuleAPI extends ContentModuleAPI {
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
  publish(id: string): Promise<Product | null>;
  archive(id: string): Promise<Product | null>;
  findById(id: string): Promise<Product | null>;
  findBySlug(tenantId: string, slug: string): Promise<Product | null>;
  findByTenant(tenantId: string): Promise<Product[]>;
  query(query: ProductQuery): Promise<Product[]>;
  search(tenantId: string, term: string): Promise<Product[]>;
  diagnostics(): Promise<ProductDiagnostics>;
}
