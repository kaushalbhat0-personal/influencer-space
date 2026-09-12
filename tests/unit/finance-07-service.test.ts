/**
 * FINANCE-07 — Service webhook/reconciliation paise + idempotency
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const sh = vi.hoisted(() => ({
  mockIsDuplicate: vi.fn(),
  mockFindSub: vi.fn(),
  mockFindPlanByCode: vi.fn(),
  mockCreateEvent: vi.fn(),
  mockUpsertSub: vi.fn(),
  mockFindInvoice: vi.fn(),
  mockTransaction: vi.fn(),
  mockCreateInvoice: vi.fn(),
  mockFindSubWithPlan: vi.fn(),
}));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: {
    isDuplicateEvent: sh.mockIsDuplicate,
    findSubscriptionByWorkspaceId: sh.mockFindSub,
    findPlanByCode: sh.mockFindPlanByCode,
    createEvent: sh.mockCreateEvent,
    upsertSubscription: sh.mockUpsertSub,
    findSubscriptionWithPlan: sh.mockFindSubWithPlan,
    createInvoice: sh.mockCreateInvoice,
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: vi.fn().mockResolvedValue({ tenantId: null }) },
    billingInvoice: { findFirst: sh.mockFindInvoice },
    billingPlan: { findUnique: vi.fn() },
    billingEvent: { findUnique: vi.fn().mockResolvedValue(null) },
    $transaction: sh.mockTransaction,
  },
}));

vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn() } }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn() } }));
vi.mock("@/lib/events", () => ({ platformEventBus: { publish: vi.fn() } }));
vi.mock("@/lib/commission/runtime", () => ({ recordSubscriptionCommission: vi.fn().mockResolvedValue(undefined) }));

import { BillingService } from "@/modules/billing/application/service";

let billingService: BillingService;

beforeEach(async () => {
  vi.clearAllMocks();
  sh.mockIsDuplicate.mockResolvedValue(false);
  sh.mockFindSub.mockResolvedValue(null);
  sh.mockFindInvoice.mockResolvedValue(null);
  sh.mockCreateEvent.mockResolvedValue({});
  sh.mockUpsertSub.mockResolvedValue({ id: "sub-1" });
  sh.mockFindSubWithPlan.mockResolvedValue(null);
  sh.mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
    await fn({});
  });
  sh.mockCreateInvoice.mockImplementation(async (data: { amount: number; amountPaise?: number }) => {
    const paise = data.amountPaise ?? Math.round(data.amount * 100);
    return { id: "inv-1", amount: data.amount, amountPaise: paise };
  });
  sh.mockFindPlanByCode.mockImplementation(async (code: string) => ({
    id: `plan-${code}`,
    code,
    price: code === "partner_solo" ? 4999 : code === "partner_scale" ? 14999 : 999,
    runtimeConfig: null,
  }));
  billingService = new BillingService();
});

describe("FINANCE-07 — webhook paise + idempotency", () => {
  it("webhook monthly ₹4,999 → ACTIVE and amount 4999 would yield 499900 paise", async () => {
    const res = await billingService.handleSubscriptionWebhook({
      eventName: "payment.captured",
      workspaceId: "ws-monthly",
      planCode: "partner_solo",
      providerReference: "order_monthly",
      idempotencyKey: "k-monthly",
      amount: 4999,
      cycle: "monthly",
    });
    expect(res.handled).toBe(true);
    expect(res.status).toBe("ACTIVE");
    expect(sh.mockCreateInvoice).toHaveBeenCalledTimes(1);
    const arg = sh.mockCreateInvoice.mock.calls[0]?.[0] as { amount: number };
    expect(arg.amount).toBe(4999);
    expect(Math.round(arg.amount * 100)).toBe(499900);
  });

  it("webhook yearly ₹49,990 → 4999000 paise", async () => {
    const res = await billingService.handleSubscriptionWebhook({
      eventName: "payment.captured",
      workspaceId: "ws-yearly",
      planCode: "partner_solo",
      providerReference: "order_yearly",
      idempotencyKey: "k-yearly",
      amount: 49990,
      cycle: "yearly",
    });
    expect(res.handled).toBe(true);
    expect(res.status).toBe("ACTIVE");
    const arg = sh.mockCreateInvoice.mock.calls[0]?.[0] as { amount: number };
    expect(Math.round(arg.amount * 100)).toBe(4999000);
  });

  it("duplicate isDuplicate prevents invoice", async () => {
    sh.mockIsDuplicate.mockResolvedValue(true);
    const res = await billingService.handleSubscriptionWebhook({
      eventName: "payment.captured",
      workspaceId: "ws-idem",
      planCode: "partner_solo",
      providerReference: "order_idem",
      idempotencyKey: "k-idem",
      amount: 4999,
    });
    expect(res.handled).toBe(false);
    expect(sh.mockCreateInvoice).not.toHaveBeenCalled();
  });

  it("duplicate providerReference guards second invoice", async () => {
    const first = await billingService.handleSubscriptionWebhook({
      eventName: "payment.captured",
      workspaceId: "ws-dup",
      planCode: "partner_solo",
      providerReference: "order_dup",
      idempotencyKey: "k-dup",
      amount: 4999,
    });
    expect(first.handled).toBe(true);
    expect(sh.mockCreateInvoice).toHaveBeenCalledTimes(1);
    sh.mockFindInvoice.mockResolvedValue({ id: "existing" });
    sh.mockCreateInvoice.mockClear();
    const second = await billingService.handleSubscriptionWebhook({
      eventName: "payment.captured",
      workspaceId: "ws-dup",
      planCode: "partner_solo",
      providerReference: "order_dup",
      idempotencyKey: "k-dup-2",
      amount: 4999,
    });
    expect(second.handled).toBe(true);
    expect(sh.mockCreateInvoice).not.toHaveBeenCalled();
  });

  it("reconciliation persists paise correctly", async () => {
    const { prisma } = await import("@/lib/prisma");
    (prisma.billingEvent.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "evt-recon",
      workspaceId: "ws-recon",
      accountId: "ws-recon",
      type: "RECONCILIATION_REQUIRED",
      idempotencyKey: "reconcile_required_pay_recon",
      payload: { planCode: "partner_solo", amount: 4999, eventName: "payment.captured" },
    });
    (prisma.billingInvoice.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    sh.mockFindSub.mockResolvedValue({ id: "sub-recon" });
    sh.mockCreateInvoice.mockClear();
    const res = await billingService.reconcileFailedPayment("pay_recon");
    expect(res.handled).toBe(true);
    expect(res.repaired).toBe(true);
    expect(sh.mockCreateInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ planCode: "partner_solo", amount: 4999, providerReference: "pay_recon" }),
      expect.anything(),
    );
    const arg = sh.mockCreateInvoice.mock.calls[0]?.[0] as { amount: number };
    expect(Math.round(arg.amount * 100)).toBe(499900);
  });
});
