import type { ModuleId, ModuleDefinition } from "@/lib/module/types";
import type { SurfaceId } from "@/lib/theme/types";
import type { DesignTokenMap } from "@/lib/theme/types";

export type RenderStatus = "pending" | "loading" | "streaming" | "complete" | "partial" | "failed";

export type ModuleRenderState = "idle" | "loading" | "loaded" | "failed" | "skipped" | "timeout";

export interface RenderContext {
  tenantId: string;
  surface: SurfaceId;
  locale?: string;
  device?: "mobile" | "tablet" | "desktop";
  darkMode?: boolean;
  reducedMotion?: boolean;
  highContrast?: boolean;
  requestId?: string;
  timezone?: string;
}

export interface RenderOptions {
  context: RenderContext;
  modules?: ModuleId[];
  layout?: string;
  timeout?: number;
  abortSignal?: AbortSignal;
  stream?: boolean;
  includeHidden?: boolean;
  validateModules?: boolean;
  collectDiagnostics?: boolean;
}

export interface ModuleRenderSlot {
  moduleId: ModuleId;
  definition: ModuleDefinition;
  state: ModuleRenderState;
  order: number;
  visible: boolean;
  data: unknown;
  error: string | null;
  loadDurationMs: number | null;
  renderDurationMs: number | null;
}

export interface RenderResult {
  status: RenderStatus;
  surface: SurfaceId;
  tenantId: string;
  slots: ModuleRenderSlot[];
  tokens: DesignTokenMap;
  diagnostics: RenderDiagnostics | null;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
}

export interface RenderDiagnostics {
  totalModules: number;
  loadedModules: number;
  failedModules: number;
  skippedModules: number;
  timeoutModules: number;
  slowModules: { moduleId: ModuleId; durationMs: number }[];
  totalDataLoadMs: number;
  totalRenderMs: number;
  surfaceCompatibility: { moduleId: ModuleId; compatible: boolean }[];
  errors: string[];
  warnings: string[];
}

export interface DataLoadOptions {
  timeout?: number;
  abortSignal?: AbortSignal;
  onProgress?: (moduleId: ModuleId, state: ModuleRenderState) => void;
}

export interface LayoutConfig {
  moduleOrder: ModuleId[];
  moduleVisibility: Record<ModuleId, boolean>;
  layoutName: string;
}

export interface ResolvedLayout {
  name: string;
  modules: Array<{ moduleId: ModuleId; order: number; visible: boolean }>;
}

export type ModuleDataLoaderFn = (
  tenantId: string,
  config: Record<string, unknown>,
  context: Record<string, unknown>
) => Promise<unknown>;
