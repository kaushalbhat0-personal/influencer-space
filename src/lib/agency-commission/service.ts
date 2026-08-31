// RCCF-LAUNCH-10 — Agency Product Commission Service
// Canonical source: ProductOrder (gross) - refunds = eligible × snapshot rate = earned
// No automated payouts. Idempotent per orderId. Historical rate preserved.

import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export interface AgencyCommissionRecord {
  id: string;
  orderId: string;
  agencyId: string;
  tenantId: string;
  grossAmount: number;
  refundAmount: number;
  eligibleRevenue: number;
  commissionRate: number;
  commissionEarned: number;
  paidAmount: number;
  outstanding: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Resolve commission rate for a creator-agency relationship.
// Hierarchy: AgencyTenant.productRevSharePercent → CommissionPolicy.agencyDefaultShare → 10% default.
export async function resolveProductCommissionRate(agencyId: string, tenantId: string): Promise<number> {
  const link = await prisma.agencyTenant.findUnique({
    where: { tenantId },
    select: { agencyId: true, productRevSharePercent: true },
  });
  if (link && link.agencyId === agencyId && link.productRevSharePercent > 0) {
    return Math.min(100, Math.max(0, round2(link.productRevSharePercent)));
  }
  const policy = await prisma.commissionPolicy.findFirst({ select: { agencyDefaultShare: true } });
  if (policy && policy.agencyDefaultShare > 0) return Math.min(100, Math.max(0, round2(policy.agencyDefaultShare)));
  return 10;
}

export async function computeAndPersistAgencyCommission(orderId: string): Promise<{ created: boolean; commissionId?: string; skipped?: string }> {
  const order = await prisma.productOrder.findUnique({ where: { id: orderId } });
  if (!order) return { created: false, skipped: "order_not_found" };
  if (order.status !== "COMPLETED") return { created: false, skipped: "not_completed" };

  const agencyLink = await prisma.agencyTenant.findUnique({ where: { tenantId: order.tenantId }, select: { agencyId: true, productRevSharePercent: true } });
  if (!agencyLink) return { created: false, skipped: "no_agency" };

  const existing = await prisma.agencyOrderCommission.findUnique({ where: { orderId } });
  if (existing) return { created: false, skipped: "already_exists" };

  const rate = await resolveProductCommissionRate(agencyLink.agencyId, order.tenantId);
  const gross = round2(order.amount);
  const refundPaise = order.refundAmount ?? 0;
  const refundAmount = round2(refundPaise / 100);
  const eligible = round2(Math.max(0, gross - refundAmount));
  const earned = round2((eligible * rate) / 100);
  const outstanding = earned; // paid=0 initially
  let status = "UNPAID";
  if (eligible <= 0 || earned <= 0) status = "VOID";

  try {
    const created = await prisma.agencyOrderCommission.create({
      data: {
        orderId: order.id,
        agencyId: agencyLink.agencyId,
        tenantId: order.tenantId,
        grossAmount: gross,
        refundAmount: refundPaise,
        eligibleRevenue: eligible,
        commissionRate: rate,
        commissionEarned: earned,
        paidAmount: 0,
        outstanding,
        status,
      },
    });
    // Persist snapshot rate on order for historical preservation (if column empty)
    if (order.agencyFeePercent == null) {
      await prisma.productOrder.update({ where: { id: order.id }, data: { agencyFeePercent: rate, agencyId: agencyLink.agencyId } }).catch(() => {});
    }
    await logAction("system", "agency_commission:created", { orderId, agencyId: agencyLink.agencyId, rate, earned }).catch(() => {});
    return { created: true, commissionId: created.id };
  } catch (e: unknown) {
    // Unique violation → idempotent (concurrent)
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique") || msg.includes("unique")) return { created: false, skipped: "already_exists" };
    throw e;
  }
}

export async function refreshAgencyCommissionForRefund(orderId: string): Promise<{ updated: boolean }> {
  const order = await prisma.productOrder.findUnique({ where: { id: orderId } });
  if (!order) return { updated: false };
  const commission = await prisma.agencyOrderCommission.findUnique({ where: { orderId } });
  if (!commission) {
    // If order was previously not commission-eligible but now refunded, still try to create if eligible
    if (order.status === "COMPLETED") {
      const res = await computeAndPersistAgencyCommission(orderId);
      if (res.created) return { updated: true };
    }
    return { updated: false };
  }
  const gross = round2(order.amount);
  const refundPaise = order.refundAmount ?? 0;
  const refundAmount = round2(refundPaise / 100);
  const eligible = round2(Math.max(0, gross - refundAmount));
  const earned = round2((eligible * commission.commissionRate) / 100);
  const paid = round2(commission.paidAmount);
  // Invariant: paid <= earned, outstanding >=0
  const clampedPaid = Math.min(paid, earned);
  const outstanding = round2(Math.max(0, earned - clampedPaid));
  let status: string;
  if (eligible <= 0 || earned <= 0) status = "VOID";
  else if (outstanding <= 0.009) status = "PAID";
  else if (paid > 0) status = "PARTIALLY_PAID";
  else status = "UNPAID";

  // If paid was clamped (overpaid due to refund shrink), preserve paid but outstanding 0; status PAID not VOID unless earned 0?
  // For fully refunded (earned 0) with previous paid >0, we keep VOID and outstanding 0; paid remains for audit (overpaid reflects clawback needed - reported via outstanding 0 but VOID).

  await prisma.agencyOrderCommission.update({
    where: { id: commission.id },
    data: {
      grossAmount: gross,
      refundAmount: refundPaise,
      eligibleRevenue: eligible,
      commissionEarned: earned,
      paidAmount: clampedPaid,
      outstanding,
      status,
    },
  });
  await logAction("system", "agency_commission:refreshed", { orderId, eligible, earned, refundPaise }).catch(() => {});
  return { updated: true };
}

export interface CommissionListParams {
  agencyId?: string;
  tenantId?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "grossAmount" | "commissionEarned";
  sortDir?: "asc" | "desc";
}

export async function listAgencyCommissions(params: CommissionListParams) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (params.agencyId) (where as { agencyId: string }).agencyId = params.agencyId;
  if (params.tenantId) (where as { tenantId: string }).tenantId = params.tenantId;
  if (params.status) (where as { status: string }).status = params.status;
  if (params.dateFrom || params.dateTo) {
    (where as { createdAt: unknown }).createdAt = {
      ...(params.dateFrom ? { gte: params.dateFrom } : {}),
      ...(params.dateTo ? { lte: params.dateTo } : {}),
    };
  }

  const orderBy = { [params.sortBy ?? "createdAt"]: params.sortDir ?? "desc" } as Record<string, string>;

  const [items, total] = await Promise.all([
    prisma.agencyOrderCommission.findMany({ where: where as never, orderBy: orderBy as never, skip, take: limit }),
    prisma.agencyOrderCommission.count({ where: where as never }),
  ]);

  // Totals (server-side aggregation over filtered set)
  const agg = await prisma.agencyOrderCommission.aggregate({
    where: where as never,
    _sum: { grossAmount: true, eligibleRevenue: true, commissionEarned: true, paidAmount: true, outstanding: true },
  });

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totals: {
      gross: round2(agg._sum.grossAmount ?? 0),
      eligible: round2(agg._sum.eligibleRevenue ?? 0),
      earned: round2(agg._sum.commissionEarned ?? 0),
      paid: round2(agg._sum.paidAmount ?? 0),
      outstanding: round2(agg._sum.outstanding ?? 0),
    },
  };
}

export async function getAgencyCommissionSummary(agencyId?: string) {
  const where: Record<string, unknown> = {};
  if (agencyId) (where as { agencyId: string }).agencyId = agencyId;
  const agg = await prisma.agencyOrderCommission.aggregate({
    where: where as never,
    _sum: { grossAmount: true, eligibleRevenue: true, commissionEarned: true, paidAmount: true, outstanding: true },
    _count: { _all: true },
  });
  return {
    totalEligibleSales: round2(agg._sum.eligibleRevenue ?? 0),
    totalCommissionEarned: round2(agg._sum.commissionEarned ?? 0),
    totalCommissionPaid: round2(agg._sum.paidAmount ?? 0),
    totalCommissionOutstanding: round2(agg._sum.outstanding ?? 0),
    count: agg._count._all ?? 0,
  };
}

// Manual payment: Super Admin records amount paid against one or more commissions.
// No automated transfer. Allocations are explicit and audited.
export async function recordManualPayment(input: {
  agencyId: string;
  amount: number;
  commissionIds?: string[];
  reference?: string;
  note?: string;
  adminId?: string;
  adminEmail?: string;
}): Promise<{ paymentId: string }> {
  const amount = round2(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  // Resolve commissions to allocate (if not specified, allocate oldest outstanding first)
  let targets: Array<{ id: string; outstanding: number }> = [];
  if (input.commissionIds?.length) {
    const rows = await prisma.agencyOrderCommission.findMany({
      where: { id: { in: input.commissionIds }, agencyId: input.agencyId },
      select: { id: true, outstanding: true, status: true },
    });
    if (rows.length !== input.commissionIds.length) throw new Error("Commission not found or mismatched agency");
    for (const r of rows) {
      if (r.outstanding <= 0) throw new Error(`Commission ${r.id} has no outstanding`);
      targets.push({ id: r.id, outstanding: round2(r.outstanding) });
    }
  } else {
    const rows = await prisma.agencyOrderCommission.findMany({
      where: { agencyId: input.agencyId, outstanding: { gt: 0 } },
      orderBy: { createdAt: "asc" },
      select: { id: true, outstanding: true },
    });
    targets = rows.map((r) => ({ id: r.id, outstanding: round2(r.outstanding) }));
  }

  const totalOutstanding = round2(targets.reduce((s, t) => s + t.outstanding, 0));
  if (amount > totalOutstanding + 0.01) throw new Error(`Amount exceeds outstanding (${totalOutstanding})`);

  // Allocate amount across commissions in order (FIFO)
  let remaining = amount;
  const allocations: Array<{ commissionId: string; amount: number }> = [];
  for (const t of targets) {
    if (remaining <= 0.009) break;
    const take = round2(Math.min(t.outstanding, remaining));
    if (take > 0) {
      allocations.push({ commissionId: t.id, amount: take });
      remaining = round2(remaining - take);
    }
  }
  if (Math.abs(remaining) > 0.01) throw new Error("Allocation failed — amount not fully allocated");

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.agencyCommissionPayment.create({
      data: {
        agencyId: input.agencyId,
        amount,
        reference: input.reference ?? null,
        note: input.note ?? null,
        adminId: input.adminId ?? null,
        adminEmail: input.adminEmail ?? null,
      },
    });
    for (const a of allocations) {
      await tx.agencyCommissionAllocation.create({
        data: { paymentId: p.id, commissionId: a.commissionId, amount: a.amount },
      });
      const c = await tx.agencyOrderCommission.findUnique({ where: { id: a.commissionId }, select: { paidAmount: true, commissionEarned: true } });
      if (!c) throw new Error("Commission disappeared");
      const newPaid = round2(c.paidAmount + a.amount);
      const newOutstanding = round2(Math.max(0, c.commissionEarned - newPaid));
      const newStatus = newOutstanding <= 0.009 ? "PAID" : newPaid > 0 ? "PARTIALLY_PAID" : "UNPAID";
      await tx.agencyOrderCommission.update({
        where: { id: a.commissionId },
        data: { paidAmount: newPaid, outstanding: newOutstanding, status: newStatus },
      });
    }
    return p;
  });

  await logAction(input.adminId ?? "system", "agency_commission:payment_recorded", {
    paymentId: payment.id,
    agencyId: input.agencyId,
    amount,
    allocations,
    reference: input.reference ?? null,
  }).catch(() => {});

  return { paymentId: payment.id };
}
