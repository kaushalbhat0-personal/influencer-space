/**
 * RCCF-44 — canonical Partner financial overview (server-side, Partner-scoped).
 *
 * Every number derives from persisted financial records (CommissionEntry +
 * refund_reversal entries + SettlementItem) via getPartnerRevenueSummary — no
 * fabrication, no second calculation engine. Partner identity is resolved by
 * the caller (authenticated agency context); this module only scopes queries by
 * the agencyId it is given.
 */
import { prisma } from "@/lib/prisma";
import { getPartnerRevenueSummary } from "@/lib/commission/runtime";

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface MonthlySeriesPoint {
  /** UTC calendar month, "YYYY-MM". */
  month: string;
  gross: number;
  refunds: number;
  net: number;
}

/**
 * RCCF-45 — monthly financial time-series for a Partner, derived from persisted
 * CommissionEntry + refund_reversal records (no synthetic history). Dates use
 * the UTC calendar-month convention (consistent with RCCF-31). Refunds are
 * attributed to the month the reversal was recorded. `months` is a technical
 * default (last 6 months); history beyond the window is untouched.
 */
export async function getAgencyMonthlySeries(agencyId: string, months = 6): Promise<MonthlySeriesPoint[]> {
  const now = new Date();
  const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

  const entries = await prisma.commissionEntry.findMany({
    where: { partnerId: agencyId, createdAt: { gte: rangeStart } },
    select: { createdAt: true, partnerShare: true, entryType: true },
  });

  const buckets = new Map<string, { gross: number; refunds: number }>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.set(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, { gross: 0, refunds: 0 });
  }
  for (const e of entries) {
    const key = `${e.createdAt.getUTCFullYear()}-${String(e.createdAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (e.entryType.startsWith("subscription_")) bucket.gross += e.partnerShare;
    else if (e.entryType === "refund_reversal") bucket.refunds += e.partnerShare;
  }

  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, v]) => ({ month, gross: round2(v.gross), refunds: round2(v.refunds), net: round2(v.gross + v.refunds) }));
}

export interface PartnerFinancialOverview {
  summary: {
    grossCommission: number;
    refundReversals: number;
    netCommission: number;
    clawbackDue: number;
    pending: number;
    paid: number;
    available: number;
    activeClients: number;
    upcomingRenewals: number;
    entryCount: number;
  };
  clients: Array<{
    name: string;
    subdomain: string | null;
    planCode: string | null;
    grossCommission: number;
    refundReversals: number;
    netCommission: number;
  }>;
  transactions: Array<{
    id: string;
    createdAt: string;
    planCode: string;
    grossAmount: number;
    partnerPercent: number;
    partnerShare: number;
    entryType: string;
    status: string;
    reserved: boolean;
    refundId: string | null;
    parentEntryId: string | null;
  }>;
  settlements: Array<{ id: string; status: string; netAmount: number; createdAt: string }>;
  monthly: MonthlySeriesPoint[];
}

export async function getAgencyFinancialOverview(agencyId: string): Promise<PartnerFinancialOverview> {
  const summary = await getPartnerRevenueSummary(agencyId);

  // Client identity + subscription→tenant mapping (server-scoped to this agency).
  const links = await prisma.agencyTenant.findMany({
    where: { agencyId, status: "ACTIVE" },
    include: { tenant: { select: { id: true, name: true, subdomain: true } } },
  });
  const subs = await prisma.billingSubscription.findMany({
    where: { workspace: { tenant: { agencyTenant: { agencyId } } } },
    select: { id: true, workspace: { select: { tenantId: true } }, plan: { select: { code: true } } },
  });
  const subToTenant = new Map<string, string>();
  const subToPlan = new Map<string, string | null>();
  for (const s of subs) {
    subToTenant.set(s.id, s.workspace?.tenantId ?? "");
    subToPlan.set(s.id, s.plan?.code ?? null);
  }

  // Reserved (settled) entry ids, partner-scoped.
  const reserved = await prisma.settlementItem.findMany({
    where: { settlement: { partnerId: agencyId } },
    select: { commissionEntryId: true },
  });
  const reservedSet = new Set(reserved.map((r) => r.commissionEntryId));

  // All of this partner's commission entries (original + reversals).
  const entries = await prisma.commissionEntry.findMany({
    where: { partnerId: agencyId },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true, createdAt: true, invoiceId: true, subscriptionId: true, planCode: true,
      amount: true, partnerShare: true, partnerPercent: true, entryType: true,
      status: true, parentEntryId: true, audit: true,
    },
  });

  // Per-client aggregates.
  const clientAgg = new Map<string, { gross: number; refunds: number }>();
  for (const e of entries) {
    const tenantId = subToTenant.get(e.subscriptionId ?? "");
    if (!tenantId) continue;
    const agg = clientAgg.get(tenantId) ?? { gross: 0, refunds: 0 };
    if (e.entryType.startsWith("subscription_")) agg.gross += e.partnerShare;
    else if (e.entryType === "refund_reversal") agg.refunds += e.partnerShare;
    clientAgg.set(tenantId, agg);
  }
  const clients = links.map((l) => {
    const agg = clientAgg.get(l.tenantId) ?? { gross: 0, refunds: 0 };
    return {
      name: l.tenant.name,
      subdomain: l.tenant.subdomain,
      planCode: subToPlan.get(subs.find((s) => s.workspace?.tenantId === l.tenantId)?.id ?? "") ?? null,
      grossCommission: round2(agg.gross),
      refundReversals: round2(agg.refunds),
      netCommission: round2(agg.gross + agg.refunds),
    };
  });

  // Transaction detail (never exposes payment/provider secrets).
  const transactions = entries.map((e) => {
    const audit = (e.audit ?? {}) as { refundId?: string };
    return {
      id: e.id,
      createdAt: e.createdAt.toISOString(),
      planCode: e.planCode,
      grossAmount: round2(e.amount),
      partnerPercent: e.partnerPercent,
      partnerShare: round2(e.partnerShare),
      entryType: e.entryType,
      status: e.status,
      reserved: reservedSet.has(e.id),
      refundId: audit.refundId ?? null,
      parentEntryId: e.parentEntryId,
    };
  });

  const settlements = await prisma.settlement.findMany({
    where: { partnerId: agencyId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, status: true, netAmount: true, createdAt: true },
  });

  return {
    summary: {
      grossCommission: summary.grossCommission,
      refundReversals: summary.refundReversals,
      netCommission: summary.netCommission,
      clawbackDue: summary.clawbackDue,
      pending: summary.pending,
      paid: summary.paid,
      available: summary.available,
      activeClients: summary.activeClients,
      upcomingRenewals: summary.upcomingRenewals,
      entryCount: summary.entryCount,
    },
    clients,
    transactions,
    settlements: settlements.map((s) => ({ id: s.id, status: s.status, netAmount: round2(s.netAmount), createdAt: s.createdAt.toISOString() })),
    monthly: await getAgencyMonthlySeries(agencyId, 6),
  };
}
