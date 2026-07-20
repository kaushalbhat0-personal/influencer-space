import type { ConfigLayer, ConfigValue } from "../types";

export interface ResolutionContext {
  tenantId: string;
  keys: string[];
  layers: ConfigLayer[];
  values: Record<string, ConfigValue>;
  sources: Record<string, ConfigLayer>;
  locked: string[];
  metadata: Record<string, unknown>;
  startTime: number;
}

export interface ResolutionMeta {
  name: string;
  priority: number;
  layer: ConfigLayer;
  enabled: boolean;
}

export interface ResolutionMiddleware {
  meta: ResolutionMeta;
  handler(ctx: ResolutionContext): Promise<ResolutionContext>;
}

export interface ResolutionTiming {
  name: string;
  layer: ConfigLayer;
  durationMs: number;
  keysResolved: number;
  error: string | null;
}

export interface ResolutionDiagnostics {
  totalMiddleware: number;
  layersResolved: number;
  keysResolved: number;
  totalDurationMs: number;
  timings: ResolutionTiming[];
  errors: string[];
}
