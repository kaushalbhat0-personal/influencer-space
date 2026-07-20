export type PlatformStatus = "uninitialized" | "initializing" | "ready" | "degraded" | "failed" | "shutdown";

export type PhaseStatus = "pending" | "running" | "completed" | "skipped" | "failed";

export interface PhaseTiming {
  phase: string;
  status: PhaseStatus;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
  error: string | null;
}

export interface StartupReport {
  status: PlatformStatus;
  startedAt: string;
  completedAt: string | null;
  totalDurationMs: number | null;
  phases: PhaseTiming[];
  diagnostics: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
    averageScore: number;
  } | null;
  validation: {
    themesValid: number;
    themesWithErrors: number;
    modulesValid: number;
    modulesWithErrors: number;
    surfacesValid: boolean;
  } | null;
  error: string | null;
}

export interface BootstrapConfig {
  autoRegisterDefaults: boolean;
  runDiagnostics: boolean;
  runValidation: boolean;
  startupHooks: Array<() => void | Promise<void>>;
  shutdownHooks: Array<() => void | Promise<void>>;
  timeout: number;
}

export type BootstrapHook = () => void | Promise<void>;

export const DEFAULT_BOOTSTRAP_CONFIG: BootstrapConfig = {
  autoRegisterDefaults: true,
  runDiagnostics: true,
  runValidation: true,
  startupHooks: [],
  shutdownHooks: [],
  timeout: 30000,
};
