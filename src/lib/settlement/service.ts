import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";
import { Prisma } from "@/generated/prisma/client";
import { partnerLedgerService } from "@/lib/ledger/partner-ledger";

export type SettlementStatus =
  | "PENDING" | "READY" | "APPROVED" | "REJECTED"
  | "PROCESSING" | "PAID" | "CANCELLED" | "FAILED" | "ARCHIVED";

const VALID_TRANSITIONS: Record<SettlementStatus, SettlementStatus[]> = {
  PENDING: ["READY", "REJECTED", "CANCELLED"],
  READY: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["PROCESSING", "CANCELLED"],
  REJECTED: ["PENDING"],
  PROCESSING: ["PAID", "FAILED"],
  PAID: ["ARCHIVED"],
  CANCELLED: [],
  FAILED: ["PENDING"],
  ARCHIVED: [],
};

export interface CreateSettlementParams {
  partnerId: string;
  partnerName?: string;
  commissionEntryIds?: string[];
  notes?: string;
}

export interface SettlementRow {
  id: string;
  partnerId: string;
  partnerName: string | null;
  status: SettlementStatus;
  provider: string;
  currency: string;
  totalAmount: number;
  feeAmount: number;
  netAmount: number;
  entryCount: number;
  approvedBy: string | null;
  approvedAt: Date | null;
  processedAt: Date | null;
  paidAt: Date | null;
  transferRef: string | null;
  transferMethod: string | null;
  notes: string | null;
  failureReason: string | null;
  settlementRef: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    commissionEntryId: string;
    amount: number;
    status: string;
  }>;
  attachments: Array<{
    id: string;
    type: string;
    url: string;
    filename: string | null;
  }>;
}

export class SettlementService {
  async createSettlement(params: CreateSettlementParams): Promise<{ settlement: SettlementRow | null; error?: string }> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        let entries: Array<{ id: string; partnerShare: number }> = [];

        if (params.commissionEntryIds?.length) {
          const existing = await tx.settlementItem.findMany({
            where: { commissionEntryId: { in: params.commissionEntryIds } },
            select: { commissionEntryId: true },
          });
          const reservedIds = new Set(existing.map((e) => e.commissionEntryId));
          const available = params.commissionEntryIds.filter((id) => !reservedIds.has(id));
          if (available.length === 0) return { settlement: null, error: "All selected commission entries are already reserved in another settlement." };

          const commissionEntries = await tx.commissionEntry.findMany({
            where: { id: { in: available }, status: "pending" },
            select: { id: true, partnerShare: true },
          });
          entries = commissionEntries;
        } else {
          const reservedEntries = await tx.settlementItem.findMany({
            select: { commissionEntryId: true },
          });
          const reservedIds = new Set(reservedEntries.map((r) => r.commissionEntryId));

          const pending = await tx.commissionEntry.findMany({
            where: { partnerId: params.partnerId, status: "pending", id: { notIn: Array.from(reservedIds) } },
            select: { id: true, partnerShare: true },
          });
          entries = pending;
        }

        if (entries.length === 0) return { settlement: null, error: "No available commission entries to settle." };

        const totalAmount = entries.reduce((sum, e) => sum + e.partnerShare, 0);
        const settlementRef = `STL-${Date.now().toString(36).toUpperCase()}-${params.partnerId.slice(0, 8)}`;

        const settlement = await tx.settlement.create({
          data: {
            partnerId: params.partnerId,
            partnerName: params.partnerName,
            status: "PENDING",
            provider: "manual",
            currency: "INR",
            totalAmount,
            feeAmount: 0,
            netAmount: totalAmount,
            entryCount: entries.length,
            settlementRef,
            notes: params.notes,
            items: {
              create: entries.map((e) => ({
                commissionEntryId: e.id,
                amount: e.partnerShare,
                status: "pending",
              })),
            },
          },
          include: { items: true, attachments: true },
        });

        return { settlement: serializeSettlement(settlement), error: undefined };
      });

      if (result.settlement) {
        logger.info("Settlement created", "settlement", { operation: "createSettlement", metadata: { settlementId: result.settlement.id, partnerId: params.partnerId, totalAmount: result.settlement.totalAmount, entryCount: result.settlement.entryCount } as Record<string, unknown> });
        partnerLedgerService.addEntry({
          partnerId: params.partnerId,
          type: "SETTLEMENT_CREATED",
          amount: result.settlement.netAmount,
          reference: result.settlement.id,
          referenceType: "settlement",
          description: `Settlement ${result.settlement.settlementRef} created (${result.settlement.entryCount} entries, ₹${result.settlement.netAmount})`,
          settlementId: result.settlement.id,
        }).catch((err) => captureError(err, { service: "settlement", operation: "ledger-create" }));
      }
      return result;
    } catch (err) {
      captureError(err, { service: "settlement", operation: "createSettlement" });
      throw err;
    }
  }

  async updateStatus(id: string, status: SettlementStatus, metadata?: { approvedBy?: string; transferRef?: string; transferMethod?: string; failureReason?: string; notes?: string }): Promise<{ settlement: SettlementRow | null; error?: string }> {
    const existing = await prisma.settlement.findUnique({ where: { id }, include: { items: true } });
    if (!existing) return { settlement: null, error: "Settlement not found." };

    const currentStatus = existing.status as SettlementStatus;
    if (!VALID_TRANSITIONS[currentStatus]?.includes(status)) {
      return { settlement: null, error: `Cannot transition from ${currentStatus} to ${status}.` };
    }

    const update: Prisma.SettlementUpdateInput = { status, updatedAt: new Date() };
    if (status === "APPROVED") {
      update.approvedBy = metadata?.approvedBy;
      update.approvedAt = new Date();
    }
    if (status === "PROCESSING") update.processedAt = new Date();
    if (status === "PAID") {
      update.paidAt = new Date();
      update.transferRef = metadata?.transferRef;
      update.transferMethod = metadata?.transferMethod;
    }
    if (status === "FAILED") update.failureReason = metadata?.failureReason;
    if (metadata?.notes) update.notes = metadata.notes;

    const settlement = await prisma.settlement.update({
      where: { id },
      data: update,
      include: { items: true, attachments: true },
    });

    if (status === "PAID") {
      for (const item of existing.items) {
        const existingDesc = await prisma.commissionEntry.findUnique({ where: { id: item.commissionEntryId }, select: { description: true } });
        await prisma.commissionEntry.update({
          where: { id: item.commissionEntryId },
          data: { status: "cleared", clearedAt: new Date(), description: `${existingDesc?.description ?? ""} | settled:${settlement.settlementRef}` },
        });
      }
      logger.info("Settlement paid", "settlement", { operation: "updateStatus", metadata: { settlementId: id, partnerId: settlement.partnerId, amount: settlement.totalAmount, transferRef: metadata?.transferRef } as Record<string, unknown> });
      partnerLedgerService.addEntry({
        partnerId: settlement.partnerId,
        type: "SETTLEMENT_PAID",
        amount: settlement.netAmount,
        reference: settlement.id,
        referenceType: "settlement",
        description: `Settlement ${settlement.settlementRef} paid via ${metadata?.transferRef || "manual transfer"}`,
        settlementId: settlement.id,
      }).catch((err) => captureError(err, { service: "settlement", operation: "ledger-paid" }));
    }

    if (status === "CANCELLED") {
      partnerLedgerService.addEntry({
        partnerId: settlement.partnerId,
        type: "SETTLEMENT_CANCELLED",
        amount: -Math.abs(settlement.netAmount),
        reference: settlement.id,
        description: `Settlement ${settlement.settlementRef} cancelled`,
        settlementId: settlement.id,
      }).catch((err) => captureError(err, { service: "settlement", operation: "ledger-cancelled" }));
    }

    return { settlement: serializeSettlement(settlement) };
  }

  async listSettlements(params: { partnerId?: string; status?: SettlementStatus; limit?: number; offset?: number }): Promise<{ items: SettlementRow[]; total: number }> {
    const where: Prisma.SettlementWhereInput = {};
    if (params.partnerId) where.partnerId = params.partnerId;
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        include: { items: true, attachments: true },
        orderBy: { createdAt: "desc" },
        take: params.limit ?? 50,
        skip: params.offset ?? 0,
      }),
      prisma.settlement.count({ where }),
    ]);

    return { items: items.map(serializeSettlement), total };
  }

  async getSettlement(id: string): Promise<SettlementRow | null> {
    const s = await prisma.settlement.findUnique({
      where: { id },
      include: { items: true, attachments: true },
    });
    return s ? serializeSettlement(s) : null;
  }

  async getPartnerSettlementSummary(partnerId: string): Promise<{
    totalSettled: number;
    pendingSettlements: number;
    lastSettlement: SettlementRow | null;
  }> {
    const [settledAgg, pendingCount, lastSettlement] = await Promise.all([
      prisma.settlement.aggregate({
        where: { partnerId, status: { in: ["PAID", "ARCHIVED"] } },
        _sum: { netAmount: true },
      }),
      prisma.settlement.count({ where: { partnerId, status: { in: ["PENDING", "READY", "APPROVED", "PROCESSING"] } } }),
      prisma.settlement.findFirst({
        where: { partnerId, status: { in: ["PAID", "ARCHIVED"] } },
        orderBy: { createdAt: "desc" },
        include: { items: true, attachments: true },
      }),
    ]);

    return {
      totalSettled: settledAgg._sum.netAmount ?? 0,
      pendingSettlements: pendingCount,
      lastSettlement: lastSettlement ? serializeSettlement(lastSettlement) : null,
    };
  }

  async attachFile(id: string, type: string, url: string, filename?: string, uploadedBy?: string): Promise<void> {
    await prisma.settlementAttachment.create({
      data: { settlementId: id, type, url, filename, uploadedBy },
    });
  }
}

function serializeSettlement(
  s: Prisma.SettlementGetPayload<{ include: { items: true; attachments: true } }>,
): SettlementRow {
  return {
    id: s.id,
    partnerId: s.partnerId,
    partnerName: s.partnerName,
    status: s.status as SettlementStatus,
    provider: s.provider,
    currency: s.currency,
    totalAmount: s.totalAmount,
    feeAmount: s.feeAmount,
    netAmount: s.netAmount,
    entryCount: s.entryCount,
    approvedBy: s.approvedBy,
    approvedAt: s.approvedAt,
    processedAt: s.processedAt,
    paidAt: s.paidAt,
    transferRef: s.transferRef,
    transferMethod: s.transferMethod,
    notes: s.notes,
    failureReason: s.failureReason,
    settlementRef: s.settlementRef,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    items: s.items.map((i: { id: string; commissionEntryId: string; amount: number; status: string }) => ({ id: i.id, commissionEntryId: i.commissionEntryId, amount: i.amount, status: i.status })),
    attachments: s.attachments.map((a: { id: string; type: string; url: string; filename: string | null }) => ({ id: a.id, type: a.type, url: a.url, filename: a.filename })),
  };
}

export const settlementService = new SettlementService();
