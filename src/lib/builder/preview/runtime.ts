import type { BuilderSection, BuilderSlot } from "../types";
import type { ResolvedTheme } from "../theme/types";
import { builderQuery } from "../query";
import { builderEvents } from "../events";
import { themeQuery } from "../theme/query";
import { builderStore } from "../store";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

export type PreviewDevice = "mobile" | "tablet" | "desktop";

export interface RenderSlot {
  id: string;
  moduleId: string;
  order: number;
  visible: boolean;
  data: unknown;
  styles: Record<string, string>;
}

export interface RenderSection {
  id: string;
  name: string;
  order: number;
  visible: boolean;
  slots: RenderSlot[];
}

export interface RenderPage {
  id: string;
  name: string;
  slug: string;
  sections: RenderSection[];
}

export interface PreviewState {
  device: PreviewDevice;
  zoom: number;
  pages: RenderPage[];
  theme: ResolvedTheme;
  loadedAt: number;
  renderCount: number;
}

export interface PreviewDiagnostics {
  renderCount: number;
  lastRenderMs: number;
  avgRenderMs: number;
  pagesRendered: number;
  sectionsRendered: number;
  slotsRendered: number;
  themeTokens: number;
  activeEventSubscriptions: number;
  errors: string[];
}

export class PreviewRuntime {
  private state: PreviewState;
  private renderCount = 0;
  private totalRenderMs = 0;
  private lastRenderMs = 0;
  private errors: string[] = [];
  private unsubs: Array<() => void> = [];

  constructor() {
    this.state = this.initialState();
    this.subscribe();
    this.render();
  }

  private initialState(): PreviewState {
    return {
      device: "desktop",
      zoom: 1,
      pages: [],
      theme: {},
      loadedAt: Date.now(),
      renderCount: 0,
    };
  }

  private subscribe(): void {
    const builderEventsList = [
      "node:selected", "node:deselected", "node:inserted", "node:deleted",
      "node:moved" as never, "node:duplicated" as never, "zoom:changed" as never,
      "device:changed" as never, "selection:changed" as never,
    ];
    for (const event of builderEventsList) {
      this.unsubs.push(builderEvents.subscribe(event as never, () => this.render()));
    }
    this.unsubs.push(builderEvents.subscribe("token:changed" as never, () => this.render()));
  }

  render(): PreviewState {
    const start = performance.now();
    this.renderCount++;

    try {
      const hierarchy = builderQuery.getCanvasHierarchy();
      const theme = themeQuery.getResolved();
      const device = builderStore.canvas.device;
      const zoom = builderStore.canvas.zoom;

      const pages: RenderPage[] = hierarchy.page ? [{
        id: hierarchy.page.id, name: hierarchy.page.name, slug: hierarchy.page.slug ?? "/",
        sections: hierarchy.sections.map((s: BuilderSection): RenderSection => ({
          id: s.id, name: s.name, order: s.order, visible: s.visible,
          slots: s.slots.map((sl: BuilderSlot): RenderSlot => ({
            id: sl.id, moduleId: sl.moduleId, order: sl.order, visible: sl.visible,
            data: sl.config ?? {}, styles: this.resolveStyles(sl.moduleId, theme),
          })),
        })),
      }] : [];

      this.state = { device, zoom, pages, theme, loadedAt: this.state.loadedAt, renderCount: this.renderCount };
    } catch (err) {
      this.errors.push(err instanceof Error ? err.message : String(err));
    }

    const duration = performance.now() - start;
    this.lastRenderMs = Math.round(duration * 100) / 100;
    this.totalRenderMs += duration;
    platformTelemetry.timer("builder.preview.render", duration);

    return this.state;
  }

  private resolveStyles(_moduleId: string, theme: ResolvedTheme): Record<string, string> {
    void _moduleId;
    const styles: Record<string, string> = {};
    for (const [key, value] of Object.entries(theme)) {
      if (key.includes("color") || key.includes("space") || key.includes("radius") || key.includes("font")) {
        styles[key] = value;
      }
    }
    return styles;
  }

  getState(): PreviewState { return this.state; }

  getPage(id: string): RenderPage | null { return this.state.pages.find((p) => p.id === id) ?? null; }

  getSection(pageId: string, sectionId: string): RenderSection | null {
    return this.getPage(pageId)?.sections.find((s) => s.id === sectionId) ?? null;
  }

  getSlot(pageId: string, sectionId: string, slotId: string): RenderSlot | null {
    return this.getSection(pageId, sectionId)?.slots.find((s) => s.id === slotId) ?? null;
  }

  destroy(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
  }

  diagnostics(): PreviewDiagnostics {
    let sectionsCount = 0;
    let slotsCount = 0;
    for (const page of this.state.pages) {
      sectionsCount += page.sections.length;
      slotsCount += page.sections.reduce((s, sec) => s + sec.slots.length, 0);
    }
    return {
      renderCount: this.renderCount,
      lastRenderMs: this.lastRenderMs,
      avgRenderMs: this.renderCount > 0 ? Math.round((this.totalRenderMs / this.renderCount) * 100) / 100 : 0,
      pagesRendered: this.state.pages.length,
      sectionsRendered: sectionsCount,
      slotsRendered: slotsCount,
      themeTokens: Object.keys(this.state.theme).length,
      activeEventSubscriptions: this.unsubs.length,
      errors: [...this.errors],
    };
  }
}

export const previewRuntime = new PreviewRuntime();
