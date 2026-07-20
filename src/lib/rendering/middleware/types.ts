import type { RenderOptions, RenderResult } from "../types";

export type MiddlewarePhase = "before" | "after" | "error";

export interface MiddlewareContext {
  phase: MiddlewarePhase;
  options: RenderOptions;
  result: RenderResult | null;
  error: Error | null;
  startTime: number;
  metadata: Record<string, unknown>;
}

export interface MiddlewareMeta {
  name: string;
  priority: number;
  phase: MiddlewarePhase;
  enabled: boolean;
}

export interface RenderMiddleware {
  meta: MiddlewareMeta;
  handler(ctx: MiddlewareContext): Promise<MiddlewareContext>;
}

export interface MiddlewareTiming {
  name: string;
  phase: MiddlewarePhase;
  durationMs: number;
  error: string | null;
}

export interface MiddlewareDiagnostics {
  totalMiddleware: number;
  beforeCount: number;
  afterCount: number;
  errorCount: number;
  totalDurationMs: number;
  timings: MiddlewareTiming[];
  errors: string[];
}
