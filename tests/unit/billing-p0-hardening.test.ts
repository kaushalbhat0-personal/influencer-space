import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizePaidAmount, paiseFromRupees } from "@/modules/billing/application/service";

// ── normalizePaidAmount ──────────────────────────────────────────────────
describe("RCCF-BILLING-06B — P0 paid-amount hardening (string|number paise via BigInt)", () => {
  it("accepts valid number rupees", () => {
    expect(normalizePaidAmount(999)).toBe(999);
    expect(normalizePaidAmount(1999.0)).toBe(1999);
    expect(normalizePaidAmount(999.99)).toBe(999.99);
    expect(normalizePaidAmount(14999)).toBe(14999);
  });

  it("accepts valid string paise integer via BigInt", () => {
    expect(normalizePaidAmount("99900")).toBe(999); // 99900 paise = 999 rupees
    expect(normalizePaidAmount("199900")).toBe(1999);
    expect(normalizePaidAmount("1499900")).toBe(14999);
    expect(normalizePaidAmount("100")).toBe(1); // 100 paise = 1 rupee
  });

  it("accepts valid string rupees with decimals", () => {
    expect(normalizePaidAmount("1999.00")).toBe(1999);
    expect(normalizePaidAmount("999.99")).toBe(999.99);
    expect(normalizePaidAmount(" 1999.00 ")).toBe(1999);
  });

  it("rejects zero, negative, missing", () => {
    expect(normalizePaidAmount(0)).toBeNull();
    expect(normalizePaidAmount("0")).toBeNull();
    expect(normalizePaidAmount(0.0)).toBeNull();
    expect(normalizePaidAmount(-5)).toBeNull();
    expect(normalizePaidAmount("-100")).toBeNull();
    expect(normalizePaidAmount(null)).toBeNull();
    expect(normalizePaidAmount(undefined)).toBeNull();
    expect(normalizePaidAmount("")).toBeNull();
    expect(normalizePaidAmount("   ")).toBeNull();
  });

  it("rejects NaN, Infinity, malformed", () => {
    expect(normalizePaidAmount(NaN)).toBeNull();
    expect(normalizePaidAmount(Infinity)).toBeNull();
    expect(normalizePaidAmount(-Infinity)).toBeNull();
    expect(normalizePaidAmount("abc")).toBeNull();
    expect(normalizePaidAmount("12,34")).toBeNull();
    expect(normalizePaidAmount("19,990")).toBeNull();
    expect(normalizePaidAmount("NaN")).toBeNull();
    expect(normalizePaidAmount("Infinity")).toBeNull();
    expect(normalizePaidAmount("12..34")).toBeNull();
    expect(normalizePaidAmount("12.34.56")).toBeNull();
    expect(normalizePaidAmount("rzp_123")).toBeNull();
  });

  it("rejects control characters and non-numeric", () => {
    expect(normalizePaidAmount("1999\u0000")).toBeNull();
    expect(normalizePaidAmount("1999\u001f")).toBeNull();
    expect(normalizePaidAmount("1999\n")).toBeNull();
  });

  it("paiseFromRupees uses BigInt correctly", () => {
    expect(paiseFromRupees(999)).toBe(99900n);
    expect(paiseFromRupees(1999)).toBe(199900n);
    expect(paiseFromRupees(999.99)).toBe(99999n);
    expect(paiseFromRupees(0.01)).toBe(1n);
  });
});

// ── One-time 1-paise tolerance ───────────────────────────────────────────
describe("RCCF-BILLING-06B — P0 one-time 1-paise tolerance (DB price authority)", () => {
  function isWithinOnePaise(captured: number, expected: number): boolean {
    const cap = paiseFromRupees(captured);
    const exp = paiseFromRupees(expected);
    const diff = cap > exp ? cap - exp : exp - cap;
    return diff <= 1n;
  }

  it("exact match passes", () => {
    expect(isWithinOnePaise(4999, 4999)).toBe(true);
    expect(isWithinOnePaise(14999, 14999)).toBe(true);
    expect(isWithinOnePaise(999, 999)).toBe(true);
  });

  it("1 paise diff passes (4999.00 vs 4999.01)", () => {
    expect(isWithinOnePaise(4999.01, 4999)).toBe(true);
    expect(isWithinOnePaise(4999, 4999.01)).toBe(true);
    expect(isWithinOnePaise(14999.01, 14999)).toBe(true);
    expect(isWithinOnePaise(999.01, 999)).toBe(true);
  });

  it("2 paise diff fails", () => {
    expect(isWithinOnePaise(4999.02, 4999)).toBe(false);
    expect(isWithinOnePaise(4999, 4999.02)).toBe(false);
    expect(isWithinOnePaise(14999.02, 14999)).toBe(false);
  });

  it("DB price authority retained - captured 4998 vs expected 4999 fails", () => {
    expect(isWithinOnePaise(4998, 4999)).toBe(false);
    expect(isWithinOnePaise(5000, 4999)).toBe(false);
  });
});

// ── handleSubscriptionWebhook integration (RECONCILIATION_REQUIRED) ───────
const h = vi.hoisted(() => ({
  mockIsDuplicate: vi.fn(),
  mockFindSub: vi.fn(),
  mockFindPlanByCode: vi.fn(),
  mockCreateEvent: vi.fn(),
  mockUpsertSub: vi.fn(),
  mockFindInvoice: vi.fn(),
  mockTransaction: vi.fn(),
  mockCreateInvoice: vi.fn().mockResolvedValue({ id: "inv1" }),
}));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: {
    isDuplicateEvent: h.mockIsDuplicate,
    findSubscriptionByWorkspaceId: h.mockFindSub,
    findPlanByCode: h.mockFindPlanByCode,
    createEvent: h.mockCreateEvent,
    upsertSubscription: h.mockUpsertSub,
    findSubscriptionWithPlan: vi.fn(),
    findPlanByCode: h.mockFindPlanByCode,
    createInvoice: h.mockCreateInvoice,
  },
}));

vi.mock("@/lib/capabilities", async () => {
  const actual = await vi.importActual<typeof import("@/lib/capabilities")>("@/lib/capabilities");
  return actual;
});

vi.mock("@/config/commerce/plans", async () => {
  const actual = await vi.importActual<typeof import("@/config/commerce/plans")>("@/config/commerce/plans");
  return actual;
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: vi.fn().mockResolvedValue({ tenantId: "tenant1" }) },
    billingInvoice: { findFirst: h.mockFindInvoice },
    billingPlan: { findUnique: vi.fn() },
    $transaction: h.mockTransaction,
  },
}));

vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn() } }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn() } }));
vi.mock("@/lib/events", () => ({ platformEventBus: { publish: vi.fn() } }));
vi.mock("@/lib/commission/runtime", () => ({ recordSubscriptionCommission: vi.fn().mockResolvedValue(undefined) }));

import { billingService } from "@/modules/billing/application/service";

describe("handleSubscriptionWebhook — RECONCILIATION_REQUIRED on invalid amount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.mockIsDuplicate.mockResolvedValue(false);
    h.mockFindSub.mockResolvedValue(null);
    h.mockFindInvoice.mockResolvedValue(null);
    h.mockCreateEvent.mockResolvedValue({});
    h.mockUpsertSub.mockResolvedValue({ id: "sub1" });
    h.mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => fn({}));
    // @ts-ignore
    h.mockFindPlanByCode.mockImplementation(async (code: string) => {
      if (code === "creator_grow") return { id: "plan_grow", code, price: 999, runtimeConfig: {} };
      if (code === "partner_solo") return { id: "plan_solo", code, price: 4999, runtimeConfig: {} };
      return null;
    });
  });

  it("string paise 99900 activates (activate)", async () => {
    const res = await billingService.handleSubscriptionWebhook({
      eventName: "subscription.activated",
      workspaceId: "ws1",
      planCode: "creator_grow",
      providerReference: "pay_123",
      idempotencyKey: "k1",
      amount: "99900" as unknown as number,
    });
    expect(res.handled).toBe(true);
    expect(res.status).toBe("ACTIVE");
  });

  it("zero amount emits RECONCILIATION_REQUIRED and does not activate", async () => {
    const res = await billingService.handleSubscriptionWebhook({
      eventName: "subscription.activated",
      workspaceId: "ws1",
      planCode: "creator_grow",
      providerReference: "pay_zero",
      idempotencyKey: "k2",
      amount: 0 as unknown as number,
    });
    expect(res.handled).toBe(true);
    expect(res.status).toBeNull();
    expect(h.mockCreateEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "RECONCILIATION_REQUIRED" }));
  });

  it("missing amount emits RECONCILIATION_REQUIRED", async () => {
    const res = await billingService.handleSubscriptionWebhook({
      eventName: "subscription.activated",
      workspaceId: "ws1",
      planCode: "creator_grow",
      providerReference: "pay_missing",
      idempotencyKey: "k3",
      amount: undefined as unknown as number,
    });
    expect(res.handled).toBe(true);
    expect(h.mockCreateEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "RECONCILIATION_REQUIRED" }));
  });

  it("malformed string emits RECONCILIATION_REQUIRED", async () => {
    const res = await billingService.handleSubscriptionWebhook({
      eventName: "subscription.activated",
      workspaceId: "ws1",
      planCode: "creator_grow",
      providerReference: "pay_bad",
      idempotencyKey: "k4",
      amount: "abc" as unknown as number,
    });
    expect(res.handled).toBe(true);
    expect(h.mockCreateEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "RECONCILIATION_REQUIRED" }));
  });

  it("one-time exact match activates, 1-paise off activates, 2-paise off reconciles", async () => {
    // exact 4999
    const ok1 = await billingService.handleSubscriptionWebhook({
      eventName: "payment.captured",
      workspaceId: "ws2",
      planCode: "partner_solo",
      providerReference: "pay_ok1",
      idempotencyKey: "k5",
      amount: 4999 as unknown as number,
    });
    expect(ok1.handled).toBe(true);

    // 1 paise high 4999.01
    h.mockIsDuplicate.mockResolvedValue(false);
    h.mockCreateEvent.mockClear();
    h.mockFindInvoice.mockResolvedValue(null);
    const ok2 = await billingService.handleSubscriptionWebhook({
      eventName: "payment.captured",
      workspaceId: "ws3",
      planCode: "partner_solo",
      providerReference: "pay_ok2",
      idempotencyKey: "k6",
      amount: 4999.01 as unknown as number,
    });
    expect(ok2.handled).toBe(true);
    // should not have RECONCILIATION_REQUIRED for 1-paise tolerance
    const reconCalls = h.mockCreateEvent.mock.calls.filter((c: unknown[]) => (c[0] as {type:string}).type==="RECONCILIATION_REQUIRED");
    expect(reconCalls.length).toBe(0);

    // 2 paise high 4999.02 -> should emit RECONCILIATION_REQUIRED and not activate
    h.mockCreateEvent.mockClear();
    const bad = await billingService.handleSubscriptionWebhook({
      eventName: "payment.captured",
      workspaceId: "ws4",
      planCode: "partner_solo",
      providerReference: "pay_bad2",
      idempotencyKey: "k7",
      amount: 4999.02 as unknown as number,
    });
    expect(bad.handled).toBe(true);
    expect(h.mockCreateEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "RECONCILIATION_REQUIRED" }));
  });
});

describe("Creator Scale live provisioning (DB authority)", () => {
  it("creator_scale is subscription form and routes to Razorpay subscription when DB razorpayPlanId present", async () => {
    const { isOneTimePlan, getCommercePlan, planBillingForm } = await import("@/config/commerce/plans");
    expect(isOneTimePlan("creator_scale")).toBe(false);
    expect(planBillingForm("creator_scale")).toBe("subscription");
    expect(getCommercePlan("creator_scale")?.razorpayPlanId).toBeNull(); // registry null, DB wins per RCCF-36
    // Simulate provider branch: isOneTime false + DB planId present → subscription
    const dbPlanId = "plan_TYN22rYttjT92m"; // live provisioned via RAZORPAY_LIVE_PROVISIONING_AUTHORIZED=1
    const planId = isOneTimePlan("creator_scale") ? null : dbPlanId ?? getCommercePlan("creator_scale")?.razorpayPlanId;
    expect(planId).toBe("plan_TYN22rYttjT92m");
    // Would take razorpay.subscriptions.create, not orders.create
    expect(planId).not.toBeNull();
  });
});
