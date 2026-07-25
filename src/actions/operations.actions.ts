"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPlatformHealth } from "@/lib/reliability";
import { getDiagnostics } from "@/lib/reliability";
import { jobRunner } from "@/lib/reliability";
import { platformEventBus } from "@/lib/events";
import { partnerEngine } from "@/lib/partners/engine";
import { commissionLedger } from "@/lib/commission/ledger";
import { payoutLedger } from "@/lib/payouts/ledger";
import { payoutService } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
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
      prisma.billingSubscription.findMany({ include: { plan: true } }),
      prisma.billingInvoice.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
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
