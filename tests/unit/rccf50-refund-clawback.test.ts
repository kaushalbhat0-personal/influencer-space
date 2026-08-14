import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const commissionRows: Array<Record<string, unknown>> = [];
  const ledgerRows: Array<Record<string, unknown>> = [];
  const invoiceRows: Array<Record<string, unknown>> = [];
  return {
    commissionRows, ledgerRows, invoiceRows,
    mockIsDuplicate: vi.fn(),
    mockCreateEvent: vi.fn(),
    mockWorkspaceFindUnique: vi.fn(),
    reset: () => { commissionRows.length = 0; ledgerRows.length = 0; invoiceRows.length = 0; },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: h.mockWorkspaceFindUnique },
    billingInvoice: {
      findFirst: async ({ where }: { where: { providerReference?: string } }) =>
        h.invoiceRows.find((r) => r.providerReference === where.providerReference) ?? null,
    },
    commissionEntry: {
      findFirst: async ({ where }: { where: { invoiceId?: string; entryType?: { startsWith: string } } }) =>
        h.commissionRows.find((r) =>
          (where.invoiceId === undefined || r.invoiceId === where.invoiceId) &&
          (where.entryType === undefined || String(r.entryType).startsWith(where.entryType.startsWith)),
        ) ?? null,
      findMany: async ({ where }: { where: { partnerId?: string; status?: string; id?: { in?: string[]; notIn?: string[] }; parentEntryId?: { in: string[] } } }) => {
        let rows = h.commissionRows.filter((r) =>
          (!where.partnerId || r.partnerId === where.partnerId) &&
          (!where.status || r.status === where.status) &&
          (!where.id?.in || where.id.in.includes(r.id as string)) &&
          (!where.id?.notIn || !where.id.notIn.includes(r.id as string)),
        );
        if (where.parentEntryId?.in) rows = rows.filter((r) => r.parentEntryId !== undefined && where.parentEntryId!.in.includes(r.parentEntryId as string));
        return rows.map((r) => ({ id: r.id, partnerShare: r.partnerShare, parentEntryId: r.parentEntryId }));
      },
      count: async () => h.commissionRows.length,
      aggregate: async ({ where }: { where: { partnerId?: string; entryType?: { startsWith: string } | string; parentEntryId?: string } }) => {
        let rows = h.commissionRows.filter((r) => !where.partnerId || r.partnerId === where.partnerId);
        const et = where.entryType as { startsWith?: string } | string | undefined;
        if (et) {
          if (typeof et === "object" && et.startsWith) rows = rows.filter((r) => String(r.entryType).startsWith(et.startsWith));
          else if (typeof et === "string") rows = rows.filter((r) => r.entryType === et);
        }
        if (where.parentEntryId) rows = rows.filter((r) => r.parentEntryId === where.parentEntryId);
        const sum = rows.reduce((s, r) => s + (r.partnerShare as number), 0);
        return { _sum: { partnerShare: Math.round(sum * 100) / 100 } };
      },
      create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: `ce-${h.commissionRows.length + 1}`, ...data }; h.commissionRows.push(r); return r; },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { const r = h.commissionRows.find((x) => x.id === where.id)!; Object.assign(r, data); return r; },
    },
    partnerLedger: {
      findFirst: async ({ where }: { where: { partnerId: string } }) => {
        const rows = h.ledgerRows.filter((r) => r.partnerId === where.partnerId);
        return rows[rows.length - 1] ?? null;
      },
      aggregate: async ({ where }: { where: { partnerId?: string; type?: string } }) => {
        const sum = h.ledgerRows.filter((r) => (!where.partnerId || r.partnerId === where.partnerId) && (!where.type || r.type === where.type)).reduce((s, r) => s + (r.amount as number), 0);
        return { _sum: { amount: Math.round(sum * 100) / 100 } };
      },
      create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: `pl-${h.ledgerRows.length + 1}`, ...data }; h.ledgerRows.push(r); return r; },
    },
    settlementItem: { findMany: async () => [] },
    billingSubscription: { count: async () => 0 },
    agencyTenant: { count: async () => 0 },
    $transaction: async (cb: (tx: unknown) => unknown) => cb({
      commissionEntry: {
        create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: `ce-tx-${h.commissionRows.length + 1}`, ...data }; h.commissionRows.push(r); return r; },
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { const r = h.commissionRows.find((x) => x.id === where.id)!; Object.assign(r, data); return r; },
      },
      partnerLedger: {
        findFirst: async ({ where }: { where: { partnerId: string } }) => { const rows = h.ledgerRows.filter((r) => r.partnerId === where.partnerId); return rows[rows.length - 1] ?? null; },
        create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: `pl-tx-${h.ledgerRows.length + 1}`, ...data }; h.ledgerRows.push(r); return r; },
      },
    }),
  },
}));
vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: { isDuplicateEvent: h.mockIsDuplicate, createEvent: h.mockCreateEvent, createInvoice: vi.fn(), findPlanByCode: vi.fn(), findSubscriptionByWorkspaceId: vi.fn(), findSubscriptionWithPlan: vi.fn(), upsertSubscription: vi.fn() },
}));
vi.mock("@/modules/billing/infrastructure/providers/razorpay", () => ({ razorpayProvider: { createCheckout: vi.fn() } }));
vi.mock("@/lib/events", () => ({ platformEventBus: { publish: vi.fn() } }));
vi.mock("@/lib/commission", () => ({ commissionService: { processCommission: vi.fn() } }));
vi.mock("@/lib/partners", () => ({ partnerService: { get: vi.fn() } }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn() } }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn() } }));
vi.mock("@/lib/commission/loyalty", () => ({ getActiveClientCount: async () => 0, resolveLoyaltyTier: async () => null }));

import { BillingService } from "@/modules/billing/application/service";
import { getPartnerRevenueSummary } from "@/lib/commission/runtime";

const billingService = new BillingService();
const P = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function seed(invoiceAmount = 1000, commissionShare = 300, status = "pending", clearedAt: Date | null = null) {
  h.invoiceRows.push({ id: "inv-1", workspaceId: "ws-1", accountId: "acc-1", amount: invoiceAmount, providerReference: "pay_1" });
  h.commissionRows.push({ id: "ce-1", invoiceId: "inv-1", partnerId: P, subscriptionId: "sub-1", planCode: "creator_grow", amount: invoiceAmount, partnerShare: commissionShare, entryType: "subscription_created", status, clearedAt });
  h.ledgerRows.push({ id: "pl-earn", partnerId: P, type: "COMMISSION_EARNED", amount: commissionShare, balanceBefore: 0, balanceAfter: commissionShare });
  if (status === "cleared") h.ledgerRows.push({ id: "pl-paid", partnerId: P, type: "SETTLEMENT_PAID", amount: commissionShare, balanceBefore: commissionShare, balanceAfter: commissionShare });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockIsDuplicate.mockResolvedValue(false);
  h.mockCreateEvent.mockResolvedValue({ id: "evt-1" });
  h.mockWorkspaceFindUnique.mockResolvedValue({ tenantId: "t1" });
});

describe("RCCF-50 — clawback: settled vs unsettled refunds", () => {
  it("pre-settlement partial refund creates NO clawback (only reduces settlement)", async () => {
    seed(1000, 300, "pending", null);
    await billingService.handleRefund({ refundId: "refund_1", paymentId: "pay_1", refundAmountPaise: 40000 });

    expect(h.ledgerRows.some((l) => l.type === "CLAWBACK_DUE")).toBe(false);
    const reversal = h.commissionRows.find((r) => r.entryType === "refund_reversal");
    expect(reversal!.partnerShare).toBe(-120);
    expect(h.commissionRows.find((r) => r.id === "ce-1")!.status).toBe("pending"); // settleable remainder
  });

  it("post-settlement partial refund creates an exact CLAWBACK_DUE obligation", async () => {
    seed(1000, 300, "cleared", new Date("2026-08-01T00:00:00Z"));
    await billingService.handleRefund({ refundId: "refund_1", paymentId: "pay_1", refundAmountPaise: 40000 });

    const clawback = h.ledgerRows.find((l) => l.type === "CLAWBACK_DUE");
    expect(clawback).toBeDefined();
    expect(clawback!.amount).toBe(-120);
    // Historical paid record untouched.
    expect(h.ledgerRows.find((l) => l.type === "SETTLEMENT_PAID")!.amount).toBe(300);
  });

  it("post-settlement full refund creates the full clawback", async () => {
    seed(1000, 300, "cleared", new Date("2026-08-01T00:00:00Z"));
    await billingService.handleRefund({ refundId: "refund_full", paymentId: "pay_1", refundAmountPaise: 100000 });

    const clawback = h.ledgerRows.find((l) => l.type === "CLAWBACK_DUE");
    expect(clawback!.amount).toBe(-300);
  });

  it("multiple post-settlement partial refunds accumulate exactly (never doubled)", async () => {
    seed(1000, 300, "cleared", new Date("2026-08-01T00:00:00Z"));
    await billingService.handleRefund({ refundId: "refund_1", paymentId: "pay_1", refundAmountPaise: 60000 });
    h.mockIsDuplicate.mockResolvedValue(false);
    await billingService.handleRefund({ refundId: "refund_2", paymentId: "pay_1", refundAmountPaise: 30000 });

    const clawbacks = h.ledgerRows.filter((l) => l.type === "CLAWBACK_DUE");
    expect(clawbacks.length).toBe(2);
    expect(clawbacks[0].amount).toBe(-180); // 60% of 300
    expect(clawbacks[1].amount).toBe(-90);  // 30% of 300
  });

  it("refund overflow is capped at the original commission (never over-clawback)", async () => {
    seed(1000, 300, "cleared", new Date("2026-08-01T00:00:00Z"));
    await billingService.handleRefund({ refundId: "refund_1", paymentId: "pay_1", refundAmountPaise: 80000 });
    h.mockIsDuplicate.mockResolvedValue(false);
    await billingService.handleRefund({ refundId: "refund_2", paymentId: "pay_1", refundAmountPaise: 40000 });

    const totalClawback = Math.abs(h.ledgerRows.filter((l) => l.type === "CLAWBACK_DUE").reduce((s, l) => s + (l.amount as number), 0));
    expect(totalClawback).toBeLessThanOrEqual(300);
    expect(totalClawback).toBe(300); // 240 + capped 60
  });

  it("duplicate refund is idempotent (no duplicate clawback)", async () => {
    seed(1000, 300, "cleared", new Date("2026-08-01T00:00:00Z"));
    h.mockIsDuplicate.mockResolvedValue(true);
    const res = await billingService.handleRefund({ refundId: "refund_dup", paymentId: "pay_1", refundAmountPaise: 40000 });
    expect(res.handled).toBe(false);
    expect(h.ledgerRows.filter((l) => l.type === "CLAWBACK_DUE").length).toBe(0);
  });
});

describe("RCCF-50 — clawback affects the canonical summary (available)", () => {
  it("available = net − paid − clawbackDue", async () => {
    seed(1000, 300, "cleared", new Date("2026-08-01T00:00:00Z"));
    await billingService.handleRefund({ refundId: "refund_1", paymentId: "pay_1", refundAmountPaise: 40000 });

    // mock ledgerAgg for the summary: CLAWBACK_DUE sum = -120, SETTLEMENT_PAID sum = 300.
    const origCreate = (h.ledgerRows as unknown[]);
    const summary = await getPartnerRevenueSummary(P);
    expect(summary.clawbackDue).toBe(120);
    expect(summary.available).toBe(0); // max(0, 180 - 300 - 120)
  });
});
