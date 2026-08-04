"use server";

/**
 * Agency analytics (IMPLEMENTATION-41): server-authoritative. The agencyId is
 * always taken from the authenticated session (never trusted from the client),
 * membership is re-validated against the agency workspace, and every read is
 * audited. No IDOR.
 */
import { partnerService } from "@/lib/partners";
import { commissionService } from "@/lib/commission";
import { payoutService } from "@/lib/payouts";
import { prisma } from "@/lib/prisma";
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
    const balance = await commissionService.getBalance(agencyId);
    const summary = await commissionService.getSummary(agencyId, "2024-01-01", "2027-12-31");

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
        pendingCommission: balance.pending,
        availableCommission: balance.available,
        paidCommission: balance.paid,
        lifetimeCommission: balance.lifetime,
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
    const balance = await commissionService.getBalance(agencyId);
    const eligibility = await payoutService.checkEligibility({
      partnerId: agencyId,
      availableBalance: balance.available,
      pendingBalance: balance.pending,
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
    const partner = await partnerService.get(agencyId);
    const stats = await partnerService.getDashboard(agencyId);

    const clientCount = await prisma.agencyTenant.count({
      where: { agencyId, status: "ACTIVE" },
    });

    await logAction("system", "agency:partner-stats-viewed", { agencyId }).catch(() => {});
    return {
      success: true,
      data: {
        exists: !!partner,
        totalClients: clientCount,
        workspaceUsage: stats?.workspaceUsage ?? { assigned: 0, capacity: 10, remaining: 10, percentUsed: 0 },
        clientUsage: stats?.clientUsage ?? { assigned: 0, capacity: 20, remaining: 20, percentUsed: 0 },
        pendingInvites: stats?.pendingInvites ?? 0,
        teamMembers: await prisma.workspaceMember.count({
          where: { workspace: { agencyId } },
        }),
      },
    };
  } catch {
    return { success: false, error: "Failed to load partner stats" };
  }
}
