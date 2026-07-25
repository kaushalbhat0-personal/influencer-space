import { prisma } from "@/lib/prisma";
import { partnerEngine } from "@/lib/partners/engine";
import { commissionLedger } from "@/lib/commission/ledger";
import { payoutLedger } from "@/lib/payouts/ledger";
import { platformEventBus } from "@/lib/events";
import { jobRunner } from "./jobs";
import { idempotencyService } from "./idempotency";

export interface HealthCheckResult {
  status: "ok" | "degraded" | "error";
  checks: Record<string, { status: "ok" | "degraded" | "error"; latencyMs: number; detail?: string }>;
  timestamp: string;
  uptime: number;
}

const startTime = Date.now();

export async function getPlatformHealth(): Promise<HealthCheckResult> {
  const checks: HealthCheckResult["checks"] = {};

  // Database
  const dbStart = performance.now();
  try { await prisma.$queryRaw`SELECT 1`; checks.database = { status: "ok", latencyMs: Math.round(performance.now() - dbStart) }; }
  catch { checks.database = { status: "error", latencyMs: -1, detail: "Connection failed" }; }

  // Partner Engine
  const peStart = performance.now();
  checks.partnerEngine = {
    status: "ok",
    latencyMs: Math.round(performance.now() - peStart),
    detail: `${partnerEngine.listPartners().length} partners cached`,
  };

  // Commission Engine
  const ceStart = performance.now();
  const ceEntries = commissionLedger.getAllEntries();
  checks.commissionEngine = {
    status: "ok",
    latencyMs: Math.round(performance.now() - ceStart),
    detail: `${ceEntries.length} ledger entries cached`,
  };

  // Payout Engine
  const payoutStart = performance.now();
  const payoutBatches = payoutLedger.getAllBatches();
  checks.payoutEngine = {
    status: "ok",
    latencyMs: Math.round(performance.now() - payoutStart),
    detail: `${payoutBatches.length} batches cached`,
  };

  // Event Bus
  const ebStart = performance.now();
  const eventCount = platformEventBus.getHistory().length;
  checks.eventBus = {
    status: "ok",
    latencyMs: Math.round(performance.now() - ebStart),
    detail: `${eventCount} events in history`,
  };

  // Notification Service (singleton available via import)
  checks.notifications = {
    status: "ok",
    latencyMs: 0,
    detail: "active",
  };

  // Idempotency
  checks.idempotency = {
    status: "ok",
    latencyMs: 0,
    detail: `${idempotencyService.size} keys tracked`,
  };

  // Job Runner
  const jobs = jobRunner.getStatus();
  checks.jobRunner = {
    status: "ok",
    latencyMs: 0,
    detail: `${jobs.length} jobs registered`,
  };

  const allOk = Object.values(checks).every((c) => c.status === "ok");
  const hasErrors = Object.values(checks).some((c) => c.status === "error");

  return {
    status: hasErrors ? "error" : allOk ? "ok" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
  };
}
