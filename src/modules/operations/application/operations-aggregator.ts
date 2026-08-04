/**
 * Operations Aggregator (IMPLEMENTATION-40) — the single runtime aggregator for
 * the Platform Operations Center. Aggregates publishing, provisioning, billing,
 * generation, marketplace, storage, themes, jobs, health, alerts, audit and AI
 * from canonical runtimes. Memoized (30s TTL) — no polling loops.
 */
import { prisma } from "@/lib/prisma";
import { healthService } from "@/lib/observability/health-service";
import { revenueService } from "@/modules/billing/application/revenue-service";
import { alertStore } from "./alert-store";
import { persistedJobRuntime } from "./job-runtime";
import { themeRegistry } from "@/lib/theme/registry-new";
import { blueprintRegistry } from "@/lib/blueprint/registry";
import { billingMigrationRegistry } from "@/modules/billing/application/migration-registry";

export interface OperationsSnapshot {
  timestamp: string;
  health: { overall: string; services: Array<{ name: string; state: string; latencyMs: number }> };
  alerts: Record<"ACTIVE" | "RESOLVED" | "DISMISSED", number>;
  jobs: { running: number; failed24h: number; succeeded24h: number; total: number };
  publishing: { snapshots: number; websites: number; versions: number; lastPublishedAt: string | null; published24h: number };
  provisioning: { runs: number; running: number; succeeded: number; failed: number; lastRunAt: string | null };
  billing: { mrr: number; arr: number; activeSubscribers: number; pendingInvoices: number; failedPayments: number; planDistribution: Array<{ planName: string; count: number }> };
  generation: { sessions: number; running: number; succeeded: number; failed: number };
  marketplace: { themes: number; blueprintCount: number; themeUsage: number; commissionRevenue: number };
  storage: { assets: number; media: number };
  audit: { entries24h: number };
  ai: { providerAccounts: number; fetches24h: number; cachedFetches: number; errorFetches: number; avgLatencyMs: number; quotaUnits: number };
  migration: { migrationPercent: number; remainingReaders: number; remainingWriters: number };
}

let cache: { at: number; value: Promise<OperationsSnapshot> } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getOperationsSnapshot(): Promise<OperationsSnapshot> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  cache = { at: Date.now(), value: buildSnapshot() };
  return cache.value;
}

async function buildSnapshot(): Promise<OperationsSnapshot> {
  const since = new Date(Date.now() - 86400000);
  const [health, alertCounts, jobCounts, revenue, migration] = await Promise.all([
    healthService.checkAll().catch(() => null),
    alertStore.countByStatus(),
    persistedJobRuntime.counts(),
    revenueService.getRevenueDashboard().catch(() => null),
    Promise.resolve(billingMigrationRegistry.getStatus()),
  ]);

  const [
    publishingCounts,
    provisioningCounts,
    generationCounts,
    marketplaceCounts,
    storageCounts,
    audit24h,
    aiCounts,
  ] = await Promise.all([
    (async () => {
      const [snapshots, websites, versions, lastPublished, published24h] = await Promise.all([
        prisma.publishSnapshot.count(),
        prisma.publishStatus.count(),
        prisma.publishSnapshot.aggregate({ _max: { version: true } }),
        prisma.publishSnapshot.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
        prisma.publishSnapshot.count({ where: { createdAt: { gte: since } } }),
      ]);
      return { snapshots, websites, versions: versions._max.version ?? 0, lastPublishedAt: lastPublished?.createdAt.toISOString() ?? null, published24h };
    })(),
    (async () => {
      const [runs, running, succeeded, failed, lastRun] = await Promise.all([
        prisma.creatorProvisionRun.count(),
        prisma.creatorProvisionRun.count({ where: { status: { in: ["PENDING", "RUNNING", "PROVISIONING"] } } }),
        prisma.creatorProvisionRun.count({ where: { status: "COMPLETED" } }),
        prisma.creatorProvisionRun.count({ where: { status: { in: ["FAILED", "DOMAIN_FAILED", "PROVISION_FAILED"] } } }),
        prisma.creatorProvisionRun.findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true } }),
      ]);
      return { runs, running, succeeded, failed, lastRunAt: lastRun?.startedAt.toISOString() ?? null };
    })(),
    (async () => {
      const [sessions, running, succeeded, failed] = await Promise.all([
        prisma.generationSession.count(),
        prisma.generationSession.count({ where: { status: { in: ["running", "queued", "retrying", "publishing"] } } }),
        prisma.generationSession.count({ where: { status: "completed" } }),
        prisma.generationSession.count({ where: { status: "failed" } }),
      ]);
      return { sessions, running, succeeded, failed };
    })(),
    (async () => {
      const [themes, themeUsage, commissions] = await Promise.all([
        Promise.resolve(themeRegistry.getAll().length),
        prisma.website.count({ where: { themePackageId: { not: { equals: "neon-dark" } } } }),        prisma.commissionEntry.aggregate({ _sum: { partnerShare: true }, where: { status: { in: ["pending", "paid"] } } }),
      ]);
      return { themes, blueprintCount: blueprintRegistry.count(), themeUsage, commissionRevenue: commissions._sum.partnerShare ?? 0 };    })(),
    (async () => {
      const [assets, media] = await Promise.all([prisma.asset.count(), prisma.galleryImage.count()]);
      return { assets, media };
    })(),
    prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
    (async () => {
      const [providerAccounts, fetchLogs] = await Promise.all([
        prisma.providerAccount.count(),
        prisma.providerFetchLog.findMany({ where: { createdAt: { gte: since } }, select: { status: true, cached: true, latencyMs: true, quotaUnits: true } }),
      ]);
      const fetches = fetchLogs.length;
      const cached = fetchLogs.filter((f) => f.cached).length;
      const errors = fetchLogs.filter((f) => f.status === "error").length;
      const avgLatency = fetches > 0 ? Math.round(fetchLogs.reduce((s, f) => s + f.latencyMs, 0) / fetches) : 0;
      const quotaUnits = fetchLogs.reduce((s, f) => s + f.quotaUnits, 0);
      return { providerAccounts, fetches24h: fetches, cachedFetches: cached, errorFetches: errors, avgLatencyMs: avgLatency, quotaUnits };
    })(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    health: health
      ? { overall: health.overall, services: Object.entries(health.services).map(([name, s]) => ({ name, state: s.state, latencyMs: s.latencyMs })) }
      : { overall: "offline", services: [] },
    alerts: alertCounts,
    jobs: jobCounts,
    publishing: publishingCounts,
    provisioning: provisioningCounts,
    generation: generationCounts,
    billing: revenue
      ? {
          mrr: revenue.mrr,
          arr: revenue.arr,
          activeSubscribers: revenue.activeSubscribers,
          pendingInvoices: revenue.pendingInvoices,
          failedPayments: revenue.failedPayments,
          planDistribution: revenue.planDistribution,
        }
      : { mrr: 0, arr: 0, activeSubscribers: 0, pendingInvoices: 0, failedPayments: 0, planDistribution: [] },
    marketplace: marketplaceCounts,
    storage: storageCounts,
    audit: { entries24h: audit24h },
    ai: aiCounts,
    migration: { migrationPercent: migration.migrationPercent, remainingReaders: migration.remainingReaders.length, remainingWriters: migration.remainingWriters.length },
  };
}
