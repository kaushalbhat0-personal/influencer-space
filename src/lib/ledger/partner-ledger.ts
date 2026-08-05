import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability/error-tracker";

export type LedgerEntryType =
  | "COMMISSION_EARNED"
  | "COMMISSION_ADJUSTMENT"
  | "COMMISSION_REVERSED"
  | "SETTLEMENT_CREATED"
  | "SETTLEMENT_PAID"
  | "SETTLEMENT_CANCELLED"
  | "MANUAL_CREDIT"
  | "MANUAL_DEBIT"
  | "RECONCILIATION";

export interface PartnerLedgerEntry {
  id: string;
  partnerId: string;
  type: LedgerEntryType;
  amount: number;
  reference: string | null;
  referenceType: string | null;
  description: string;
  settlementId: string | null;
  commissionId: string | null;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
}

export interface PartnerBalance {
  partnerId: string;
  available: number;
  pending: number;
  paid: number;
  lifetime: number;
  lastUpdated: Date;
}

export class PartnerLedgerService {
  async addEntry(params: {
    partnerId: string;
    type: LedgerEntryType;
    amount: number;
    reference?: string;
    referenceType?: string;
    description: string;
    settlementId?: string;
    commissionId?: string;
  }): Promise<PartnerLedgerEntry> {
    const lastEntry = await prisma.partnerLedger.findFirst({
      where: { partnerId: params.partnerId },
      orderBy: { createdAt: "desc" },
      select: { balanceAfter: true },
    });
    const balanceBefore = lastEntry?.balanceAfter ?? 0;
    const balanceAfter = balanceBefore + params.amount;

    const entry = await prisma.partnerLedger.create({
      data: {
        partnerId: params.partnerId,
        type: params.type,
        amount: params.amount,
        reference: params.reference ?? null,
        referenceType: params.referenceType ?? null,
        description: params.description,
        settlementId: params.settlementId ?? null,
        commissionId: params.commissionId ?? null,
        balanceBefore,
        balanceAfter,
      },
    });

    return {
      id: entry.id,
      partnerId: entry.partnerId,
      type: entry.type as LedgerEntryType,
      amount: entry.amount,
      reference: entry.reference,
      referenceType: entry.referenceType,
      description: entry.description,
      settlementId: entry.settlementId,
      commissionId: entry.commissionId,
      balanceBefore: entry.balanceBefore,
      balanceAfter: entry.balanceAfter,
      createdAt: entry.createdAt,
    };
  }

  async getBalance(partnerId: string): Promise<PartnerBalance> {
    const lastEntry = await prisma.partnerLedger.findFirst({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
      select: { balanceAfter: true },
    });

    const earningsAgg = await prisma.partnerLedger.aggregate({
      where: { partnerId, type: "COMMISSION_EARNED" },
      _sum: { amount: true },
    });
    const settlementAgg = await prisma.partnerLedger.aggregate({
      where: { partnerId, type: { in: ["SETTLEMENT_PAID", "SETTLEMENT_CREATED"] } },
      _sum: { amount: true },
    });

    return {
      partnerId,
      available: lastEntry?.balanceAfter ?? 0,
      pending: 0,
      paid: settlementAgg._sum.amount ?? 0,
      lifetime: earningsAgg._sum.amount ?? 0,
      lastUpdated: new Date(),
    };
  }

  async getEntries(params: {
    partnerId?: string;
    type?: LedgerEntryType;
    limit?: number;
    offset?: number;
  }): Promise<{ items: PartnerLedgerEntry[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (params.partnerId) where.partnerId = params.partnerId;
    if (params.type) where.type = params.type;

    const [items, total] = await Promise.all([
      prisma.partnerLedger.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params.limit ?? 50,
        skip: params.offset ?? 0,
      }),
      prisma.partnerLedger.count({ where }),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        partnerId: e.partnerId,
        type: e.type as LedgerEntryType,
        amount: e.amount,
        reference: e.reference,
        referenceType: e.referenceType,
        description: e.description,
        settlementId: e.settlementId,
        commissionId: e.commissionId,
        balanceBefore: e.balanceBefore,
        balanceAfter: e.balanceAfter,
        createdAt: e.createdAt,
      })),
      total,
    };
  }

  async reconcile(partnerId: string): Promise<{ balance: number; ledgerBalance: number; entries: number }> {
    const entries = await prisma.partnerLedger.findMany({
      where: { partnerId, type: "COMMISSION_EARNED" },
      select: { amount: true },
    });
    const ledgerBalance = entries.reduce((sum, e) => sum + e.amount, 0);
    return { balance: ledgerBalance, ledgerBalance, entries: entries.length };
  }
}

export const partnerLedgerService = new PartnerLedgerService();
