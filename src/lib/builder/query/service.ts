import type { ElementId, BuilderPage, BuilderSection, BuilderSlot, BuilderCanvas, DragState, PublishState } from "../types";
import { builderStore } from "../store";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

export interface QueryCacheEntry<T> {
  value: T;
  timestamp: number;
  version: number;
}

export interface QueryDiagnostics {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  slowQueries: { name: string; durationMs: number }[];
}

export class BuilderQueryService {
  private cache = new Map<string, QueryCacheEntry<unknown>>();
  private version = 0;
  private queries = 0;
  private hits = 0;
  private misses = 0;
  private slowQueries: { name: string; durationMs: number }[] = [];

  invalidate(): void { this.version++; this.cache.clear(); }

  private cached<T>(key: string, fn: () => T): T {
    this.queries++;
    const start = performance.now();
    const entry = this.cache.get(key) as QueryCacheEntry<T> | undefined;
    if (entry && entry.version === this.version) { this.hits++; return entry.value; }
    this.misses++;
    const value = fn();
    this.cache.set(key, { value, timestamp: Date.now(), version: this.version });
    const duration = performance.now() - start;
    if (duration > 5) this.slowQueries.push({ name: key, durationMs: Math.round(duration * 100) / 100 });
    platformTelemetry.timer("builder.query", duration);
    return value;
  }

  getCurrentPage(): BuilderPage | null {
    return this.cached("currentPage", () => {
      const page = builderStore.activePage;
      return page ? JSON.parse(JSON.stringify(page)) : null;
    });
  }

  getCanvasHierarchy(): { page: BuilderPage | null; sections: BuilderSection[]; slots: BuilderSlot[] } {
    return this.cached("canvasHierarchy", () => {
      const page = builderStore.activePage;
      if (!page) return { page: null, sections: [], slots: [] };
      const sections = JSON.parse(JSON.stringify(page.sections)) as BuilderSection[];
      const slots = sections.flatMap((s) => s.slots.map((sl) => JSON.parse(JSON.stringify(sl))));
      return { page: JSON.parse(JSON.stringify(page)), sections, slots };
    });
  }

  getSelection(): { ids: ElementId[]; count: number; mode: string } {
    return this.cached("selection", () => ({
      ids: builderStore.getSelectedIds(),
      count: builderStore.selection.selectedIds.size,
      mode: builderStore.selection.mode,
    }));
  }

  getSelectedNode(): { slot: BuilderSlot | null; section: BuilderSection | null } {
    return this.cached("selectedNode", () => {
      const ids = builderStore.getSelectedIds();
      if (ids.length !== 1) return { slot: null, section: null };
      const page = builderStore.activePage;
      if (!page) return { slot: null, section: null };
      for (const section of page.sections) {
        const slot = section.slots.find((s) => s.id === ids[0]);
        if (slot) return { slot: JSON.parse(JSON.stringify(slot)), section: JSON.parse(JSON.stringify(section)) };
      }
      return { slot: null, section: null };
    });
  }

  getVisibleNodes(): BuilderSlot[] {
    return this.cached("visibleNodes", () => {
      const page = builderStore.activePage;
      if (!page) return [];
      return page.sections.flatMap((s) => s.slots.filter((sl) => sl.visible).map((sl) => JSON.parse(JSON.stringify(sl))));
    });
  }

  getHiddenNodes(): BuilderSlot[] {
    return this.cached("hiddenNodes", () => {
      const page = builderStore.activePage;
      if (!page) return [];
      return page.sections.flatMap((s) => s.slots.filter((sl) => !sl.visible).map((sl) => JSON.parse(JSON.stringify(sl))));
    });
  }

  getZoom(): number { return builderStore.canvas.zoom; }

  getDevice(): BuilderCanvas["device"] { return builderStore.canvas.device; }

  getHistoryState(): { canUndo: boolean; canRedo: boolean; isDirty: boolean } {
    return {
      canUndo: builderStore.canUndo,
      canRedo: builderStore.canRedo,
      isDirty: builderStore.isDirty,
    };
  }

  getDragState(): DragState { return builderStore.drag; }

  getPublishState(): { state: PublishState; version: number; publishedAt: string | null } {
    return { state: builderStore.publish.state, version: builderStore.publish.version, publishedAt: builderStore.publish.publishedAt };
  }

  getElementById(id: ElementId): { slot: BuilderSlot | null; section: BuilderSection | null } {
    return this.cached(`element:${id}`, () => {
      for (const page of builderStore.canvas.pages) {
        for (const section of page.sections) {
          const slot = section.slots.find((s) => s.id === id);
          if (slot) return { slot: JSON.parse(JSON.stringify(slot)), section: JSON.parse(JSON.stringify(section)) };
        }
      }
      return { slot: null, section: null };
    });
  }

  getPages(): Array<{ id: string; name: string; slug: string; isHome: boolean }> {
    return builderStore.canvas.pages.map((p) => ({ id: p.id, name: p.name, slug: p.slug, isHome: p.isHome }));
  }

  diagnostics(): QueryDiagnostics {
    return {
      totalQueries: this.queries,
      cacheHits: this.hits,
      cacheMisses: this.misses,
      hitRate: this.queries > 0 ? Math.round((this.hits / this.queries) * 100) / 100 : 0,
      slowQueries: this.slowQueries.slice(-20),
    };
  }
}

export const builderQuery = new BuilderQueryService();
