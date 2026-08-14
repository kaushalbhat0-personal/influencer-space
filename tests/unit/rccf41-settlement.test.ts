import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const reserved = new Set<string>();
  return {
    reserved,
    reset: () => reserved.clear(),
    mockLedgerAdd: vi.fn(),
  };
});

vi.mock("@/lib/ledger/partner-ledger", () => ({ partnerLedgerService: { addEntry: h.mockLedgerAdd } }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn() } }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    settlement: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    commissionEntry: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      findMany: async ({ where }: { where: { id?: { in: string[] }; partnerId?: string; status?: string } }) => {
        const pool = [
          { id: "ce-1", partnerShare: 200, status: "pending" },
          { id: "ce-2", partnerShare: 300, status: "pending" },
        ];
        let rows = pool.filter((r) => (where.status === undefined || r.status === where.status));
        if (where.id?.in) rows = rows.filter((r) => where.id!.in!.includes(r.id));
        if (where.partnerId) rows = rows.filter((r) => r.partnerId === where.partnerId);
        return rows.filter((r) => !h.reserved.has(r.id));
      },
    },
    $transaction: async (cb: (tx: unknown) => unknown) => cb({
      partnerLedger: {
        aggregate: async () => ({ _sum: { amount: 0 } }),
      },
      settlementItem: {
        findMany: async ({ where }: { where: { commissionEntryId?: { in: string[] } } }) => {
          // RCCF-41 race simulation: the guard does NOT see the reservation
          // (returns nothing) so we prove the DB unique constraint is the
          // real boundary.
          void where;
          return [];
        },
      },
      commissionEntry: {
        findMany: async ({ where }: { where: { id?: { in: string[] }; partnerId?: string; status?: string } }) => {
          const pool = [
            { id: "ce-1", partnerShare: 200, status: "pending" },
            { id: "ce-2", partnerShare: 300, status: "pending" },
          ];
          let rows = pool.filter((r) => (where.status === undefined || r.status === where.status));
          if (where.id?.in) rows = rows.filter((r) => where.id!.in!.includes(r.id));
          if (where.partnerId) rows = rows.filter((r) => r.partnerId === where.partnerId);
          return rows;
        },
      },
      settlement: {
        create: async ({ data }: { data: { items: { create: Array<{ commissionEntryId: string }> } } }) => {
          // Simulate the RCCF-41 UNIQUE index on SettlementItem.commissionEntryId:
          // a second insert of an already-reserved entry fails with P2002.
          for (const item of data.items.create) {
            if (h.reserved.has(item.commissionEntryId)) throw { code: "P2002" };
            h.reserved.add(item.commissionEntryId);
          }
          return { id: "stl-1", items: [], attachments: [] };
        },
      },
    }),
  },
}));

import { settlementService } from "@/lib/settlement";

const PARTNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockLedgerAdd.mockResolvedValue(undefined);
});

describe("RCCF-41 — settlement: a commission can never be reserved twice", () => {
  it("a commission already reserved by a settlement is rejected", async () => {
    // First settlement reserves ce-1.
    await settlementService.createSettlement({ partnerId: PARTNER, commissionEntryIds: ["ce-1"] });
    expect(h.reserved.has("ce-1")).toBe(true);

    // Second settlement for the SAME commission collides on the unique index →
    // the transaction fails (P2002), so the commission is not double-reserved.
    await expect(settlementService.createSettlement({ partnerId: PARTNER, commissionEntryIds: ["ce-1"] })).rejects.toMatchObject({ code: "P2002" });
    expect(h.reserved.has("ce-1")).toBe(true);
  });

  it("distinct commissions can be settled independently", async () => {
    await settlementService.createSettlement({ partnerId: PARTNER, commissionEntryIds: ["ce-1"] });
    await settlementService.createSettlement({ partnerId: PARTNER, commissionEntryIds: ["ce-2"] });
    expect(h.reserved.has("ce-1")).toBe(true);
    expect(h.reserved.has("ce-2")).toBe(true);
  });
});
