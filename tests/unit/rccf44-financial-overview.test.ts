import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const entries: Array<Record<string, unknown>> = [];
  const clients: Array<{ agencyId: string; tenantId: string; name: string; subdomain: string | null; status: string }> = [];
  const subs: Array<{ id: string; tenantId: string | null; planCode: string | null }> = [];
  const settlements: Array<{ partnerId: string; id: string; status: string; netAmount: number; createdAt: Date }> = [];
  const reserved: Array<{ partnerId: string; commissionEntryId: string }> = [];
  const activeClientCount = () => clients.filter((c) => c.status === "ACTIVE").length;
  return {
    entries, clients, subs, settlements, reserved, activeClientCount,
    reset: () => { entries.length = 0; clients.length = 0; subs.length = 0; settlements.length = 0; reserved.length = 0; },
  };
});

function mockAgg(where: Record<string, unknown>): { _sum: { partnerShare: number | null } } {
  const partnerId = where.partnerId as string;
  const entryType = where.entryType as unknown;
  const rows = h.entries.filter((e) => {
    if (partnerId && e.partnerId !== partnerId) return false;
    if (entryType) {
      if (typeof entryType === "object" && (entryType as { startsWith?: string }).startsWith) {
        if (!String(e.entryType).startsWith((entryType as { startsWith: string }).startsWith)) return false;
      } else if (typeof entryType === "string" && e.entryType !== entryType) return false;
    }
    return true;
  });
  return { _sum: { partnerShare: Math.round(rows.reduce((s, r) => s + (r.partnerShare as number), 0) * 100) / 100 } };
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    commissionEntry: {
      aggregate: async ({ where }: { where: Record<string, unknown> }) => mockAgg(where),
      count: async ({ where }: { where: Record<string, unknown> }) => {
        const partnerId = where.partnerId as string;
        return h.entries.filter((e) => !partnerId || e.partnerId === partnerId).length;
      },
      findMany: async ({ where, orderBy, take, select }: { where: Record<string, unknown>; orderBy?: { createdAt: string }; take?: number; select?: Record<string, unknown> }) => {
        const partnerId = where.partnerId as string | undefined;
        let rows = h.entries.filter((e) => !partnerId || e.partnerId === partnerId);
        if (orderBy?.createdAt === "desc") rows = [...rows].sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
        if (take) rows = rows.slice(0, take);
        if (select) return rows;
        return rows;
      },
    },
    agencyTenant: {
      findMany: async ({ where, include }: { where: { agencyId: string; status: string }; include?: unknown }) => {
        void include;
        return h.clients
          .filter((c) => c.agencyId === where.agencyId && c.status === where.status)
          .map((c) => ({ tenantId: c.tenantId, status: c.status, tenant: { id: c.tenantId, name: c.name, subdomain: c.subdomain } }));
      },
    },
    billingSubscription: {
      findMany: async ({ where }: { where: { workspace: { tenant: { agencyTenant: { agencyId: string } } } } }) => {
        void where;
        return h.subs.map((s) => ({ id: s.id, workspace: { tenantId: s.tenantId }, plan: { code: s.planCode } }));
      },
    },
    settlementItem: {
      findMany: async ({ where }: { where: { settlement?: { partnerId?: string } } }) => {
        const partnerId = where.settlement?.partnerId;
        return h.reserved.filter((r) => !partnerId || r.partnerId === partnerId).map((r) => ({ commissionEntryId: r.commissionEntryId }));
      },
    },
    settlement: {
      findMany: async ({ where }: { where: { partnerId: string } }) =>
        h.settlements.filter((s) => s.partnerId === where.partnerId).map((s) => ({ id: s.id, status: s.status, netAmount: s.netAmount, createdAt: s.createdAt })),
    },
    partnerLedger: {
      aggregate: async () => ({ _sum: { amount: 0 } }),
    },
    billingSubscription: {
      findMany: async ({ where }: { where: { workspace: { tenant: { agencyTenant: { agencyId: string } } } } }) => {
        void where;
        return h.subs.map((s) => ({ id: s.id, workspace: { tenantId: s.tenantId }, plan: { code: s.planCode } }));
      },
      count: async () => 0,
    },
  },
}));
vi.mock("@/lib/commission/loyalty", () => ({
  getActiveClientCount: async (agencyId: string) => h.clients.filter((c) => c.agencyId === agencyId && c.status === "ACTIVE").length,
  resolveLoyaltyTier: vi.fn(),
}));

import { getAgencyFinancialOverview } from "@/modules/partner/application/financial-overview";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function seed(partnerId: string, tenantId: string, subscriptionId: string) {
  h.clients.push({ agencyId: partnerId, tenantId, name: tenantId === "t1" ? "Client One" : "Client Two", subdomain: "c1", status: "ACTIVE" });
  h.subs.push({ id: subscriptionId, tenantId, planCode: "creator_grow" });
  h.entries.push({
    id: `${subscriptionId}-ce`, partnerId, subscriptionId, invoiceId: `${subscriptionId}-inv`,
    planCode: "creator_grow", amount: 1000, partnerShare: 300, partnerPercent: 30,
    entryType: "subscription_created", status: "pending", createdAt: new Date("2026-08-01T00:00:00Z"),
  });
  h.entries.push({
    id: `${subscriptionId}-rev`, partnerId, subscriptionId, invoiceId: `${subscriptionId}-inv`,
    planCode: "creator_grow", amount: -400, partnerShare: -120, partnerPercent: 0,
    entryType: "refund_reversal", status: "reversed", parentEntryId: `${subscriptionId}-ce`,
    createdAt: new Date("2026-08-05T00:00:00Z"), audit: { refundId: "refund_1" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
});

describe("RCCF-44 — canonical financial overview", () => {
  it("summary = gross − refunds = net, client breakdown nets the remainder", async () => {
    seed(A, "t1", "sub-1");

    const o = await getAgencyFinancialOverview(A);

    expect(o.summary.grossCommission).toBe(300);
    expect(o.summary.refundReversals).toBe(-120);
    expect(o.summary.netCommission).toBe(180);
    expect(o.clients).toHaveLength(1);
    expect(o.clients[0]).toMatchObject({ name: "Client One", grossCommission: 300, refundReversals: -120, netCommission: 180 });
    // Refund visibility: the reversal entry is present with its refund id.
    expect(o.transactions.some((t) => t.entryType === "refund_reversal" && t.refundId === "refund_1")).toBe(true);
  });

  it("Partner A never sees Partner B's clients or financial data", async () => {
    seed(A, "t1", "sub-A");
    seed(B, "t2", "sub-B");

    const a = await getAgencyFinancialOverview(A);
    const b = await getAgencyFinancialOverview(B);

    expect(a.clients.map((c) => c.name)).toEqual(["Client One"]);
    expect(b.clients.map((c) => c.name)).toEqual(["Client Two"]);
    expect(a.summary.grossCommission).toBe(300);
    expect(b.summary.grossCommission).toBe(300);
    // No cross-contamination of entries.
    expect(a.transactions.every((t) => t.id.startsWith("sub-A"))).toBe(true);
  });

  it("empty state is truthful (zero earnings, zero clients)", async () => {
    const o = await getAgencyFinancialOverview(A);
    expect(o.summary).toMatchObject({ grossCommission: 0, refundReversals: 0, netCommission: 0 });
    expect(o.clients).toEqual([]);
    expect(o.transactions).toEqual([]);
    expect(o.settlements).toEqual([]);
  });

  it("marks transactions as reserved when in a settlement", async () => {
    seed(A, "t1", "sub-1");
    h.reserved.push({ partnerId: A, commissionEntryId: "sub-1-ce" });

    const o = await getAgencyFinancialOverview(A);
    const original = o.transactions.find((t) => t.entryType === "subscription_created");
    expect(original!.reserved).toBe(true);
  });

  it("only ACTIVE clients appear in the breakdown (revoked excluded)", async () => {
    seed(A, "t1", "sub-1");
    h.clients.push({ agencyId: A, tenantId: "t-revoked", name: "Old Client", subdomain: "old", status: "REVOKED" });

    const o = await getAgencyFinancialOverview(A);
    expect(o.clients.map((c) => c.name)).toEqual(["Client One"]);
    expect(o.summary.activeClients).toBe(1);
  });
});
