"use server";

/**
 * Agency analytics (IMPLEMENTATION-41): server-authoritative. The agencyId is
 * always taken from the authenticated session (never trusted from the client),
 * membership is re-validated against the agency workspace, and every read is
 * audited. No IDOR.
 */
import { payoutService } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
import type { PartnerFinancialOverview } from "@/modules/partner/application/financial-overview";
import { requireAgencyMember } from "@/modules/partner/application/authorization";
import { logAction } from "@/lib/audit";

async function requireAgencyContext() {
  const auth = await requireAgencyMember();
  if (!auth.ok || !auth.session) {
    return { ok: false as const, error: auth.error ?? "Unauthorized" };
  }
  const agencyId = auth.session.user.agencyId as string;
  return { ok: true as const, agencyId, actor: auth.session.user.email ?? "agency" };
}

export async function getAgencyRevenue(_agencyId: string) {
  const ctx = await requireAgencyContext();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const agencyId = ctx.agencyId;

  try {
    // RCCF-43: the canonical DB financial source (CommissionEntry + reversals +
    // ledger + settlements) — never the legacy in-memory ledger.
    const { getPartnerRevenueSummary, resolveNetPendingEntries } = await import("@/lib/commission/runtime");
    const summary = await getPartnerRevenueSummary(agencyId);
    const netPending = await resolveNetPendingEntries(prisma, { partnerId: agencyId });

    const agencyWorkspaceIds = await prisma.workspace.findMany({
      where: { agencyId },
      select: { id: true },
    });
    const workspaceIdList = agencyWorkspaceIds.map((w) => w.id);

    const subscriptionData = workspaceIdList.length > 0 ? await prisma.billingInvoice.aggregate({
      where: { accountId: { in: workspaceIdList }, status: "PAID" },
      _sum: { amount: true },
      _count: true,
    }) : { _sum: { amount: null }, _count: 0 };

    await logAction("system", "agency:revenue-viewed", { agencyId }).catch(() => {});
    return {
      success: true,
      data: {
        grossCommission: summary.grossCommission,
        refundReversals: summary.refundReversals,
        netCommission: summary.netCommission,
        pendingCommission: summary.pending,
        availableCommission: summary.available,
        paidCommission: summary.paid,
        lifetimeCommission: summary.netCommission,
        pendingEntries: netPending.length,
        totalInvoiced: subscriptionData._sum.amount ?? 0,
        invoiceCount: subscriptionData._count,
        commissionEntryCount: summary.entryCount,
      },
    };
  } catch {
    return { success: false, error: "Failed to load revenue data" };
  }
}

export async function getAgencyPayouts(_agencyId: string) {
  const ctx = await requireAgencyContext();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const agencyId = ctx.agencyId;

  try {
    // RCCF-43: payout eligibility derives from the canonical DB summary.
    const { getPartnerRevenueSummary } = await import("@/lib/commission/runtime");
    const revenueSummary = await getPartnerRevenueSummary(agencyId);
    const eligibility = await payoutService.checkEligibility({
      partnerId: agencyId,
      availableBalance: revenueSummary.available,
      pendingBalance: revenueSummary.pending,
      hasVerifiedAccount: true,
      partnerActive: true,
    });

    const batches = await payoutService.getBatchesByPartner(agencyId);
    const summary = await payoutService.getSummary(agencyId);

    await logAction("system", "agency:payouts-viewed", { agencyId }).catch(() => {});
    return {
      success: true,
      data: {
        eligible: eligibility.eligible,
        availableBalance: eligibility.availableBalance,
        minimumThreshold: eligibility.minimumThreshold,
        meetsMinimum: eligibility.meetsMinimum,
        reasons: eligibility.reasons,
        totalBatches: summary.totalBatches,
        totalPaid: summary.totalNet,
        pendingCount: summary.pendingCount,
        completedCount: summary.completedCount,
        failedCount: summary.failedCount,
        recentBatches: batches.slice(0, 5).map((b) => ({
          id: b.id,
          status: b.status,
          amount: b.total,
          netAmount: b.netAmount,
          createdAt: b.createdAt,
          entryCount: b.entryCount,
        })),
      },
    };
  } catch {
    return { success: false, error: "Failed to load payout data" };
  }
}

export async function getAgencyPartnerStats(_agencyId: string) {
  const ctx = await requireAgencyContext();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const agencyId = ctx.agencyId;

  try {
    // RCCF-57 release closure: the legacy partnerService surface is removed
    // from authoritative agency reads. Client count + team count come from the
    // canonical AgencyTenant / WorkspaceMember models; no legacy capacity
    // numbers are surfaced.
    const clientCount = await prisma.agencyTenant.count({
      where: { agencyId, status: "ACTIVE" },
    });

    await logAction("system", "agency:partner-stats-viewed", { agencyId }).catch(() => {});
    return {
      success: true,
      data: {
        exists: true,
        totalClients: clientCount,
        teamMembers: await prisma.workspaceMember.count({
          where: { workspace: { agencyId }, status: "ACTIVE" },
        }),
      },
    };
  } catch {
    return { success: false, error: "Failed to load partner stats" };
  }
}

/**
 * RCCF-44 — canonical Partner financial overview (server-derived agency).
 * Gross / refunds / net / pending / paid / available + per-client breakdown +
 * transaction detail + settlement history, all from persisted financial records.
 */
export async function getAgencyFinancialOverview(_agencyId: string): Promise<{ success: boolean; data?: PartnerFinancialOverview; error?: string }> {
  const ctx = await requireAgencyContext();
  if (!ctx.ok) return { success: false, error: ctx.error };

  try {
    const { getAgencyFinancialOverview } = await import("@/modules/partner/application/financial-overview");
    const overview = await getAgencyFinancialOverview(ctx.agencyId);
    await logAction("system", "agency:financial-overview-viewed", { agencyId: ctx.agencyId }).catch(() => {});
    return { success: true, data: overview };
  } catch {
    return { success: false, error: "Failed to load financial overview" };
  }
}
