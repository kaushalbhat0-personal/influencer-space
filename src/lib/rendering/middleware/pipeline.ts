import type { RenderMiddleware, MiddlewareContext, MiddlewarePhase, MiddlewareTiming, MiddlewareDiagnostics } from "./types";

export class MiddlewarePipeline {
  private middleware: RenderMiddleware[] = [];
  private timing: MiddlewareTiming[] = [];

  register(middleware: RenderMiddleware): void {
    const existing = this.middleware.findIndex((m) => m.meta.name === middleware.meta.name);
    if (existing >= 0) {
      this.middleware[existing] = middleware;
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

  get(name: string): RenderMiddleware | undefined {
    return this.middleware.find((m) => m.meta.name === name);
  }

  list(): RenderMiddleware[] {
    return [...this.middleware];
  }

  clear(): void {
    this.middleware = [];
    this.timing = [];
  }

  async execute(
    phase: MiddlewarePhase,
    ctx: MiddlewareContext
  ): Promise<MiddlewareContext> {
    let current = ctx;
    const applicable = this.middleware.filter(
      (m) => m.meta.phase === phase && m.meta.enabled
    );

    for (const mw of applicable) {
      const start = performance.now();
      try {
        current = await mw.handler(current);
        this.timing.push({
          name: mw.meta.name,
          phase,
          durationMs: Math.round((performance.now() - start) * 100) / 100,
          error: null,
        });
      } catch (err) {
        const duration = Math.round((performance.now() - start) * 100) / 100;
        this.timing.push({
          name: mw.meta.name,
          phase,
          durationMs: duration,
          error: err instanceof Error ? err.message : String(err),
        });
        if (phase === "before") {
          throw err;
        }
      }
    }

    return current;
  }

  getDiagnostics(): MiddlewareDiagnostics {
    const beforeCount = this.middleware.filter((m) => m.meta.phase === "before").length;
    const afterCount = this.middleware.filter((m) => m.meta.phase === "after").length;
    const errorCount = this.middleware.filter((m) => m.meta.phase === "error").length;
    const totalDuration = this.timing.reduce((s, t) => s + t.durationMs, 0);
    const errors = this.timing.filter((t) => t.error).map((t) => `[${t.name}] ${t.error}`);

    return {
      totalMiddleware: this.middleware.length,
      beforeCount,
      afterCount,
      errorCount,
      totalDurationMs: Math.round(totalDuration * 100) / 100,
      timings: [...this.timing],
      errors,
    };
  }

  resetTimings(): void {
    this.timing = [];
  }
}
