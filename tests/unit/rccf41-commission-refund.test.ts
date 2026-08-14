import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  // shared "DB" state for financial records
  commissionRows: [] as Array<Record<string, unknown>>,
  ledgerRows: [] as Array<Record<string, unknown>>,
  invoiceRows: [] as Array<Record<string, unknown>>,
  eventKeys: new Set<string>(),
  mockIsDuplicate: vi.fn(),
  mockCreateEvent: vi.fn(),
  mockWorkspaceFindUnique: vi.fn(),
  mockResolveLoyaltyTier: vi.fn(),
  mockPublishEvent: vi.fn(),
  mockLogAction: vi.fn(),
  mockCaptureError: vi.fn(),
  reset: () => {
    h.commissionRows.length = 0;
    h.ledgerRows.length = 0;
    h.invoiceRows.length = 0;
    h.eventKeys.clear();
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: h.mockWorkspaceFindUnique },
    billingInvoice: {
      findFirst: async ({ where }: { where: { providerReference?: string; workspaceId?: string } }) =>
        h.invoiceRows.find((r) => (where.providerReference ? r.providerReference === where.providerReference : r.workspaceId === where.workspaceId)) ?? null,
    },
    commissionRule: { findMany: async () => [] },
    commissionPolicy: { findFirst: async () => null },
    agencyTenant: { findUnique: async ({ where }: { where: { tenantId: string } }) =>
      where.tenantId === "t1" ? { agencyId: PARTNER, revSharePercent: 20 } : null,
    },
    commissionEntry: {
      findFirst: async ({ where }: { where: { invoiceId?: string; entryType?: { startsWith: string } } }) => {
        const matches = h.commissionRows.filter((r) =>
          (where.invoiceId === undefined || r.invoiceId === where.invoiceId) &&
          (where.entryType === undefined || String(r.entryType).startsWith(where.entryType.startsWith)),
        );
        return matches[0] ?? null;
      },
      aggregate: async ({ where }: { where: { parentEntryId?: string | { in: string[] } } }) => {
        const match = (r: Record<string, unknown>) => {
          if (r.parentEntryId === undefined) return false;
          if (typeof where.parentEntryId === "string") return r.parentEntryId === where.parentEntryId;
          const ids = (where.parentEntryId as { in: string[] }).in;
          return ids.includes(r.parentEntryId as string);
        };
        const sum = h.commissionRows.filter(match).reduce((s, r) => s + (r.partnerShare as number), 0);
        return { _sum: { partnerShare: Math.round(sum * 100) / 100 } };
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `ce-${h.commissionRows.length + 1}`, ...data };
        h.commissionRows.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = h.commissionRows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    partnerLedger: {
      findFirst: async ({ where }: { where: { partnerId: string } }) => {
        const forPartner = h.ledgerRows.filter((r) => r.partnerId === where.partnerId);
        return forPartner[forPartner.length - 1] ?? null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `pl-${h.ledgerRows.length + 1}`, ...data };
        h.ledgerRows.push(row);
        return row;
      },
    },
    billingPlan: { findUnique: async () => null },
    $transaction: async (cb: (tx: unknown) => unknown) => cb({
      commissionEntry: {
        create: async (a: { data: Record<string, unknown> }) => {
          const row = { id: `ce-tx-${h.commissionRows.length + 1}`, ...a.data };
          h.commissionRows.push(row);
          return row;
        },
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = h.commissionRows.find((r) => r.id === where.id)!;
          Object.assign(row, data);
          return row;
        },
      },
      partnerLedger: {
        findFirst: async ({ where }: { where: { partnerId: string } }) => {
          const forPartner = h.ledgerRows.filter((r) => r.partnerId === where.partnerId);
          return forPartner[forPartner.length - 1] ?? null;
        },
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: `pl-tx-${h.ledgerRows.length + 1}`, ...data };
          h.ledgerRows.push(row);
          return row;
        },
      },
    }),
  },
}));

vi.mock("@/lib/commission/loyalty", () => ({ resolveLoyaltyTier: h.mockResolveLoyaltyTier, getActiveClientCount: vi.fn().mockResolvedValue(0) }));
vi.mock("@/modules/event-runtime", () => ({ runtimeEventBus: { publish: h.mockPublishEvent } }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: h.mockCaptureError }));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: {
    isDuplicateEvent: h.mockIsDuplicate,
    createEvent: h.mockCreateEvent,
    createInvoice: vi.fn(),
    findPlanByCode: vi.fn().mockResolvedValue({ id: "bp1", code: "creator_grow", price: 999 }),
    findSubscriptionByWorkspaceId: vi.fn(),
    upsertSubscription: vi.fn(),
  },
}));
vi.mock("@/modules/billing/infrastructure/providers/razorpay", () => ({ razorpayProvider: { createCheckout: vi.fn() } }));
vi.mock("@/lib/events", () => ({ platformEventBus: { publish: vi.fn() } }));
vi.mock("@/lib/commission", () => ({ commissionService: { processCommission: vi.fn() } }));
vi.mock("@/lib/partners", () => ({ partnerService: { get: vi.fn() } }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn() } }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn() } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { recordSubscriptionCommission } from "@/lib/commission/runtime";
import { BillingService } from "@/modules/billing/application/service";

const billingService = new BillingService();
const PARTNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-1", tenantId: "t1" });
  h.mockResolveLoyaltyTier.mockResolvedValue(null);
  h.mockPublishEvent.mockResolvedValue(undefined);
  h.mockLogAction.mockResolvedValue(undefined);
  h.mockIsDuplicate.mockResolvedValue(false);
  h.mockCreateEvent.mockResolvedValue({ id: "evt-1" });
  // default 80/20 split (no rules, no loyalty, no relationship, no policy)
});

describe("RCCF-41 — recordSubscriptionCommission: one payment → one commission + one ledger credit", () => {
  it("creates exactly one commission + one ledger entry for a valid amount", async () => {
    const res = await recordSubscriptionCommission({
      workspaceId: "ws-1", planCode: "creator_grow", subscriptionId: "sub-1", invoiceId: "inv-1", amount: 999, event: "created",
    });
    expect(res.success).toBe(true);
    expect(h.commissionRows.filter((r) => r.entryType === "subscription_created").length).toBe(1);
    expect(h.ledgerRows.filter((r) => r.type === "COMMISSION_EARNED").length).toBe(1);
    const entry = h.commissionRows[0];
    expect(entry.partnerShare).toBeCloseTo(199.8, 2); // 20% of 999
    expect(h.ledgerRows[0].balanceAfter).toBeCloseTo(199.8, 2);
  });

  it("skips (no-partner) when the workspace has no AgencyTenant link — no commission", async () => {
    h.mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-1", tenantId: null });
    const res = await recordSubscriptionCommission({
      workspaceId: "ws-1", planCode: "creator_grow", subscriptionId: "sub-1", invoiceId: "inv-1", amount: 999, event: "created",
    });
    expect(res.skipped).toBe("no-partner");
    expect(h.commissionRows.length).toBe(0);
  });

  it("does not double-record for the same invoice", async () => {
    h.commissionRows.push({ id: "existing", invoiceId: "inv-1" });
    const res = await recordSubscriptionCommission({
      workspaceId: "ws-1", planCode: "creator_grow", subscriptionId: "sub-1", invoiceId: "inv-1", amount: 999, event: "created",
    });
    expect(res.skipped).toBe("already-recorded");
    expect(h.commissionRows.filter((r) => r.entryType === "subscription_created").length).toBe(0);
  });

  it("writes via the caller's transaction when a tx is provided (invoice+commission atomic)", async () => {
    const tx = { commissionEntry: { create: async (a: { data: Record<string, unknown> }) => { const r = { id: "ce-x", ...a.data }; h.commissionRows.push(r); return r; } }, partnerLedger: { findFirst: async () => null, create: async (a: { data: Record<string, unknown> }) => { const r = { id: "pl-x", ...a.data }; h.ledgerRows.push(r); return r; } } } as never;
    await recordSubscriptionCommission(
      { workspaceId: "ws-1", planCode: "creator_grow", subscriptionId: "sub-1", invoiceId: "inv-1", amount: 999, event: "created" },
      tx,
    );
    expect(h.commissionRows.length).toBe(1);
  });
});

describe("RCCF-41 — handleRefund: full refund → one reversal, net commission 0, idempotent", () => {
  function seedPaidInvoiceAndCommission() {
    h.invoiceRows.push({ id: "inv-1", workspaceId: "ws-1", accountId: "acc-1", amount: 1000, providerReference: "pay_1" });
    h.commissionRows.push({ id: "ce-1", invoiceId: "inv-1", partnerId: PARTNER, subscriptionId: "sub-1", planCode: "creator_grow", amount: 1000, platformShare: 800, partnerShare: 200, entryType: "subscription_created", status: "pending" });
    h.ledgerRows.push({ id: "pl-1", partnerId: PARTNER, type: "COMMISSION_EARNED", amount: 200, commissionId: "ce-1", balanceBefore: 0, balanceAfter: 200 });
  }

  it("full refund creates ONE reversal, marks original reversed, net commission 0", async () => {
    seedPaidInvoiceAndCommission();

    const res = await billingService.handleRefund({ refundId: "refund_1", paymentId: "pay_1", refundAmountPaise: 100000 });

    expect(res.handled).toBe(true);
    const reversal = h.commissionRows.find((r) => r.entryType === "refund_reversal");
    expect(reversal).toBeDefined();
    expect(reversal.partnerShare).toBe(-200);
    expect(reversal.parentEntryId).toBe("ce-1");
    expect(h.commissionRows.find((r) => r.id === "ce-1")!.status).toBe("reversed");
    const ledgerReverse = h.ledgerRows.find((r) => r.type === "COMMISSION_REVERSED");
    expect(ledgerReverse).toBeDefined();
    expect(ledgerReverse.amount).toBe(-200);
    expect(h.ledgerRows[h.ledgerRows.length - 1].balanceAfter).toBe(0); // net 0
    expect(h.mockCreateEvent).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: "razorpay_refund_refund_1", type: "REFUND_PROCESSED" }), expect.anything());
  });

  it("duplicate refund delivery is a no-op (idempotency key already processed)", async () => {
    seedPaidInvoiceAndCommission();
    h.mockIsDuplicate.mockResolvedValue(true);

    const res = await billingService.handleRefund({ refundId: "refund_1", paymentId: "pay_1", refundAmountPaise: 100000 });

    expect(res.handled).toBe(false);
    expect(h.commissionRows.filter((r) => r.entryType === "refund_reversal").length).toBe(0);
    expect(h.commissionRows.find((r) => r.id === "ce-1")!.status).toBe("pending");
  });

  it("refund for an unknown payment is a safe no-op (no fabricated reversal)", async () => {
    const res = await billingService.handleRefund({ refundId: "refund_x", paymentId: "unknown_pay", refundAmountPaise: 100000 });
    expect(res.handled).toBe(true);
    expect(h.commissionRows.length).toBe(0);
    expect(h.ledgerRows.length).toBe(0);
  });

  it("refund for a payment without a partner commission is a safe no-op", async () => {
    h.invoiceRows.push({ id: "inv-1", workspaceId: "ws-1", accountId: "acc-1", amount: 1000, providerReference: "pay_1" });
    const res = await billingService.handleRefund({ refundId: "refund_y", paymentId: "pay_1", refundAmountPaise: 100000 });
    expect(res.handled).toBe(true);
    expect(h.commissionRows.length).toBe(0);
  });

  it("partial refund records a proportional reversal (₹500 of ₹1,000 → -₹100)", async () => {
    seedPaidInvoiceAndCommission();
    const res = await billingService.handleRefund({ refundId: "refund_half", paymentId: "pay_1", refundAmountPaise: 50000 });
    expect(res.handled).toBe(true);
    const reversal = h.commissionRows.find((r) => r.entryType === "refund_reversal");
    expect(reversal.partnerShare).toBe(-100);
    expect(h.ledgerRows.find((r) => r.type === "COMMISSION_REVERSED")!.amount).toBe(-100);
  });

  it("a second partial refund on the same payment reverses only its own fraction", async () => {
    seedPaidInvoiceAndCommission();
    await billingService.handleRefund({ refundId: "refund_half", paymentId: "pay_1", refundAmountPaise: 50000 });
    // reset idempotency for a second (different) refund of the same payment
    h.mockIsDuplicate.mockResolvedValue(false);
    await billingService.handleRefund({ refundId: "refund_half2", paymentId: "pay_1", refundAmountPaise: 30000 });

    const reversals = h.commissionRows.filter((r) => r.entryType === "refund_reversal");
    expect(reversals.length).toBe(2);
    expect(reversals[0].partnerShare).toBe(-100); // 500/1000
    expect(reversals[1].partnerShare).toBe(-60);  // 300/1000
  });

  it("RCCF-43: total reversals never exceed the original commission (refund overflow guard)", async () => {
    seedPaidInvoiceAndCommission(); // commission 200 (20% of 1000)
    // Refund 800 → fraction 0.8 → reversal 160.
    await billingService.handleRefund({ refundId: "refund_800", paymentId: "pay_1", refundAmountPaise: 80000 });
    // Refund 400 more → fraction 0.4 would be 80, but only 40 remain → capped at 40.
    h.mockIsDuplicate.mockResolvedValue(false);
    await billingService.handleRefund({ refundId: "refund_400", paymentId: "pay_1", refundAmountPaise: 40000 });

    const reversals = h.commissionRows.filter((r) => r.entryType === "refund_reversal");
    const totalReversal = Math.abs(reversals.reduce((s, r) => s + (r.partnerShare as number), 0));
    expect(totalReversal).toBeLessThanOrEqual(200);
    // First reversal = 160, second capped to 40 (total 200, never 240).
    expect(reversals[0].partnerShare).toBe(-160);
    expect(reversals[1].partnerShare).toBe(-40);
  });

  it("RCCF-43: a partial refund keeps the original pending (net remainder stays settleable)", async () => {
    seedPaidInvoiceAndCommission();
    await billingService.handleRefund({ refundId: "refund_partial", paymentId: "pay_1", refundAmountPaise: 40000 });

    expect(h.commissionRows.find((r) => r.id === "ce-1")!.status).toBe("pending");
  });
});
