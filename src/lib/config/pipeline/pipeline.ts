import type { ResolutionMiddleware, ResolutionContext, ResolutionTiming, ResolutionDiagnostics } from "./types";

export class ResolutionPipeline {
  private middleware: ResolutionMiddleware[] = [];
  private timing: ResolutionTiming[] = [];

  register(middleware: ResolutionMiddleware): void {
    const idx = this.middleware.findIndex((m) => m.meta.name === middleware.meta.name);
    if (idx >= 0) {
      this.middleware[idx] = middleware;
    } else {
      this.middleware.push(middleware);
    }
    this.middleware.sort((a, b) => a.meta.priority - b.meta.priority);
  }

  unregister(name: string): boolean {
    const idx = this.middleware.findIndex((m) => m.meta.name === name);
    if (idx >= 0) {
      this.middleware.splice(idx, 1);
      return true;
    }
    return false;
  }

  list(): ResolutionMiddleware[] {
    return [...this.middleware];
  }

  clear(): void {
    this.middleware = [];
    this.timing = [];
  }

  async resolve(ctx: ResolutionContext): Promise<ResolutionContext> {
    let current = ctx;
    const applicable = this.middleware.filter((m) => m.meta.enabled);

    for (const mw of applicable) {
      const start = performance.now();
      const beforeCount = Object.keys(current.values).length;
      try {
        current = await mw.handler(current);
        const afterCount = Object.keys(current.values).length;
        this.timing.push({
          name: mw.meta.name,
          layer: mw.meta.layer,
          durationMs: Math.round((performance.now() - start) * 100) / 100,
          keysResolved: afterCount - beforeCount,
          error: null,
        });
      } catch (err) {
        this.timing.push({
          name: mw.meta.name,
          layer: mw.meta.layer,
          durationMs: Math.round((performance.now() - start) * 100) / 100,
          keysResolved: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return current;
  }

  getDiagnostics(): ResolutionDiagnostics {
    const layers = new Set(this.timing.map((t) => t.layer));
    const keysResolved = this.timing.reduce((s, t) => s + t.keysResolved, 0);
    const totalDuration = this.timing.reduce((s, t) => s + t.durationMs, 0);
    const errors = this.timing.filter((t) => t.error).map((t) => `[${t.name}] ${t.error}`);

    return {
      totalMiddleware: this.middleware.length,
      layersResolved: layers.size,
      keysResolved,
      totalDurationMs: Math.round(totalDuration * 100) / 100,
      timings: [...this.timing],
      errors,
    };
  }

  resetTimings(): void {
    this.timing = [];
  }
}
