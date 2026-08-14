import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared commission/ledger/settlement state for the canonical financial source.
const h = vi.hoisted(() => {
  const entries: Array<Record<string, unknown>> = [];
  const settlements: Array<{ partnerId: string; commissionEntryId: string }> = [];
  const ledgerPaid: Array<{ partnerId: string; amount: number }> = [];
  return {
    entries,
    settlements,
    ledgerPaid,
    reset: () => { entries.length = 0; settlements.length = 0; ledgerPaid.length = 0; },
    mockLoyaltyCount: vi.fn(),
  };
});

function mockPrismaAggregate(where: Record<string, unknown>): { _sum: { partnerShare: number | null } } {
  const partnerId = where.partnerId as string;
  const entryType = where.entryType as unknown;
  const parentEntryId = where.parentEntryId as { in?: string[] } | undefined;
  const rows = h.entries.filter((e) => {
    if (partnerId && e.partnerId !== partnerId) return false;
    if (entryType) {
      if (typeof entryType === "object" && (entryType as { startsWith?: string }).startsWith) {
        if (!String(e.entryType).startsWith((entryType as { startsWith: string }).startsWith)) return false;
      } else if (typeof entryType === "string") {
        if (e.entryType !== entryType) return false;
      }
    }
    if (parentEntryId?.in && !parentEntryId.in.includes(e.parentEntryId as string)) return false;
    return true;
  });
  const sum = rows.reduce((s, r) => s + (r.partnerShare as number), 0);
  return { _sum: { partnerShare: Math.round(sum * 100) / 100 } };
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    commissionEntry: {
      aggregate: async ({ where }: { where: Record<string, unknown> }) => mockPrismaAggregate(where),
      count: async ({ where }: { where: Record<string, unknown> }) => {
        const partnerId = where.partnerId as string;
        return h.entries.filter((e) => !partnerId || e.partnerId === partnerId).length;
      },
      findMany: async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, unknown> }) => {
        const partnerId = where.partnerId as string | undefined;
        const status = where.status as string | undefined;
        const ids = (where.id as { in?: string[] })?.in;
        const notIds = (where.id as { notIn?: string[] })?.notIn;
        const parentIds = (where.parentEntryId as { in?: string[] })?.in;
        let rows = h.entries.filter((e) =>
          (!partnerId || e.partnerId === partnerId) &&
          (!status || e.status === status) &&
          (!ids || ids.includes(e.id as string)) &&
          (!notIds || !notIds.includes(e.id as string)) &&
          (!parentIds || (parentIds.includes(e.parentEntryId as string) && e.parentEntryId !== undefined)),
        );
        if (select) rows = rows.map((e) => ({ id: e.id, partnerShare: e.partnerShare, parentEntryId: e.parentEntryId }));
        return rows;
      },
    },
    partnerLedger: {
      aggregate: async ({ where }: { where: Record<string, unknown> }) => {
        const sum = h.ledgerPaid.filter((l) => l.partnerId === where.partnerId).reduce((s, l) => s + l.amount, 0);
        return { _sum: { amount: sum } };
      },
    },
    settlementItem: {
      findMany: async ({ where }: { where: { settlement?: { partnerId?: string }; commissionEntryId?: { in?: string[] } } }) => {
        const partnerId = where.settlement?.partnerId;
        const ids = where.commissionEntryId?.in;
        return h.settlements
          .filter((s) => (!partnerId || s.partnerId === partnerId) && (!ids || ids.includes(s.commissionEntryId)))
          .map((s) => ({ commissionEntryId: s.commissionEntryId }));
      },
    },
    billingSubscription: { count: async () => 0 },
    $transaction: async (cb: (tx: unknown) => unknown) => cb({
      partnerLedger: { aggregate: async () => ({ _sum: { amount: 0 } }) },
      settlementItem: { findMany: async () => [] },
      commissionEntry: { findMany: async ({ where }: { where: Record<string, unknown> }) => {
        const ids = (where.id as { in?: string[] })?.in;
        const status = where.status as string | undefined;
        return h.entries.filter((e) => (!status || e.status === status) && (!ids || ids.includes(e.id as string))).map((e) => ({ id: e.id, partnerShare: e.partnerShare, parentEntryId: e.parentEntryId }));
      } },
      settlement: {
        create: async ({ data }: { data: { partnerId: string; items: { create: Array<{ commissionEntryId: string; amount: number }> } } }) => {
          for (const item of data.items.create) {
            h.settlements.push({ partnerId: data.partnerId, commissionEntryId: item.commissionEntryId });
          }
          return { id: "stl", partnerId: data.partnerId, totalAmount: data.items.create.reduce((s, i) => s + i.amount, 0), items: data.items.create.map((i) => ({ ...i, id: "si", status: "pending" })), attachments: [] };
        },
      },
    }),
  },
}));
vi.mock("@/lib/commission/loyalty", () => ({ getActiveClientCount: h.mockLoyaltyCount, resolveLoyaltyTier: vi.fn() }));

import { getPartnerRevenueSummary, resolveNetPendingEntries } from "@/lib/commission/runtime";
import { settlementService } from "@/lib/settlement";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockLoyaltyCount.mockResolvedValue(0);
});

describe("RCCF-43 — reserved-entry isolation (partner-scoped)", () => {
  it("Partner A's reserved entry never suppresses Partner B's pending summary", async () => {
    h.entries.push({ id: "ce-A", partnerId: A, partnerShare: 200, status: "pending", entryType: "subscription_created" });
    h.entries.push({ id: "ce-B", partnerId: B, partnerShare: 300, status: "pending", entryType: "subscription_created" });
    h.settlements.push({ partnerId: A, commissionEntryId: "ce-A" });

    const aSummary = await getPartnerRevenueSummary(A);
    const bSummary = await getPartnerRevenueSummary(B);

    // A's reserved entry is excluded from A's pending.
    expect(aSummary.pending).toBe(0);
    // B's unreserved entry is NOT hidden by A's reservation.
    expect(bSummary.pending).toBe(300);
    expect(bSummary.available).toBe(300);
  });
});

describe("RCCF-43 — canonical summary breakdown with partial refund", () => {
  it("grossCommission − refundReversals = netCommission, pending reflects net", async () => {
    h.entries.push({ id: "ce-1", partnerId: A, partnerShare: 300, status: "pending", entryType: "subscription_created" });
    h.entries.push({ id: "ce-r", partnerId: A, partnerShare: -120, status: "reversed", entryType: "refund_reversal", parentEntryId: "ce-1" });

    const s = await getPartnerRevenueSummary(A);

    expect(s.grossCommission).toBe(300);
    expect(s.refundReversals).toBe(-120);
    expect(s.netCommission).toBe(180);
    expect(s.pending).toBe(180); // unrefunded remainder, not the gross 300
  });
});

describe("RCCF-43 — settlement settles the NET (partial refund remainder)", () => {
  it("a partially refunded commission settles only ₹180 (not ₹300)", async () => {
    h.entries.push({ id: "ce-1", partnerId: A, partnerShare: 300, status: "pending", entryType: "subscription_created" });
    h.entries.push({ id: "ce-r", partnerId: A, partnerShare: -120, status: "reversed", entryType: "refund_reversal", parentEntryId: "ce-1" });

    const result = await settlementService.createSettlement({ partnerId: A, commissionEntryIds: ["ce-1"] });

    expect(result.settlement).not.toBeNull();
    expect(result.settlement!.totalAmount).toBe(180);
    expect(result.settlement!.items[0].amount).toBe(180);
  });

  it("a fully reversed commission cannot settle (net ≤ 0 excluded)", async () => {
    h.entries.push({ id: "ce-1", partnerId: A, partnerShare: 300, status: "reversed", entryType: "subscription_created" });
    h.entries.push({ id: "ce-r", partnerId: A, partnerShare: -300, status: "reversed", entryType: "refund_reversal", parentEntryId: "ce-1" });

    const result = await settlementService.createSettlement({ partnerId: A, commissionEntryIds: ["ce-1"] });

    expect(result.settlement).toBeNull();
    expect(result.error).toMatch(/no available/i);
  });
});

describe("RCCF-43 — resolveNetPendingEntries", () => {
  it("nets a pending original against its reversal children", async () => {
    h.entries.push({ id: "ce-1", partnerId: A, partnerShare: 200, status: "pending", entryType: "subscription_created" });
    h.entries.push({ id: "ce-r", partnerId: A, partnerShare: -60, status: "reversed", entryType: "refund_reversal", parentEntryId: "ce-1" });

    const net = await resolveNetPendingEntries({ commissionEntry: { findMany: async ({ where }: { where: Record<string, unknown> }) => {
      const ids = (where.id as { in?: string[] })?.in;
      const parentIds = (where.parentEntryId as { in?: string[] })?.in;
      if (parentIds) return h.entries.filter((e) => parentIds.includes(e.parentEntryId as string)).map((e) => ({ parentEntryId: e.parentEntryId, partnerShare: e.partnerShare }));
      return h.entries.filter((e) => !ids || ids.includes(e.id as string)).map((e) => ({ id: e.id, partnerShare: e.partnerShare }));
    } } } as never, { partnerId: A });

    expect(net).toEqual([{ id: "ce-1", netShare: 140 }]);
  });
});
