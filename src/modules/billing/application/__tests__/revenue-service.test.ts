import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getAllSubs: vi.fn(),
  findInvoices: vi.fn(),
  getInvoiceRevenue: vi.fn(),
  workspaceFindMany: vi.fn(),
  commissionFindMany: vi.fn(),
  billingEventCount: vi.fn(),
  invoiceFindMany: vi.fn(),
  invoiceCount: vi.fn(),
  billingPlanFindUnique: vi.fn(),
  groupBy: vi.fn(),
  billingEventFindMany: vi.fn(),
  productOrderFindMany: vi.fn(),
}));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: {
    getAllSubscriptionsWithPlan: h.getAllSubs,
    findInvoicesByWorkspaceIds: h.findInvoices,
    getInvoiceRevenue: h.getInvoiceRevenue,
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findMany: h.workspaceFindMany },
    commissionEntry: { findMany: h.commissionFindMany },
    billingEvent: { count: h.billingEventCount, findMany: h.billingEventFindMany },
    billingInvoice: { findMany: h.invoiceFindMany, count: h.invoiceCount },
    productOrder: { findMany: h.productOrderFindMany },
    billingPlan: { findUnique: h.billingPlanFindUnique },
    billingSubscription: { groupBy: h.groupBy },
  },
}));

import { RevenueService } from "@/modules/billing/application/revenue-service";

const service = new RevenueService();

const ACTIVE_CREATOR = { id: "s1", status: "ACTIVE", plan: { code: "creator_grow", name: "Creator Grow", price: 699, family: "creator" } };
const TRIAL = { id: "s2", status: "TRIALING", plan: { code: "creator_grow", name: "Creator Grow", price: 699, family: "creator" } };
const ACTIVE_SCALE = { id: "s3", status: "ACTIVE", plan: { code: "creator_scale", name: "Creator Scale", price: 1995, family: "creator" } };

beforeEach(() => {
  vi.clearAllMocks();
  h.getAllSubs.mockResolvedValue([ACTIVE_CREATOR, TRIAL, ACTIVE_SCALE]);
  h.workspaceFindMany.mockResolvedValue([{ id: "w1" }]);
  h.findInvoices.mockResolvedValue([
    { id: "i1", status: "PAID", amount: 699, issuedAt: new Date(), workspaceId: "w1" },
    { id: "i2", status: "PENDING", amount: 1995, issuedAt: new Date(), workspaceId: "w1" },
  ]);
  h.getInvoiceRevenue.mockResolvedValue({ _sum: { amount: 699 } });
  h.commissionFindMany.mockResolvedValue([{ status: "paid", partnerShare: 50 }]);
  h.billingEventCount.mockResolvedValue(0);
  h.invoiceFindMany.mockResolvedValue([]);
  h.groupBy.mockResolvedValue([
    { planId: "plan-grow", _count: 1 },
    { planId: "plan-scale", _count: 1 },
  ]);
  h.billingPlanFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
    where.id === "plan-grow" ? Promise.resolve({ code: "creator_grow", name: "Creator Grow" }) : Promise.resolve({ code: "creator_scale", name: "Creator Scale" }),
  );
  h.invoiceCount.mockResolvedValue(0);
  h.billingEventFindMany.mockResolvedValue([]);
  h.productOrderFindMany.mockResolvedValue([]);
});

describe("RevenueService.getRevenueDashboard — IMPLEMENTATION-39 real aggregates", () => {
  it("derives MRR from actual Billing v2 plan prices (no hardcoded 999)", async () => {
    const dash = await service.getRevenueDashboard();
    expect(dash.mrr).toBe(699 + 1995); // two ACTIVE subscriptions at real prices
    expect(dash.arr).toBe((699 + 1995) * 12);
  });

  it("computes active subscribers, ARPC and plan distribution", async () => {
    const dash = await service.getRevenueDashboard();
    expect(dash.activeSubscribers).toBe(2); // ACTIVE only (TRIAL excluded)
    expect(dash.averageRevenuePerCreator).toBeCloseTo((699 + 1995) / 2);
    expect(dash.planDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ planCode: "creator_grow", count: 1 }),
        expect.objectContaining({ planCode: "creator_scale", count: 1 }),
      ]),
    );
  });

  it("computes invoice totals and growth", async () => {
    const dash = await service.getRevenueDashboard();
    expect(dash.totalPaidInvoices).toBe(1);
    expect(dash.invoicePaidAmount).toBe(699);
    expect(dash.invoicePendingAmount).toBe(1995);
    expect(typeof dash.growth.growthPercent).toBe("number");
    expect(dash.growth.currentMonth).toBeGreaterThanOrEqual(0);
  });

  it("never fabricates — zero revenue when no active subscriptions", async () => {
    h.getAllSubs.mockResolvedValue([TRIAL]);
    const dash = await service.getRevenueDashboard();
    expect(dash.mrr).toBe(0);
    expect(dash.activeSubscribers).toBe(0);
    expect(dash.averageRevenuePerCreator).toBe(0);
  });
});

describe("RevenueService invoice + unified transaction queries", () => {
  it("lists invoices with tenant context", async () => {
    h.invoiceFindMany.mockResolvedValue([{ id: "i1", status: "PAID", amount: 699, issuedAt: new Date(), workspaceId: "w1", planCode: "creator_grow", taxAmount: 0, providerReference: "pay_1", paidAt: null, dueAt: null, workspace: { tenant: { name: "Acme", subdomain: "acme" } } }]);
    h.invoiceCount.mockResolvedValue(1);
    const result = await service.listInvoicesAdmin({});
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.planCode).toBe("creator_grow");
    expect(result.rows[0]!.tenantName).toBe("Acme");
    expect(result.total).toBe(1);
  });

  it("returns an empty unified transaction list with no data", async () => {
    h.workspaceFindMany.mockResolvedValue([]);
    const result = await service.listUnifiedTransactions({});
    expect(result.rows).toEqual([]);
    expect(result.total).toBe(0);
  });
});
