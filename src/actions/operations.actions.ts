"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPlatformHealth, getDiagnostics, jobRunner } from "@/lib/reliability";
import { platformEventBus } from "@/lib/events";
import { partnerEngine } from "@/lib/partners/engine";
import { commissionLedger } from "@/lib/commission/ledger";
import { payoutLedger } from "@/lib/payouts/ledger";
import { payoutService } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
import { billingRepository } from "@/modules/billing/infrastructure/repository";
import { logAction } from "@/lib/audit";

function requireSuperAdmin(session: { user?: { role?: string } } | null): void {
  if (!session || session.user?.role !== "SUPER_ADMIN") throw new Error("Unauthorized");
}

export async function getOperationsDashboard() {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);

  const [health, diagnostics, totalTenants, totalUsers, subscriptions, invoices, events24h] =
    await Promise.all([
      getPlatformHealth(),
      getDiagnostics(),
      prisma.tenant.count(),
      prisma.user.count(),
      billingRepository.getAllSubscriptionsWithPlan(),
      billingRepository.getInvoiceRevenue(),
      platformEventBus.getHistory().filter((e) => Date.now() - new Date(e.timestamp).getTime() < 86400000).length,
    ]);

  const activeSubs = subscriptions.filter((s) => s.status === "ACTIVE" || s.status === "TRIALING");
  const mrr = activeSubs.reduce((sum, s) => sum + (s.plan?.price ?? 0), 0);

  return {
    health,
    diagnostics,
    metrics: {
      totalTenants,
      totalUsers,
      activeSubscriptions: activeSubs.length,
      mrr,
      arr: mrr * 12,
      totalRevenue: invoices._sum.amount ?? 0,
      eventsLast24h: events24h,
    },
  };
}

export async function getEvents(search?: { type?: string; aggregateId?: string; limit?: number }) {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);

  let events = platformEventBus.getHistory();

  if (search?.type) events = events.filter((e) => e.type === search.type);
  if (search?.aggregateId) {
    events = events.filter((e) => {
      const p = e.payload as Record<string, unknown>;
      return Object.values(p).includes(search.aggregateId);
    });
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const limit = search?.limit ?? 100;
  return events.slice(0, limit).map((e) => ({
    id: e.id,
    type: e.type,
    timestamp: e.timestamp,
    source: e.source,
    payloadPreview: JSON.stringify(e.payload).slice(0, 200),
    aggregateId: ((e.payload as Record<string, string>)?.tenantId ?? (e.payload as Record<string, string>)?.workspaceId ?? (e.payload as Record<string, string>)?.partnerId) as string | null,
  }));
}

export async function getEventTypes(): Promise<string[]> {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);
  const types = new Set(platformEventBus.getHistory().map((e) => e.type));
  return Array.from(types).sort();
}

export async function rehydrateEngine(engine: string) {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);

  const results: Record<string, string> = {};

  if (engine === "all" || engine === "partner") {
    const counts = await partnerEngine.initialize();
    results.partner = `${counts.partners} partners, ${counts.members} members`;
  }
  if (engine === "all" || engine === "commission") {
    const counts = await commissionLedger.initialize();
    results.commission = `${counts.entries} entries`;
  }
  if (engine === "all" || engine === "payout") {
    const counts = await payoutLedger.initialize();
    results.payout = `${counts.batches} batches`;
  }
  if (engine === "all" || engine === "eventbus") {
    await platformEventBus.initialize();
    results.eventbus = `${platformEventBus.getHistory().length} events`;
  }

  await logAction("system", `operations:rehydrate`, { engine, results });

  return { success: true, results };
}

export async function retryFailedPayouts() {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);

  const batches = payoutLedger.getAllBatches().filter((b) => b.status === "failed");
  let retried = 0;

  for (const batch of batches) {
    const result = payoutService.retryFailedPayout(batch.id);
    if (!("error" in result)) retried++;
  }

  await logAction("system", "operations:retry-payouts", { count: retried });
  return { success: true, retried };
}

export async function expireStaleInvites() {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);

  const count = await partnerEngine.expireStaleInvites();
  await logAction("system", "operations:expire-invites", { count });
  return { success: true, expired: count };
}

export async function runJob(jobId: string) {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);

  const ok = await jobRunner.runOnce(jobId);
  await logAction("system", `operations:run-job`, { jobId, ok });
  return { success: ok };
}

export async function getJobStatus() {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);
  return jobRunner.getStatus();
}

export async function exportDiagnostics() {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);
  return getDiagnostics();
}

// â”€â”€ IMPLEMENTATION-40: Operations Center actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { alertStore } from "@/modules/operations/application/alert-store";
import { persistedJobRuntime } from "@/modules/operations/application/job-runtime";
import { getOperationsSnapshot } from "@/modules/operations/application/operations-aggregator";

export async function getOperationsSnapshotAction() {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);
  return getOperationsSnapshot();
}

export async function syncAlerts() {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);
  const actor = session?.user?.email ?? "super-admin";
  const result = await alertStore.syncFromRuntime(actor);
  await logAction("system", "operations:sync-alerts", { created: result.created });
  return result;
}

export async function listAlerts(input: Parameters<typeof alertStore.list>[0]) {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);
  return alertStore.list(input);
}

export async function setAlertStatus(id: string, status: "RESOLVED" | "DISMISSED") {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);
  const actor = session?.user?.email ?? "super-admin";
  return alertStore.setStatus(id, status, actor);
}

export async function listJobRuns(input: Parameters<typeof persistedJobRuntime.list>[0]) {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);
  return persistedJobRuntime.list(input);
}

export async function triggerPersistedJob(jobId: string) {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);
  const actor = session?.user?.email ?? "super-admin";
  const result = await persistedJobRuntime.runPersisted(jobId, { type: "cron" }, actor);
  await logAction("system", "operations:trigger-job", { jobId, ok: result.success, runId: result.runId });
  return result;
}

export async function requeueJob(id: string) {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);
  return persistedJobRuntime.requeue(id);
}

export async function cancelJob(id: string) {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);
  return persistedJobRuntime.cancel(id);
}

/** Unified activity feed: audit + billing events + generation + provisioning. */
export async function getUnifiedActivity(input: { kind?: string; search?: string; limit?: number } = {}) {
  const session = await getServerSession(authOptions);
  requireSuperAdmin(session);
  const limit = input.limit ?? 100;

  const [audit, billingEvents, generations, provisions] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 150, select: { id: true, action: true, tenantId: true, createdAt: true, metadata: true } }),
    prisma.billingEvent.findMany({ orderBy: { createdAt: "desc" }, take: 150, select: { id: true, type: true, createdAt: true, workspaceId: true } }),
    prisma.generationSession.findMany({ orderBy: { startedAt: "desc" }, take: 150, select: { id: true, creatorName: true, status: true, startedAt: true } }),
    prisma.creatorProvisionRun.findMany({ orderBy: { startedAt: "desc" }, take: 150, select: { id: true, creatorName: true, status: true, startedAt: true } }),
  ]);

  type Row = { id: string; kind: string; type: string; detail: string; createdAt: string };
  const rows: Row[] = [
    ...audit.map((a) => ({ id: `audit_${a.id}`, kind: "audit", type: a.action, detail: a.tenantId ?? "", createdAt: a.createdAt.toISOString() })),
    ...billingEvents.map((b) => ({ id: `billing_${b.id}`, kind: "billing", type: b.type, detail: b.workspaceId ?? "", createdAt: b.createdAt.toISOString() })),
    ...generations.map((g) => ({ id: `gen_${g.id}`, kind: "generation", type: g.status, detail: g.creatorName, createdAt: g.startedAt.toISOString() })),
    ...provisions.map((p) => ({ id: `prov_${p.id}`, kind: "provisioning", type: p.status, detail: p.creatorName, createdAt: p.startedAt.toISOString() })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const filtered = rows.filter((r) => {
    if (input.kind && input.kind !== "ALL" && r.kind !== input.kind) return false;
    if (input.search) {
      const q = input.search.toLowerCase();
      return r.type.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q);
    }
    return true;
  });

  return { rows: filtered.slice(0, limit), total: filtered.length };
}
