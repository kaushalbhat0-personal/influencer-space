import type { SurfaceId } from "@/lib/theme/types";
import { registryEvents } from "@/lib/registry/events";
import {
  type ISnapshotable,
  type RegistrySnapshot,
  createSnapshotMetadata,
} from "@/lib/registry/snapshot";
import { RegistryCache } from "@/lib/registry/cache";

export interface SurfaceDefinition {
  id: SurfaceId;
  name: string;
  description: string;
  interactive: boolean;
  streaming: boolean;
  cacheable: boolean;
  dimensions: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  mediaSupport: ("image" | "video" | "text" | "embed" | "audio")[];
  requiresAuth: boolean;
  requiresTenant: boolean;
  platformVersion: string;
}

export const SURFACE_DEFINITIONS: Record<SurfaceId, SurfaceDefinition> = {
  website: {
    id: "website",
    name: "Public Website",
    description: "Creator's public storefront rendered as HTML",
    interactive: true,
    streaming: true,
    cacheable: true,
    dimensions: { minWidth: 320, maxHeight: undefined },
    mediaSupport: ["image", "video", "text", "embed"],
    requiresAuth: false,
    requiresTenant: true,
    platformVersion: "1.0.0",
  },
  website_preview: {
    id: "website_preview",
    name: "Preview Shell",
    description: "Admin preview of the public website",
    interactive: true,
    streaming: false,
    cacheable: false,
    dimensions: { minWidth: 320, maxWidth: 1200 },
    mediaSupport: ["image", "video", "text", "embed"],
    requiresAuth: true,
    requiresTenant: true,
    platformVersion: "1.0.0",
  },
  mobile_app: {
    id: "mobile_app",
    name: "Mobile App",
    description: "Native mobile application surface",
    interactive: true,
    streaming: false,
    cacheable: true,
    dimensions: { minWidth: 320, maxWidth: 428 },
    mediaSupport: ["image", "video", "text", "embed"],
    requiresAuth: true,
    requiresTenant: true,
    platformVersion: "2.0.0",
  },
  embed_widget: {
    id: "embed_widget",
    name: "Embed Widget",
    description: "Embeddable widget for external websites",
    interactive: true,
    streaming: false,
    cacheable: true,
    dimensions: { minWidth: 280, maxWidth: 800 },
    mediaSupport: ["image", "text", "embed"],
    requiresAuth: false,
    requiresTenant: true,
    platformVersion: "1.0.0",
  },
  api_rest: {
    id: "api_rest",
    name: "REST API",
    description: "JSON REST endpoint",
    interactive: false,
    streaming: false,
    cacheable: true,
    dimensions: {},
    mediaSupport: ["text"],
    requiresAuth: true,
    requiresTenant: true,
    platformVersion: "1.0.0",
  },
  pdf_export: {
    id: "pdf_export",
    name: "PDF Export",
    description: "Server-rendered PDF document",
    interactive: false,
    streaming: false,
    cacheable: true,
    dimensions: { minWidth: 595, maxWidth: 595 },
    mediaSupport: ["image", "text"],
    requiresAuth: false,
    requiresTenant: true,
    platformVersion: "1.0.0",
  },
  email_template: {
    id: "email_template",
    name: "Email Template",
    description: "HTML email rendering",
    interactive: false,
    streaming: false,
    cacheable: false,
    dimensions: { maxWidth: 600 },
    mediaSupport: ["image", "text"],
    requiresAuth: false,
    requiresTenant: true,
    platformVersion: "1.0.0",
  },
  admin_panel: {
    id: "admin_panel",
    name: "Admin Panel",
    description: "Creator dashboard editor",
    interactive: true,
    streaming: false,
    cacheable: false,
    dimensions: { minWidth: 768 },
    mediaSupport: ["image", "video", "text", "embed"],
    requiresAuth: true,
    requiresTenant: true,
    platformVersion: "1.0.0",
  },
  agency_preview: {
    id: "agency_preview",
    name: "Agency Preview",
    description: "Agency dashboard preview of creator sites",
    interactive: true,
    streaming: false,
    cacheable: false,
    dimensions: { minWidth: 320, maxWidth: 1200 },
    mediaSupport: ["image", "video", "text", "embed"],
    requiresAuth: true,
    requiresTenant: true,
    platformVersion: "1.0.0",
  },
  ai_context: {
    id: "ai_context",
    name: "AI Context",
    description: "LLM-readable module description and data",
    interactive: false,
    streaming: false,
    cacheable: true,
    dimensions: {},
    mediaSupport: ["text"],
    requiresAuth: false,
    requiresTenant: true,
    platformVersion: "1.0.0",
  },
  cron_job: {
    id: "cron_job",
    name: "Scheduled Job",
    description: "Recurring background execution",
    interactive: false,
    streaming: false,
    cacheable: false,
    dimensions: {},
    mediaSupport: ["text"],
    requiresAuth: true,
    requiresTenant: true,
    platformVersion: "1.0.0",
  },
} as const;

Object.freeze(SURFACE_DEFINITIONS);

export interface SurfaceValidationError {
  surfaceId: string;
  message: string;
}

export interface SurfaceValidationResult {
  valid: boolean;
  errors: SurfaceValidationError[];
}

interface SurfaceSnapshotItem {
  id: string;
  name: string;
  interactive: boolean;
  streaming: boolean;
  cacheable: boolean;
  mediaSupport: string[];
  platformVersion: string;
}

export class SurfaceRegistry implements ISnapshotable<SurfaceDefinition> {
  private surfaces = new Map<SurfaceId, SurfaceDefinition>();
  private queryCache = new RegistryCache<SurfaceDefinition[]>("surface:query");

  constructor() {
    for (const [id, definition] of Object.entries(SURFACE_DEFINITIONS)) {
      this.surfaces.set(id as SurfaceId, { ...definition });
    }
  }

  register(surface: SurfaceDefinition): { success: boolean; error?: string } {
    if (this.surfaces.has(surface.id)) {
      return { success: false, error: `Surface "${surface.id}" is already registered` };
    }

    if (!surface.id || surface.id.trim().length === 0) {
      return { success: false, error: "Surface ID is required" };
    }

    this.surfaces.set(surface.id, Object.freeze({ ...surface }));
    this.queryCache.clear();

    registryEvents.emit("surface:registered", {
      surfaceId: surface.id,
      surfaceName: surface.name,
    });

    return { success: true };
  }

  unregister(id: SurfaceId): boolean {
    const deleted = this.surfaces.delete(id);
    if (deleted) {
      this.queryCache.clear();
      registryEvents.emit("surface:removed", { surfaceId: id });
    }
    return deleted;
  }

  get(id: SurfaceId): SurfaceDefinition | null {
    return this.surfaces.get(id) ?? null;
  }

  list(): SurfaceDefinition[] {
    const cached = this.queryCache.get("all");
    if (cached) return cached;

    const result = Array.from(this.surfaces.values());
    this.queryCache.set("all", result);
    return result;
  }

  has(id: string): boolean {
    return this.surfaces.has(id as SurfaceId);
  }

  validate(surfaceIds: string[]): SurfaceValidationResult {
    const errors: SurfaceValidationError[] = [];

    for (const id of surfaceIds) {
      if (!this.surfaces.has(id as SurfaceId)) {
        errors.push({ surfaceId: id, message: `Surface "${id}" is not registered` });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  getInteractiveSurfaces(): SurfaceDefinition[] {
    return this.list().filter((s) => s.interactive);
  }

  getNonInteractiveSurfaces(): SurfaceDefinition[] {
    return this.list().filter((s) => !s.interactive);
  }

  get size(): number {
    return this.surfaces.size;
  }

  snapshot(): RegistrySnapshot<SurfaceDefinition> {
    const items: Record<string, SurfaceDefinition> = {};
    for (const [id, def] of Array.from(this.surfaces.entries())) {
      items[id] = { ...def };
    }

    return {
      metadata: createSnapshotMetadata("surface", "platform"),
      items,
      stats: {
        totalItems: this.surfaces.size,
        snapshotSize: JSON.stringify(items).length,
      },
    };
  }

  serialize(): string {
    return JSON.stringify(this.snapshot(), null, 2);
  }

  deserialize(raw: string): RegistrySnapshot<SurfaceDefinition> | null {
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.metadata || !parsed.items) return null;
      return parsed as RegistrySnapshot<SurfaceDefinition>;
    } catch {
      return null;
    }
  }

  export(): Record<string, unknown> {
    const snapshot = this.snapshot();
    const exportedItems: Record<string, SurfaceSnapshotItem> = {};

    for (const [id, def] of Object.entries(snapshot.items)) {
      exportedItems[id] = {
        id: def.id,
        name: def.name,
        interactive: def.interactive,
        streaming: def.streaming,
        cacheable: def.cacheable,
        mediaSupport: def.mediaSupport,
        platformVersion: def.platformVersion,
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

    const items = data.items as Record<string, SurfaceSnapshotItem> | undefined;
    if (!items) {
      return { success: false, imported: 0, errors: ["No items found in import data"] };
    }

    for (const id of Object.keys(items)) {
      try {
        const existing = this.surfaces.get(id as SurfaceId);
        if (existing) {
          imported++;
        } else {
          errors.push(`Surface "${id}" not found for import`);
        }
      } catch (err) {
        errors.push(`Failed to import surface "${id}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    registryEvents.emit("snapshot:imported", {
      registryType: "surface",
      itemCount: imported,
    });

    return { success: errors.length === 0, imported, errors };
  }

  get cacheStats() {
    return this.queryCache.stats();
  }
}

export const surfaceRegistry = new SurfaceRegistry();
