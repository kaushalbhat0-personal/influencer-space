// ── Subscription Revenue Runtime — RCCF-IMPLEMENTATION-72 ───────────────────
// Activates the existing commission/ledger architecture for the target model:
// agencies earn a configurable recurring % of creator SUBSCRIPTIONS. Creators
// keep 100% of product revenue. No transaction fees.
//
// Attribution: BillingSubscription.workspaceId → Workspace.tenantId →
// AgencyTenant.agencyId (reuses AgencyTenant — no duplicated relationship).
// Splits: CommissionRule (partner → plan → default) → AgencyTenant.revSharePercent
// → CommissionPolicy.agencyDefaultShare → 20% default.

import { prisma } from "@/lib/prisma";
import { cache as reactCache } from "react";
import { logAction } from "@/lib/audit";
import { runtimeEventBus } from "@/modules/event-runtime";
import { captureError } from "@/lib/observability/error-tracker";
import type { RuntimeEvent } from "@/modules/event-runtime/domain/types";

const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === "function" ? reactCache : ((fn: (x: never) => unknown) => fn as never);

export interface RevenueSplit {
  platformShare: number;
  partnerShare: number;
  platformPercent: number;
  partnerPercent: number;
  ruleId: string | null;
  source: "rule" | "relationship" | "policy" | "default";
}

export interface CommissionRecordResult {
  success: boolean;
  skipped?: "no-partner" | "already-recorded";
  entryId?: string;
  split?: RevenueSplit;
}

// ── Attribution (Phase 1) ────────────────────────────────────────────────────

/** The agency managing a workspace's tenant, via AgencyTenant (reused). */
export async function resolvePartnerForWorkspace(workspaceId: string): Promise<string | null> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { tenantId: true },
  });
  if (!ws?.tenantId) return null;
  const link = await prisma.agencyTenant.findUnique({
    where: { tenantId: ws.tenantId },
    select: { agencyId: true },
  });
  return link?.agencyId ?? null;
}

// ── Split resolution (Phases 2 + 4) ──────────────────────────────────────────

interface SplitSource {
  platformPercent: number;
  partnerPercent: number;
  ruleId: string | null;
  source: RevenueSplit["source"];
}

const resolveSplitSource = requestCache(async (partnerId: string, planCode: string, tenantId: string | null): Promise<SplitSource> => {
  // 1. DB-backed CommissionRule cascade (partner → plan → default).
  const rules = await prisma.commissionRule.findMany({
    where: { status: "active" },
    orderBy: { priority: "asc" },
    select: {
      id: true, type: true, partnerId: true, platformSharePercent: true,
      partnerSharePercent: true, metadata: true, effectiveFrom: true, effectiveTo: true,
    },
  });
  const now = new Date();
  const active = rules.filter(
    (r) => r.effectiveFrom <= now && (!r.effectiveTo || r.effectiveTo >= now),
  );
  const partnerRule = active.find((r) => r.partnerId === partnerId);
  if (partnerRule) return { platformPercent: partnerRule.platformSharePercent, partnerPercent: partnerRule.partnerSharePercent, ruleId: partnerRule.id, source: "rule" };
  const planRule = active.find((r) => (r.metadata as Record<string, unknown> | null)?.["planCode"] === planCode);
  if (planRule) return { platformPercent: planRule.platformSharePercent, partnerPercent: planRule.partnerSharePercent, ruleId: planRule.id, source: "rule" };
  const defaultRule = active.find((r) => r.type === "default");
  if (defaultRule) return { platformPercent: defaultRule.platformSharePercent, partnerPercent: defaultRule.partnerSharePercent, ruleId: defaultRule.id, source: "rule" };

  // 2. Per-creator agency relationship share.
  if (tenantId) {
    const link = await prisma.agencyTenant.findUnique({
      where: { tenantId },
      select: { revSharePercent: true },
    });
    if (link && link.revSharePercent > 0) {
      const partnerPercent = Math.min(100, Math.max(0, Math.round(link.revSharePercent)));
      return { platformPercent: 100 - partnerPercent, partnerPercent, ruleId: null, source: "relationship" };
    }
  }

  // 3. Platform policy.
  const policy = await prisma.commissionPolicy.findFirst({
    select: { agencyDefaultShare: true },
  });
  if (policy && policy.agencyDefaultShare > 0) {
    const partnerPercent = Math.min(100, Math.max(0, Math.round(policy.agencyDefaultShare)));
    return { platformPercent: 100 - partnerPercent, partnerPercent, ruleId: null, source: "policy" };
  }

  // 4. Default 80/20.
  return { platformPercent: 80, partnerPercent: 20, ruleId: null, source: "default" };
});

/** Compute the platform/agency split for a subscription amount (rupees). */
export function computeSubscriptionSplit(amount: number, src: SplitSource): RevenueSplit {
  const gross = Math.round(amount * 100) / 100;
  const partnerShare = Math.round((gross * src.partnerPercent) / 100 * 100) / 100;
  const platformShare = Math.round((gross - partnerShare) * 100) / 100;
  return { platformShare, partnerShare, platformPercent: src.platformPercent, partnerPercent: src.partnerPercent, ruleId: src.ruleId, source: src.source };
}

// ── Commission recording (Phase 3) ───────────────────────────────────────────

/**
 * Record a subscription-revenue commission for the agency managing the
 * workspace. Idempotent per invoice, transactional (CommissionEntry +
 * PartnerLedger), emits canonical events + audit. Returns skipped reasons
 * instead of throwing for benign cases; real failures surface to the caller.
 */
export async function recordSubscriptionCommission(params: {
  workspaceId: string;
  planCode: string;
  subscriptionId: string;
  invoiceId: string;
  amount: number;
  event: "created" | "renewed" | "upgraded";
}): Promise<CommissionRecordResult> {
  const partnerId = await resolvePartnerForWorkspace(params.workspaceId);
  if (!partnerId) return { success: false, skipped: "no-partner" };

  const existing = await prisma.commissionEntry.findFirst({
    where: { invoiceId: params.invoiceId },
    select: { id: true },
  });
  if (existing) return { success: false, skipped: "already-recorded" };

  const ws = await prisma.workspace.findUnique({ where: { id: params.workspaceId }, select: { tenantId: true } });
  const src = await resolveSplitSource(partnerId, params.planCode, ws?.tenantId ?? null);
  const split = computeSubscriptionSplit(params.amount, src);

  try {
    await prisma.$transaction(async (tx) => {
      const entry = await tx.commissionEntry.create({
        data: {
          invoiceId: params.invoiceId,
          partnerId,
          subscriptionId: params.subscriptionId,
          planCode: params.planCode,
          amount: params.amount,
          platformShare: split.platformShare,
          partnerShare: split.partnerShare,
          platformPercent: split.platformPercent,
          partnerPercent: split.partnerPercent,
          entryType: `subscription_${params.event}`,
          status: "pending",
          description: `Subscription revenue share for ${params.planCode} (${params.event}) — invoice ${params.invoiceId}`,
          ruleId: split.ruleId,
          audit: { source: split.source, event: params.event, actor: "billing-webhook" },
        },
      });

      // Append-only partner ledger (balance chain) inside the same transaction.
      const last = await tx.partnerLedger.findFirst({
        where: { partnerId },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true },
      });
      const balanceBefore = last?.balanceAfter ?? 0;
      await tx.partnerLedger.create({
        data: {
          partnerId,
          type: "COMMISSION_EARNED",
          amount: split.partnerShare,
          reference: entry.id,
          referenceType: "commission_entry",
          description: `Commission for ${params.planCode} (${params.event}) — invoice ${params.invoiceId}`,
          commissionId: entry.id,
          balanceBefore,
          balanceAfter: Math.round((balanceBefore + split.partnerShare) * 100) / 100,
        },
      });

      await emitEvent({
        type: params.event === "created" ? "subscription.created" : params.event === "renewed" ? "subscription.renewed" : "subscription.upgraded",
        tenantId: ws?.tenantId ?? "system",
        entityId: params.subscriptionId,
        payload: { workspaceId: params.workspaceId, planCode: params.planCode, amount: params.amount },
      });
      await emitEvent({
        type: "commission.created",
        tenantId: ws?.tenantId ?? "system",
        entityId: entry.id,
        payload: { partnerId, invoiceId: params.invoiceId, subscriptionId: params.subscriptionId, planCode: params.planCode, amount: params.amount, partnerShare: split.partnerShare, platformShare: split.platformShare },
      });
      await emitEvent({
        type: "ledger.updated",
        tenantId: ws?.tenantId ?? "system",
        entityId: entry.id,
        payload: { partnerId, type: "COMMISSION_EARNED", amount: split.partnerShare, reference: entry.id },
      });
    });

    await logAction("system", "commission:subscription-created", {
      partnerId, workspaceId: params.workspaceId, planCode: params.planCode,
      invoiceId: params.invoiceId, amount: params.amount, partnerShare: split.partnerShare,
    }).catch(() => {});

    return { success: true, split };
  } catch (err) {
    await emitEvent({
      type: "commission.failed",
      tenantId: ws?.tenantId ?? "system",
      entityId: params.invoiceId,
      payload: { partnerId, planCode: params.planCode, error: err instanceof Error ? err.message : String(err) },
    }).catch(() => {});
    captureError(err, { service: "commission-runtime", operation: "recordSubscriptionCommission" });
    throw err;
  }
}

async function emitEvent(event: Omit<RuntimeEvent, "occurredAt">): Promise<void> {
  await runtimeEventBus.publish({ ...event, occurredAt: new Date().toISOString() }).catch(() => {});
}

// ── Reporting + health (Phases 13 + 14) ──────────────────────────────────────

/** Agency revenue summary from the DB runtime. */
export async function getPartnerRevenueSummary(partnerId: string): Promise<{
  lifetime: number;
  pending: number;
  paid: number;
  available: number;
  entryCount: number;
  activeClients: number;
  upcomingRenewals: number;
}> {
  const [entryAgg, paidAgg, entryCount, activeClients, renewals] = await Promise.all([
    prisma.commissionEntry.aggregate({ where: { partnerId }, _sum: { partnerShare: true } }),
    prisma.partnerLedger.aggregate({ where: { partnerId, type: "SETTLEMENT_PAID" }, _sum: { amount: true } }),
    prisma.commissionEntry.count({ where: { partnerId } }),
    prisma.agencyTenant.count({ where: { agencyId: partnerId } }),
    prisma.billingSubscription.count({
      where: { workspace: { tenant: { agencyTenant: { agencyId: partnerId } } }, status: { in: ["ACTIVE", "TRIALING"] } },
    }),
  ]);
  const lifetime = entryAgg._sum.partnerShare ?? 0;
  const paid = paidAgg._sum.amount ?? 0;
  const pendingAgg = await prisma.commissionEntry.aggregate({
    where: { partnerId, status: "pending", ...(await reservedEntryIds(partnerId)) },
    _sum: { partnerShare: true },
  });
  const pending = pendingAgg._sum.partnerShare ?? 0;
  return { lifetime, pending, paid, available: Math.max(0, lifetime - paid), entryCount, activeClients, upcomingRenewals: renewals };
}

async function reservedEntryIds(partnerId: string): Promise<{ id?: { notIn: string[] } }> {
  const reserved = await prisma.settlementItem.findMany({ select: { commissionEntryId: true } });
  if (reserved.length === 0) return {};
  return { id: { notIn: reserved.map((r) => r.commissionEntryId) } };
}

/** Platform-level revenue summary (Phase 14). */
export async function getPlatformRevenueSummary(): Promise<{
  platformRevenue: number;
  agencyRevenue: number;
  totalSubscriptions: number;
  commissionEntries: number;
  pendingSettlements: number;
  paidPayouts: number;
  topAgencies: Array<{ partnerId: string; revenue: number }>;
}> {
  const [entries, totalSubscriptions, pendingSettlements, paidPayouts] = await Promise.all([
    prisma.commissionEntry.findMany({ select: { partnerId: true, platformShare: true, partnerShare: true } }),
    prisma.billingSubscription.count(),
    prisma.settlement.count({ where: { status: { in: ["PENDING", "READY", "APPROVED", "PROCESSING"] } } }),
    prisma.payoutBatch.count({ where: { status: { in: ["paid", "completed"] } } }),
  ]);
  const byPartner = new Map<string, number>();
  let platformRevenue = 0;
  let agencyRevenue = 0;
  for (const e of entries) {
    platformRevenue += e.platformShare;
    agencyRevenue += e.partnerShare;
    byPartner.set(e.partnerId, (byPartner.get(e.partnerId) ?? 0) + e.partnerShare);
  }
  return {
    platformRevenue,
    agencyRevenue,
    totalSubscriptions,
    commissionEntries: entries.length,
    pendingSettlements,
    paidPayouts,
    topAgencies: Array.from(byPartner.entries()).map(([partnerId, revenue]) => ({ partnerId, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  };
}

/** Phase 13 — revenue runtime health. */
export async function getRevenueRuntimeHealth(): Promise<Array<{ id: string; label: string; status: "healthy" | "warning" | "broken"; detail: string }>> {
  const [commissionCount, lastCommission, settlementActive, payoutFailed, ledgerCount, strategyDistribution] = await Promise.all([
    prisma.commissionEntry.count(),
    prisma.commissionEntry.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.settlement.count({ where: { status: { in: ["PENDING", "READY", "APPROVED", "PROCESSING"] } } }),
    prisma.payoutBatch.count({ where: { status: "failed" } }),
    prisma.partnerLedger.count(),
    // RCCF-IMPLEMENTATION-73: commerce strategy readiness (platform-wide).
    (async () => {
      const { getStrategyDistribution } = await import("@/modules/commerce-strategy");
      const dist = await getStrategyDistribution();
      return dist.reduce((s, d) => s + d.count, 0);
    })(),
  ]);
  return [
    {
      id: "commission",
      label: "Commission Runtime",
      status: commissionCount > 0 ? "healthy" : lastCommission ? "warning" : "broken",
      detail: commissionCount > 0 ? `${commissionCount} entries recorded` : "No commission entries — agency revenue inactive",
    },
    {
      id: "settlement",
      label: "Settlement Runtime",
      status: "healthy",
      detail: `${settlementActive} active settlements`,
    },
    {
      id: "ledger",
      label: "Partner Ledger",
      status: ledgerCount > 0 ? "healthy" : "warning",
      detail: `${ledgerCount} ledger entries`,
    },
    {
      id: "payout",
      label: "Payout Runtime",
      status: payoutFailed > 0 ? "warning" : "healthy",
      detail: `${payoutFailed} failed payouts`,
    },
    {
      id: "commerce-strategy",
      label: "Commerce Strategy",
      status: strategyDistribution > 0 ? "healthy" : "warning",
      detail: `${strategyDistribution} tenants resolved`,
    },
  ];
}
