import { partnerEngine } from "@/lib/partners/engine";
import { commissionLedger } from "@/lib/commission/ledger";
import { payoutLedger } from "@/lib/payouts/ledger";
import { platformEventBus } from "@/lib/events";
import { jobRunner } from "./jobs";
import { idempotencyService } from "./idempotency";
import { getPlatformHealth } from "./health";
import { platformBootstrap } from "@/lib/platform/bootstrap";

export interface DiagnosticsReport {
  initialized: Record<string, boolean>;
  cacheSizes: Record<string, number>;
  engineStatus: string;
  jobs: Array<{ id: string; name: string; lastRunAt: number | null; running: boolean }>;
  idempotency: { keysTracked: number };
  health: Awaited<ReturnType<typeof getPlatformHealth>>;
  startup?: {
    status: string;
    totalDurationMs: number | null;
    phases: Array<{ name: string; durationMs: number | null; status: string }>;
  };
}

export async function getDiagnostics(): Promise<DiagnosticsReport> {
  const health = await getPlatformHealth();
  const report = platformBootstrap.getReport();

  return {
    initialized: {
      partnerEngine: true,
      commissionEngine: true,
      payoutEngine: true,
      eventBus: true,
      notificationService: true,
    },
    cacheSizes: {
      partners: partnerEngine.listPartners().length,
      commissionEntries: commissionLedger.getAllEntries().length,
      payoutBatches: payoutLedger.getAllBatches().length,
      eventHistory: platformEventBus.getHistory().length,
      idempotencyKeys: idempotencyService.size,
    },
    engineStatus: health.status === "ok" ? "healthy" : health.status === "degraded" ? "degraded" : "error",
    jobs: jobRunner.getStatus().map((j) => ({ id: j.id, name: j.name, lastRunAt: j.lastRunAt, running: j.running })),
    idempotency: { keysTracked: idempotencyService.size },
    health,
    startup: report ? {
      status: report.status,
      totalDurationMs: report.totalDurationMs,
      phases: report.phases.map((p) => ({ name: p.phase, durationMs: p.durationMs, status: p.status })),
    } : undefined,
  };
}
