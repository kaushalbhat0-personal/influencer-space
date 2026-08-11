"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  getPlatformRevenueSummary,
  getRevenueRuntimeHealth,
  getPartnerRevenueSummary,
} from "@/lib/commission/runtime";
import { getLoyaltyProgress } from "@/lib/commission/loyalty";
import {
  createPayoutForSettlement,
  approvePayout,
  processPayout,
  retryFailedPayout,
  listPayouts,
  getPayoutSummary,
} from "@/lib/payouts/runtime";
import { settlementService } from "@/lib/settlement";

async function requireSuperAdmin(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPER_ADMIN") return null;
  return session.user.email ?? session.user.name ?? "superadmin";
}

/** Phase 13/14 — everything the Super Admin Revenue Center needs. */
export async function getRevenueCenterData(): Promise<{
  ok: boolean;
  platform?: Awaited<ReturnType<typeof getPlatformRevenueSummary>>;
  health?: Awaited<ReturnType<typeof getRevenueRuntimeHealth>>;
  payouts?: Awaited<ReturnType<typeof listPayouts>>;
  payoutSummary?: Awaited<ReturnType<typeof getPayoutSummary>>;
  settlements?: Array<{ id: string; partnerId: string; partnerName: string | null; status: string; totalAmount: number; netAmount: number; entryCount: number; settlementRef: string; createdAt: string }>;
  commissionEntries?: Array<{ id: string; partnerId: string; planCode: string; amount: number; platformShare: number; partnerShare: number; status: string; createdAt: string }>;
  error?: string;
}> {
  const actor = await requireSuperAdmin();
  if (!actor) return { ok: false, error: "Unauthorized" };

  const [platform, health, payouts, payoutSummary, settlements, commissionEntries] = await Promise.all([
    getPlatformRevenueSummary(),
    getRevenueRuntimeHealth(),
    listPayouts({ limit: 50 }),
    getPayoutSummary(),
    prisma.settlement.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, partnerId: true, partnerName: true, status: true, totalAmount: true, netAmount: true, entryCount: true, settlementRef: true, createdAt: true } }),
    prisma.commissionEntry.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, partnerId: true, planCode: true, amount: true, platformShare: true, partnerShare: true, status: true, createdAt: true } }),
  ]);

  return {
    ok: true,
    platform,
    health,
    payouts,
    payoutSummary,
    settlements: settlements.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
    commissionEntries: commissionEntries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
  };
}

/** Phase 6 — create a settlement from a partner's pending commission entries. */
export async function createSettlementAction(partnerId: string, entryIds?: string[]): Promise<{ success: boolean; error?: string }> {
  const actor = await requireSuperAdmin();
  if (!actor) return { success: false, error: "Unauthorized" };
  const result = await settlementService.createSettlement({ partnerId, commissionEntryIds: entryIds });
  if (result.settlement) {
    revalidatePath("/super-admin/revenue-center");
    return { success: true };
  }
  return { success: false, error: result.error ?? "Settlement creation failed" };
}

/** Phase 6 — transition a settlement (APPROVED / PROCESSING / PAID / CANCELLED). */
export async function updateSettlementAction(id: string, status: string, metadata?: { transferRef?: string; transferMethod?: string; failureReason?: string; approvedBy?: string }): Promise<{ success: boolean; error?: string }> {
  const actor = await requireSuperAdmin();
  if (!actor) return { success: false, error: "Unauthorized" };
  const result = await settlementService.updateStatus(id, status as never, metadata);
  if (result.settlement) {
    revalidatePath("/super-admin/revenue-center");
    return { success: true };
  }
  return { success: false, error: result.error ?? "Settlement update failed" };
}

/** Phase 7 — create a payout from an APPROVED settlement. */
export async function createPayoutAction(settlementId: string): Promise<{ success: boolean; batchId?: string; error?: string }> {
  const actor = await requireSuperAdmin();
  if (!actor) return { success: false, error: "Unauthorized" };
  const result = await createPayoutForSettlement(settlementId, actor);
  if (result.success) {
    revalidatePath("/super-admin/revenue-center");
  }
  return result;
}

export async function approvePayoutAction(batchId: string): Promise<{ success: boolean; error?: string }> {
  const actor = await requireSuperAdmin();
  if (!actor) return { success: false, error: "Unauthorized" };
  const result = await approvePayout(batchId, actor);
  if (result.success) revalidatePath("/super-admin/revenue-center");
  return result;
}

export async function processPayoutAction(batchId: string): Promise<{ success: boolean; status?: string; error?: string }> {
  const actor = await requireSuperAdmin();
  if (!actor) return { success: false, error: "Unauthorized" };
  const result = await processPayout(batchId);
  revalidatePath("/super-admin/revenue-center");
  return result;
}

export async function retryPayoutAction(batchId: string): Promise<{ success: boolean; error?: string }> {
  const actor = await requireSuperAdmin();
  if (!actor) return { success: false, error: "Unauthorized" };
  const result = await retryFailedPayout(batchId);
  if (result.success) revalidatePath("/super-admin/revenue-center");
  return result;
}

/** Phase 8 — agency revenue dashboard data (AGENCY-gated). */
export async function getAgencyRevenueData(agencyId: string): Promise<{
  ok: boolean;
  summary?: Awaited<ReturnType<typeof getPartnerRevenueSummary>>;
  payoutSummary?: Awaited<ReturnType<typeof getPayoutSummary>>;
  entries?: Array<{ id: string; planCode: string; amount: number; partnerShare: number; status: string; createdAt: string }>;
  loyalty?: Awaited<ReturnType<typeof getLoyaltyProgress>>;
  error?: string;
}> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN" && role !== "AGENCY_ADMIN" && role !== "AGENCY_STAFF") {
    return { ok: false, error: "Unauthorized" };
  }

  const [summary, payoutSummary, entries, loyalty] = await Promise.all([
    getPartnerRevenueSummary(agencyId),
    getPayoutSummary(agencyId),
    prisma.commissionEntry.findMany({ where: { partnerId: agencyId }, orderBy: { createdAt: "desc" }, take: 25, select: { id: true, planCode: true, amount: true, partnerShare: true, status: true, createdAt: true } }),
    getLoyaltyProgress(agencyId),
  ]);

  return {
    ok: true,
    summary,
    payoutSummary,
    loyalty,
    entries: entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
  };
}
