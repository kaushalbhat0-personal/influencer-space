import { themeRegistry } from "@/lib/theme/registry";
import { surfaceRegistry } from "@/lib/module/surface-registry";
import { registryFacade } from "@/lib/registry/facade";
import { registryEvents } from "@/lib/registry/events";
import { validateConfig } from "@/lib/config/validation";
import { partnerEngine } from "@/lib/partners/engine";
import { commissionLedger } from "@/lib/commission/ledger";
import { payoutLedger } from "@/lib/payouts/ledger";
import { platformEventBus } from "@/lib/events";
import { notificationService } from "@/lib/notifications";
import { jobRunner } from "@/lib/reliability";
import { purgeOldAuditLogs } from "@/lib/audit";
import type {
  PlatformStatus,
  PhaseTiming,
  StartupReport,
  BootstrapConfig,
  BootstrapHook,
} from "./types";
import { DEFAULT_BOOTSTRAP_CONFIG } from "./types";
import { NEON_DARK_THEME, NEON_DARK_MANIFEST } from "@/lib/theme/default-theme";

function log(...args: unknown[]) {
  if (process.env.DEBUG || process.env.NODE_ENV !== "production") {
    log(...args);
  }
}

export class PlatformBootstrap {
  private status: PlatformStatus = "uninitialized";
  private report: StartupReport | null = null;
  private initialized = false;
  private config: BootstrapConfig;
  private hooksRun = false;

  constructor(config: Partial<BootstrapConfig> = {}) {
    this.config = { ...DEFAULT_BOOTSTRAP_CONFIG, ...config };
  }

  getStatus(): PlatformStatus {
    return this.status;
  }

  getReport(): StartupReport | null {
    return this.report;
  }

  isReady(): boolean {
    return this.status === "ready" || this.status === "degraded";
  }

  async initialize(): Promise<StartupReport> {
    if (this.initialized) {
      return this.report!;
    }

    this.status = "initializing";
    const startedAt = new Date().toISOString();
    const phases: PhaseTiming[] = [];
    let error: string | null = null;

    try {
      await this.executePhase("config-validation", phases, () => {
        const result = validateConfig();
        if (!result.ok) {
          console.warn(`[Bootstrap] Config validation: ${result.errors.length} issues found`);
          for (const err of result.errors) console.warn(`  [Config] ${err}`);
        } else {
          log(`[Bootstrap] Config validation: ${result.checks.filter((c) => c.present).length}/${result.checks.length} vars present`);
        }
      });

      await this.executePhase("theme-registry", phases, () => {
        if (this.config.autoRegisterDefaults) {
          themeRegistry.register(NEON_DARK_THEME, NEON_DARK_MANIFEST, "platform");
        }
      });

      await this.executePhase("surface-registry", phases, () => {
        // Surface definitions are auto-registered in constructor
      });

      await this.executePhase("module-registry", phases, () => {
        // Modules registered via discover() — deferred to application layer
      });

      await this.executePhase("partner-engine", phases, async () => {
        const counts = await partnerEngine.initialize();
        log(`[Bootstrap] PartnerEngine: ${counts.partners} partners, ${counts.members} members, ${counts.assignments} assignments, ${counts.invites} invites`);
      });

      await this.executePhase("commission-engine", phases, async () => {
        const counts = await commissionLedger.initialize();
        log(`[Bootstrap] CommissionEngine: ${counts.entries} ledger entries`);
      });

      await this.executePhase("payout-engine", phases, async () => {
        const counts = await payoutLedger.initialize();
        log(`[Bootstrap] PayoutEngine: ${counts.batches} batches`);
      });

      await this.executePhase("event-bus", phases, async () => {
        await platformEventBus.initialize();
        const history = platformEventBus.getHistory();
        log(`[Bootstrap] PlatformEventBus: ${history.length} events`);
      });

      await this.executePhase("notifications", phases, async () => {
        notificationService.start();
        log(`[Bootstrap] NotificationService: started`);
      });

      await this.executePhase("jobs", phases, async () => {
        jobRunner.register({
          id: "expire-invites",
          name: "Expire Stale Partner Invites",
          intervalMs: 3600000,
          execute: async () => { const c = await partnerEngine.expireStaleInvites(); if (c > 0) log(`[Job] Expired ${c} stale invites`); },
        });
        jobRunner.register({
          id: "cleanup-audit",
          name: "Cleanup Old Audit Logs",
          intervalMs: 86400000,
          execute: async () => { const r = await purgeOldAuditLogs(90); if (r.deleted > 0) log(`[Job] Purged ${r.deleted} old audit logs`); },
        });
        jobRunner.start();
        log(`[Bootstrap] JobRunner: ${jobRunner.getStatus().length} jobs scheduled`);
      });

      const validation: NonNullable<StartupReport["validation"]> | null =
        this.config.runValidation
          ? await this.runTimedValidation(phases)
          : null;

      const diagnostics: NonNullable<StartupReport["diagnostics"]> | null =
        this.config.runDiagnostics
          ? await this.runTimedDiagnostics(phases)
          : null;

      await this.runStartupHooks();

      const hasPhaseFailures = phases.some((p) => p.status === "failed");
      const hasValidationIssues =
        validation !== null &&
        (validation.modulesWithErrors > 0 ||
          validation.themesWithErrors > 0);

      if (hasPhaseFailures) {
        this.status = "degraded";
      } else if (hasValidationIssues) {
        this.status = "degraded";
      } else {
        this.status = "ready";
      }

      const completedAt = new Date().toISOString();
      const totalDurationMs = Date.now() - new Date(startedAt).getTime();

      log(`[Bootstrap] Platform ready in ${totalDurationMs}ms`);
      for (const phase of phases) {
        if (phase.durationMs !== null) {
          log(`  ${phase.phase}: ${phase.durationMs}ms (${phase.status})`);
        }
      }

      this.report = {
        status: this.status,
        startedAt,
        completedAt,
        totalDurationMs,
        phases,
        diagnostics: diagnostics ?? null,
        validation: validation ?? null,
        error: null,
      };

      this.initialized = true;

      return this.report;
    } catch (err) {
      this.status = "failed";
      error = err instanceof Error ? err.message : String(err);

      this.report = {
        status: this.status,
        startedAt,
        completedAt: new Date().toISOString(),
        totalDurationMs: Date.now() - new Date(startedAt).getTime(),
        phases,
        diagnostics: null,
        validation: null,
        error,
      };

      return this.report;
    }
  }

  async shutdown(): Promise<void> {
    this.status = "shutdown";
    jobRunner.stop();
    await this.runShutdownHooks();
    registryEvents.destroy();
    this.initialized = false;
    this.hooksRun = false;
  }

  reset(): void {
    this.status = "uninitialized";
    this.report = null;
    this.initialized = false;
    this.hooksRun = false;
  }

  validate(): NonNullable<StartupReport["validation"]> {
    return this.runValidation();
  }

  diagnostics(): NonNullable<StartupReport["diagnostics"]> {
    return this.runDiagnostics();
  }

  onStartup(hook: BootstrapHook): void {
    this.config.startupHooks.push(hook);
  }

  onShutdown(hook: BootstrapHook): void {
    this.config.shutdownHooks.push(hook);
  }

  private async executePhase(
    name: string,
    phases: PhaseTiming[],
    fn: () => void | Promise<void>
  ): Promise<void> {
    const phase: PhaseTiming = {
      phase: name,
      status: "running",
      startedAt: Date.now(),
      completedAt: null,
      durationMs: null,
      error: null,
    };
    phases.push(phase);

    try {
      const promise = fn();
      if (promise instanceof Promise) {
        await promise;
      }
      phase.status = "completed";
    } catch (err) {
      phase.status = "failed";
      phase.error = err instanceof Error ? err.message : String(err);
    }

    phase.completedAt = Date.now();
    phase.durationMs = phase.completedAt - (phase.startedAt ?? phase.completedAt);
  }

  private async runStartupHooks(): Promise<void> {
    if (this.hooksRun) return;

    for (const hook of this.config.startupHooks) {
      try {
        const result = hook();
        if (result instanceof Promise) {
          await result;
        }
      } catch (err) {
        console.error("[PlatformBootstrap] Startup hook failed:", err);
      }
    }

    this.hooksRun = true;
  }

  private async runShutdownHooks(): Promise<void> {
    for (const hook of this.config.shutdownHooks) {
      try {
        const result = hook();
        if (result instanceof Promise) {
          await result;
        }
      } catch (err) {
        console.error("[PlatformBootstrap] Shutdown hook failed:", err);
      }
    }
  }

  private async runTimedValidation(
    phases: PhaseTiming[]
  ): Promise<NonNullable<StartupReport["validation"]>> {
    let result: NonNullable<StartupReport["validation"]> | null = null;
    await this.executePhase("validation", phases, () => {
      result = this.runValidation();
    });
    return result!;
  }

  private async runTimedDiagnostics(
    phases: PhaseTiming[]
  ): Promise<NonNullable<StartupReport["diagnostics"]>> {
    let result: NonNullable<StartupReport["diagnostics"]> | null = null;
    await this.executePhase("diagnostics", phases, () => {
      result = this.runDiagnostics();
    });
    return result!;
  }

  private runValidation(): NonNullable<StartupReport["validation"]> {
    const themeIds = themeRegistry.listIds();
    let themesValid = 0;
    let themesWithErrors = 0;

    for (const id of themeIds) {
      const result = themeRegistry.validate(id);
      if (result && result.valid) themesValid++;
      else themesWithErrors++;
    }

    const moduleIds = registryFacade.module.listIds();
    let modulesValid = 0;
    let modulesWithErrors = 0;

    for (const id of moduleIds) {
      const result = registryFacade.module.validate(id);
      if (result && result.valid) modulesValid++;
      else modulesWithErrors++;
    }

    const allSurfaceIds = new Set<string>();
    for (const id of moduleIds) {
      const entry = registryFacade.module.get(id);
      if (entry) {
        for (const s of entry.definition.surfaces.supported) {
          allSurfaceIds.add(s.surfaceId);
        }
      }
    }

    const surfaceResult = surfaceRegistry.validate(Array.from(allSurfaceIds));

    return {
      themesValid,
      themesWithErrors,
      modulesValid,
      modulesWithErrors,
      surfacesValid: surfaceResult.valid,
    };
  }

  private runDiagnostics(): NonNullable<StartupReport["diagnostics"]> {
    return registryFacade.diagnostics.getSummary();
  }
}

export const platformBootstrap = new PlatformBootstrap();
