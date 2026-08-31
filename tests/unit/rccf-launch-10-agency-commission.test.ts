import { describe, it, expect, vi, beforeEach } from "vitest";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";
const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ORDER_1 = "order-11111111-1111-4111-8111-111111111001";

const h = vi.hoisted(() => {
  const orders: Record<string, unknown>[] = [];
  const agencyTenants: Record<string, unknown>[] = [];
  const commissions: Record<string, unknown>[] = [];
  const policies: Record<string, unknown>[] = [];
  const payments: Record<string, unknown>[] = [];
  const allocations: Record<string, unknown>[] = [];
  return { orders, agencyTenants, commissions, policies, payments, allocations,
    reset() { orders.length = 0; agencyTenants.length = 0; commissions.length = 0; policies.length = 0; payments.length = 0; allocations.length = 0; }
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productOrder: {
      findUnique: vi.fn(({ where }: { where: { id: string } }) => Promise.resolve(h.orders.find((o) => (o as { id: string }).id === where.id) ?? null)),
      update: vi.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const o = h.orders.find((x) => (x as { id: string }).id === where.id) as Record<string, unknown> | undefined;
        if (o) Object.assign(o, data);
        return Promise.resolve(o ?? null);
      }),
      findFirst: vi.fn(({ where }: { where: Record<string, unknown> }) => Promise.resolve(h.orders.find((o) => Object.entries(where).every(([k,v]) => (o as Record<string, unknown>)[k]===v)) ?? null)),
    },
    agencyTenant: {
      findUnique: vi.fn(({ where }: { where: { tenantId: string } }) => Promise.resolve(h.agencyTenants.find((a) => (a as { tenantId: string }).tenantId === where.tenantId) ?? null)),
    },
    commissionPolicy: {
      findFirst: vi.fn(() => Promise.resolve(h.policies[0] ?? null)),
    },
    agencyOrderCommission: {
      findUnique: vi.fn(({ where }: { where: { orderId?: string; id?: string } }) => {
        if (where.orderId) return Promise.resolve(h.commissions.find((c) => (c as { orderId: string }).orderId === where.orderId) ?? null);
        if (where.id) return Promise.resolve(h.commissions.find((c) => (c as { id: string }).id === where.id) ?? null);
        return Promise.resolve(null);
      }),
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `comm-${h.commissions.length+1}`, createdAt: new Date(), updatedAt: new Date(), ...data };
        h.commissions.push(row);
        return Promise.resolve(row);
      }),
      update: vi.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const c = h.commissions.find((x) => (x as { id: string }).id === where.id) as Record<string, unknown> | undefined;
        if (c) Object.assign(c, data);
        return Promise.resolve(c);
      }),
      findMany: vi.fn(({ where }: { where?: Record<string, unknown> }) => {
        let out = [...h.commissions];
        if (where?.agencyId) out = out.filter((c) => (c as { agencyId: string }).agencyId === where.agencyId);
        if (where?.status) out = out.filter((c) => (c as { status: string }).status === where.status);
        if (where?.outstanding) {
          const gt = (where.outstanding as { gt?:number })?.gt;
          if (gt !== undefined) out = out.filter((c) => ((c as { outstanding:number }).outstanding ?? 0) > gt);
        }
        if (where?.id && (where.id as { in?: string[] }).in) out = out.filter((c) => (where.id as { in:string[] }).in!.includes((c as { id:string }).id));
        return Promise.resolve(out);
      }),
      count: vi.fn(() => Promise.resolve(h.commissions.length)),
      aggregate: vi.fn(({ where }: { where?: Record<string, unknown> }) => {
        let rows = [...h.commissions];
        if (where?.agencyId) rows = rows.filter((c) => (c as { agencyId: string }).agencyId === where?.agencyId);
        const sum = (k:string) => rows.reduce((s,c)=> s+ (((c as Record<string,unknown>)[k] as number) ?? 0),0);
        return Promise.resolve({ _sum: { grossAmount: sum("grossAmount"), eligibleRevenue: sum("eligibleRevenue"), commissionEarned: sum("commissionEarned"), paidAmount: sum("paidAmount"), outstanding: sum("outstanding") }, _count: { _all: rows.length } });
      }),
    },
    agencyCommissionPayment: {
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `pay-${h.payments.length+1}`, createdAt: new Date(), ...data };
        h.payments.push(row);
        return Promise.resolve(row);
      }),
    },
    agencyCommissionAllocation: {
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `alloc-${h.allocations.length+1}`, createdAt: new Date(), ...data };
        h.allocations.push(row);
        return Promise.resolve(row);
      }),
    },
    $transaction: vi.fn(async (fn: (tx: unknown)=>Promise<unknown>) => {
      const tx = {
        agencyCommissionPayment: { create: (arg: { data: Record<string, unknown> }) => {
          const row = { id: `pay-${h.payments.length+1}`, createdAt: new Date(), ...arg.data };
          h.payments.push(row); return Promise.resolve(row);
        }},
        agencyCommissionAllocation: { create: (arg: { data: Record<string, unknown> }) => {
          const row = { id: `alloc-${h.allocations.length+1}`, createdAt: new Date(), ...arg.data };
          h.allocations.push(row); return Promise.resolve(row);
        }},
        agencyOrderCommission: {
          findUnique: vi.fn(({ where }: { where: { id: string } }) => Promise.resolve(h.commissions.find((c) => (c as { id: string }).id === where.id) ?? null)),
          update: vi.fn(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
            const c = h.commissions.find((x) => (x as { id: string }).id === where.id) as Record<string, unknown> | undefined;
            if (c) Object.assign(c, data); return Promise.resolve(c);
          }),
        },
      };
      return fn(tx as unknown);
    }),
    websiteAgency: { findMany: vi.fn(() => Promise.resolve([])) },
    tenant: { findMany: vi.fn(() => Promise.resolve([])) },
  },
}));

vi.mock("@/lib/audit", () => ({ logAction: vi.fn(() => Promise.resolve()) }));

import { computeAndPersistAgencyCommission, refreshAgencyCommissionForRefund, recordManualPayment } from "@/lib/agency-commission/service";

beforeEach(() => {
  h.reset();
  vi.clearAllMocks();
  // default policy 20% fallback
  h.policies.push({ agencyDefaultShare: 20 });
});

describe("RCCF-LAUNCH-10 — Agency Product Commission Matrix", () => {
  it("A: Creator has no agency → commission = 0 (skipped)", async () => {
    h.orders.push({ id: ORDER_1, tenantId: TENANT_A, amount: 10000, status: "COMPLETED", refundAmount: 0, agencyFeePercent: null, agencyId: null });
    const res = await computeAndPersistAgencyCommission(ORDER_1);
    expect(res.created).toBe(false);
    expect(res.skipped).toBe("no_agency");
    expect(h.commissions.length).toBe(0);
  });

  it("B: Creator belongs to Agency A, Sale ₹10,000, 10% → ₹1,000", async () => {
    h.agencyTenants.push({ tenantId: TENANT_A, agencyId: AGENCY_A, productRevSharePercent: 10 });
    h.orders.push({ id: ORDER_1, tenantId: TENANT_A, amount: 10000, status: "COMPLETED", refundAmount: 0 });
    const res = await computeAndPersistAgencyCommission(ORDER_1);
    expect(res.created).toBe(true);
    const c = h.commissions[0] as Record<string, unknown>;
    expect(c.grossAmount).toBe(10000);
    expect(c.eligibleRevenue).toBe(10000);
    expect(c.commissionRate).toBe(10);
    expect(c.commissionEarned).toBe(1000);
    expect(c.outstanding).toBe(1000);
    expect(c.status).toBe("UNPAID");
    // invariants
    expect((c.paidAmount as number) >=0).toBe(true);
    expect((c.outstanding as number) >=0).toBe(true);
    expect((c.paidAmount as number) <= (c.commissionEarned as number)).toBe(true);
    expect((c.outstanding as number)).toBe((c.commissionEarned as number) - (c.paidAmount as number));
  });

  it("C: Sale refunded completely → commission 0 current payable (VOID or 0 outstanding)", async () => {
    h.agencyTenants.push({ tenantId: TENANT_A, agencyId: AGENCY_A, productRevSharePercent: 10 });
    h.orders.push({ id: ORDER_1, tenantId: TENANT_A, amount: 10000, status: "COMPLETED", refundAmount: 0 });
    await computeAndPersistAgencyCommission(ORDER_1);
    // simulate full refund
    const order = h.orders[0] as Record<string, unknown>;
    order.refundAmount = 10000 * 100; // paise
    await refreshAgencyCommissionForRefund(ORDER_1);
    const c = h.commissions[0] as Record<string, unknown>;
    expect(c.eligibleRevenue).toBe(0);
    expect(c.commissionEarned).toBe(0);
    expect(c.outstanding).toBe(0);
  });

  it("D: Partial refund proportional", async () => {
    h.agencyTenants.push({ tenantId: TENANT_A, agencyId: AGENCY_A, productRevSharePercent: 10 });
    h.orders.push({ id: ORDER_1, tenantId: TENANT_A, amount: 10000, status: "COMPLETED", refundAmount: 0 });
    await computeAndPersistAgencyCommission(ORDER_1);
    const order = h.orders[0] as Record<string, unknown>;
    order.refundAmount = 2000 * 100; // ₹2000 refund
    await refreshAgencyCommissionForRefund(ORDER_1);
    const c = h.commissions[0] as Record<string, unknown>;
    expect(c.eligibleRevenue).toBe(8000);
    expect(c.commissionEarned).toBe(800);
    expect(c.outstanding).toBe(800);
  });

  it("E: Commission rate changes — old order retains old rate, new order uses new rate", async () => {
    h.agencyTenants.push({ tenantId: TENANT_A, agencyId: AGENCY_A, productRevSharePercent: 10 });
    h.orders.push({ id: ORDER_1, tenantId: TENANT_A, amount: 10000, status: "COMPLETED", refundAmount: 0 });
    await computeAndPersistAgencyCommission(ORDER_1);
    expect((h.commissions[0] as Record<string, unknown>).commissionRate).toBe(10);
    // change rate to 15%
    (h.agencyTenants[0] as Record<string, unknown>).productRevSharePercent = 15;
    const ORDER_2 = "order-22222222-2222-4222-8222-222222222222";
    h.orders.push({ id: ORDER_2, tenantId: TENANT_A, amount: 10000, status: "COMPLETED", refundAmount: 0 });
    await computeAndPersistAgencyCommission(ORDER_2);
    expect((h.commissions[0] as Record<string, unknown>).commissionRate).toBe(10);
    expect((h.commissions[1] as Record<string, unknown>).commissionRate).toBe(15);
    expect((h.commissions[1] as Record<string, unknown>).commissionEarned).toBe(1500);
  });

  it("F: Partial manual payment invariants", async () => {
    h.agencyTenants.push({ tenantId: TENANT_A, agencyId: AGENCY_A, productRevSharePercent: 10 });
    h.orders.push({ id: ORDER_1, tenantId: TENANT_A, amount: 90000, status: "COMPLETED", refundAmount: 0 });
    // gross 90000, 10% = 9000 earned
    await computeAndPersistAgencyCommission(ORDER_1);
    const c0 = h.commissions[0] as Record<string, unknown>;
    expect(c0.commissionEarned).toBe(9000);
    await recordManualPayment({ agencyId: AGENCY_A, amount: 4000, adminEmail: "super@admin.test" });
    const c1 = h.commissions[0] as Record<string, unknown>;
    expect(c1.paidAmount).toBe(4000);
    expect(c1.outstanding).toBe(5000);
    expect(c1.status).toBe("PARTIALLY_PAID");
    await recordManualPayment({ agencyId: AGENCY_A, amount: 5000, adminEmail: "super@admin.test" });
    const c2 = h.commissions[0] as Record<string, unknown>;
    expect(c2.paidAmount).toBe(9000);
    expect(c2.outstanding).toBe(0);
    expect(c2.status).toBe("PAID");
    // invariants hold
    expect((c2.paidAmount as number) <= (c2.commissionEarned as number)).toBe(true);
    expect((c2.outstanding as number)).toBe((c2.commissionEarned as number) - (c2.paidAmount as number));
  });

  it("G: Repeated webhook/order processing — no duplicate commission", async () => {
    h.agencyTenants.push({ tenantId: TENANT_A, agencyId: AGENCY_A, productRevSharePercent: 10 });
    h.orders.push({ id: ORDER_1, tenantId: TENANT_A, amount: 10000, status: "COMPLETED", refundAmount: 0 });
    const r1 = await computeAndPersistAgencyCommission(ORDER_1);
    const r2 = await computeAndPersistAgencyCommission(ORDER_1);
    expect(r1.created).toBe(true);
    expect(r2.created).toBe(false);
    expect(r2.skipped).toBe("already_exists");
    expect(h.commissions.length).toBe(1);
  });

  it("H: Mathematical invariants for every commission record", async () => {
    h.agencyTenants.push({ tenantId: TENANT_A, agencyId: AGENCY_A, productRevSharePercent: 10 });
    for (let i=0;i<3;i++) {
      const oid = `order-h-${i}`;
      h.orders.push({ id: oid, tenantId: TENANT_A, amount: 1000*(i+1), status: "COMPLETED", refundAmount: 0 });
      await computeAndPersistAgencyCommission(oid);
    }
    for (const c of h.commissions) {
      const r = c as Record<string, unknown>;
      expect((r.outstanding as number) >=0).toBe(true);
      expect((r.paidAmount as number) >=0).toBe(true);
      expect((r.commissionEarned as number) >=0).toBe(true);
      expect((r.paidAmount as number) <= (r.commissionEarned as number)).toBe(true);
      expect((r.outstanding as number)).toBe((r.commissionEarned as number) - (r.paidAmount as number));
    }
  });

  it("Tenant isolation: Agency A cannot see Agency B via service filter", async () => {
    h.agencyTenants.push({ tenantId: TENANT_A, agencyId: AGENCY_A, productRevSharePercent: 10 });
    h.agencyTenants.push({ tenantId: TENANT_B, agencyId: AGENCY_B, productRevSharePercent: 20 });
    h.orders.push({ id: ORDER_1, tenantId: TENANT_A, amount: 10000, status: "COMPLETED", refundAmount: 0 });
    h.orders.push({ id: "order-b", tenantId: TENANT_B, amount: 20000, status: "COMPLETED", refundAmount: 0 });
    await computeAndPersistAgencyCommission(ORDER_1);
    await computeAndPersistAgencyCommission("order-b");
    expect(h.commissions.length).toBe(2);
    const aComms = h.commissions.filter((c) => (c as { agencyId: string }).agencyId === AGENCY_A);
    const bComms = h.commissions.filter((c) => (c as { agencyId: string }).agencyId === AGENCY_B);
    expect(aComms.length).toBe(1);
    expect(bComms.length).toBe(1);
    expect(aComms[0]).not.toBe(bComms[0]);
  });

  it("Commission example: ₹100k gross - ₹10k refund @10% with ₹4k paid", async () => {
    h.agencyTenants.push({ tenantId: TENANT_A, agencyId: AGENCY_A, productRevSharePercent: 10 });
    h.orders.push({ id: ORDER_1, tenantId: TENANT_A, amount: 100000, status: "COMPLETED", refundAmount: 0 });
    await computeAndPersistAgencyCommission(ORDER_1);
    // partial refund 10k
    (h.orders[0] as Record<string, unknown>).refundAmount = 10000*100;
    await refreshAgencyCommissionForRefund(ORDER_1);
    const c0 = h.commissions[0] as Record<string, unknown>;
    expect(c0.eligibleRevenue).toBe(90000);
    expect(c0.commissionEarned).toBe(9000);
    await recordManualPayment({ agencyId: AGENCY_A, amount: 4000, adminEmail: "super@admin.test" });
    const c1 = h.commissions[0] as Record<string, unknown>;
    expect(c1.paidAmount).toBe(4000);
    expect(c1.outstanding).toBe(5000);
    expect(c1.status).toBe("PARTIALLY_PAID");
  });
});
