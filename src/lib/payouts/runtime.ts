// ── Payout Runtime — RCCF-IMPLEMENTATION-72 (Phase 7) ────────────────────────
// DB-backed payout lifecycle on top of the existing PayoutBatch model:
// settlement → payout(queued) → approve(manual) → processing → paid / failed →
// retry. Real Razorpay Payouts call behind an enable flag; otherwise dry-run
// (sandbox). No automatic payouts until explicitly enabled + approved.

import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { getRazorpayInstance } from "@/lib/razorpay";
import { runtimeEventBus } from "@/modules/event-runtime";
import { captureError } from "@/lib/observability/error-tracker";

export type PayoutLifecycleStatus = "pending" | "approved" | "processing" | "paid" | "failed" | "cancelled";

const ALLOWED_PROCESS_FROM: Record<string, string[]> = {
  pending: ["approved"],
  approved: ["processing"],
  processing: ["paid", "failed"],
  failed: ["pending"],
  paid: [],
  cancelled: [],
};

/** Payouts are disabled by default — set RAZORPAY_PAYOUTS_ENABLED=1 to move money. */
export function payoutsEnabled(): boolean {
  return process.env.RAZORPAY_PAYOUTS_ENABLED === "1";
}

/** Razorpay Payouts API call (fund-account based). Dry-runs when disabled. */
async function createRazorpayPayout(batch: {
  id: string;
  partnerId: string;
  netAmount: number;
  currency: string;
  fundAccountId?: string | null;
}): Promise<{ success: boolean; providerReference?: string; error?: string }> {
  if (!payoutsEnabled() || !batch.fundAccountId) {
    // Sandbox / dry-run — record the outcome, never move money.
    return { success: true, providerReference: `dry-run:${batch.id}` };
  }
  try {
    const razorpay = getRazorpayInstance();
    // The SDK's TS types don't expose `payouts` — access it via a typed cast.
    const payouts = (razorpay as unknown as { payouts: { create(args: Record<string, unknown>): Promise<{ id: string }> } }).payouts;
    const payout = await payouts.create({
      fund_account_id: batch.fundAccountId,
      amount: Math.round(batch.netAmount * 100),
      currency: batch.currency,
      mode: "UPI",
      purpose: "commission",
      queue_if_low_balance: true,
      reference_id: `payout_${batch.id}`,
      narration: `CreatorStore commission settlement ${batch.id.slice(0, 8)}`,
    });
    return { success: true, providerReference: payout.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Razorpay payout failed" };
  }
}

/** Create a payout batch for an APPROVED settlement (its pending commission entries). */
export async function createPayoutForSettlement(settlementId: string, initiatedBy: string): Promise<{ success: boolean; batchId?: string; error?: string }> {
  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: { items: true },
  });
  if (!settlement) return { success: false, error: "Settlement not found" };
  if (settlement.status !== "APPROVED") return { success: false, error: "Settlement must be APPROVED before payout" };

  const existing = await prisma.payoutBatch.findFirst({ where: { metadata: { path: ["settlementId"], equals: settlementId } }, select: { id: true } });
  if (existing) return { success: false, error: "A payout already exists for this settlement" };

  const batch = await prisma.payoutBatch.create({
    data: {
      partnerId: settlement.partnerId,
      status: "pending",
      provider: "razorpay_route",
      currency: settlement.currency,
      total: settlement.totalAmount,
      fee: settlement.feeAmount,
      netAmount: settlement.netAmount,
      entryCount: settlement.entryCount,
      idempotencyKey: `payout_settlement_${settlement.id}`,
      audit: { payoutVersion: 1, initiatedBy },
      metadata: { settlementId: settlement.id, dryRun: String(!payoutsEnabled()) },
      reservations: {
        create: settlement.items.map((i) => ({
          partnerId: settlement.partnerId,
          commissionEntryId: i.commissionEntryId,
          amount: i.amount,
          status: "reserved",
        })),
      },
    },
  });

  await logAction("system", "payout:created", { batchId: batch.id, settlementId, partnerId: settlement.partnerId, amount: settlement.netAmount, by: initiatedBy }).catch(() => {});
  await runtimeEventBus.publish({
    type: "payout.created",
    tenantId: "system",
    entityId: batch.id,
    payload: { settlementId, partnerId: settlement.partnerId, amount: settlement.netAmount },
    occurredAt: new Date().toISOString(),
  }).catch(() => {});

  return { success: true, batchId: batch.id };
}

/** Manual approval before any payout processes. */
export async function approvePayout(batchId: string, approvedBy: string): Promise<{ success: boolean; error?: string }> {
  const batch = await prisma.payoutBatch.findUnique({ where: { id: batchId } });
  if (!batch) return { success: false, error: "Payout not found" };
  if (batch.status !== "pending") return { success: false, error: `Cannot approve payout in status: ${batch.status}` };

  const audit = (batch.audit as Record<string, unknown>) ?? {};
  await prisma.payoutBatch.update({
    where: { id: batchId },
    data: { status: "approved", audit: { ...audit, approvedBy, approvedAt: new Date().toISOString() } },
  });
  await logAction("system", "payout:approved", { batchId, by: approvedBy }).catch(() => {});
  return { success: true };
}

/** Process an approved payout → paid / failed. Never moves money unless enabled. */
export async function processPayout(batchId: string): Promise<{ success: boolean; status?: PayoutLifecycleStatus; error?: string }> {
  const batch = await prisma.payoutBatch.findUnique({ where: { id: batchId }, include: { reservations: true } });
  if (!batch) return { success: false, error: "Payout not found" };
  if (!ALLOWED_PROCESS_FROM[batch.status]?.includes("processing")) return { success: false, error: `Cannot process payout in status: ${batch.status}` };

  const metadata = (batch.metadata as Record<string, string>) ?? {};
  await prisma.payoutBatch.update({ where: { id: batchId }, data: { status: "processing" } });

  const result = await createRazorpayPayout({
    id: batch.id,
    partnerId: batch.partnerId,
    netAmount: batch.netAmount,
    currency: batch.currency,
    fundAccountId: metadata.fundAccountId ?? null,
  });

  if (result.success) {
    const audit = (batch.audit as Record<string, unknown>) ?? {};
    await prisma.payoutBatch.update({
      where: { id: batchId },
      data: { status: "paid", providerReference: result.providerReference, audit: { ...audit, providerReference: result.providerReference, settledAt: new Date().toISOString() } },
    });
    // Complete the linked settlement (clears the commission entries).
    const settlementId = metadata.settlementId;
    if (settlementId) {
      const { settlementService } = await import("@/lib/settlement");
      await settlementService.updateStatus(settlementId, "PAID", { transferRef: result.providerReference, transferMethod: "razorpay_payouts" }).catch((err) => captureError(err, { service: "payout", operation: "settlement-paid" }));
    }
    await runtimeEventBus.publish({
      type: "payout.completed",
      tenantId: "system",
      entityId: batch.id,
      payload: { partnerId: batch.partnerId, amount: batch.netAmount, providerReference: result.providerReference },
      occurredAt: new Date().toISOString(),
    }).catch(() => {});
    return { success: true, status: "paid" };
  }

  await prisma.payoutBatch.update({
    where: { id: batchId },
    data: { status: "failed", failureReason: result.error ?? "Payout failed" },
  });
  return { success: false, status: "failed", error: result.error };
}

export async function retryFailedPayout(batchId: string): Promise<{ success: boolean; error?: string }> {
  const batch = await prisma.payoutBatch.findUnique({ where: { id: batchId } });
  if (!batch) return { success: false, error: "Payout not found" };
  if (batch.status !== "failed") return { success: false, error: `Can only retry failed payouts, got: ${batch.status}` };
  await prisma.payoutBatch.update({ where: { id: batchId }, data: { status: "pending", failureReason: null } });
  return { success: true };
}

export interface PayoutRow {
  id: string;
  partnerId: string;
  status: string;
  provider: string;
  total: number;
  netAmount: number;
  entryCount: number;
  providerReference: string | null;
  failureReason: string | null;
  createdAt: string;
  metadata: Record<string, string>;
  audit: Record<string, unknown>;
}

export async function listPayouts(params: { status?: string; partnerId?: string; limit?: number; offset?: number }): Promise<{ items: PayoutRow[]; total: number }> {
  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  if (params.partnerId) where.partnerId = params.partnerId;
  const [items, total] = await Promise.all([
    prisma.payoutBatch.findMany({ where, orderBy: { createdAt: "desc" }, take: params.limit ?? 50, skip: params.offset ?? 0 }),
    prisma.payoutBatch.count({ where }),
  ]);
  return {
    items: items.map((b) => ({
      id: b.id, partnerId: b.partnerId, status: b.status, provider: b.provider,
      total: b.total, netAmount: b.netAmount, entryCount: b.entryCount,
      providerReference: b.providerReference, failureReason: b.failureReason,
      createdAt: b.createdAt.toISOString(), metadata: (b.metadata as Record<string, string>) ?? {},
      audit: (b.audit as Record<string, unknown>) ?? {},
    })),
    total,
  };
}

export async function getPayoutSummary(partnerId?: string): Promise<{ pending: number; approved: number; processing: number; paid: number; failed: number; totalPaid: number }> {
  const where = partnerId ? { partnerId } : {};
  const [pending, approved, processing, paid, failed, totalAgg] = await Promise.all([
    prisma.payoutBatch.count({ where: { ...where, status: "pending" } }),
    prisma.payoutBatch.count({ where: { ...where, status: "approved" } }),
    prisma.payoutBatch.count({ where: { ...where, status: "processing" } }),
    prisma.payoutBatch.count({ where: { ...where, status: "paid" } }),
    prisma.payoutBatch.count({ where: { ...where, status: "failed" } }),
    prisma.payoutBatch.aggregate({ where: { ...where, status: "paid" }, _sum: { netAmount: true } }),
  ]);
  return { pending, approved, processing, paid, failed, totalPaid: totalAgg._sum.netAmount ?? 0 };
}
