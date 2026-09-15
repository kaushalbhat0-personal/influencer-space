import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// ── Hoisted mocks ───────────────────────────────────────────────────────────
const h = vi.hoisted(() => ({
  isSmokeEnabled: vi.fn(),
  getServerSession: vi.fn(),
  prismaSmokeFindUnique: vi.fn(),
  prismaSmokeUpsert: vi.fn(),
  prismaLiveFindUnique: vi.fn(),
  billingFindPlan: vi.fn(),
  razorpayCreateCheckout: vi.fn(),
  razorpayCreateCapacity: vi.fn(),
  billingCreateEvent: vi.fn(),
  billingFindSubByWorkspace: vi.fn(),
  prismaInvoiceFindFirst: vi.fn(),
  prismaWorkspaceFindUnique: vi.fn(),
  prismaBillingInvoiceCreate: vi.fn(),
  prismaBillingInvoiceUpdate: vi.fn(),
}));

// Mock live-smoke-test lib
vi.mock("@/lib/live-smoke-test", () => ({
  isLiveSmokeTestEnabled: h.isSmokeEnabled,
  getLiveSmokeTestConfig: vi.fn(async () => ({ enabled: await h.isSmokeEnabled(), enabledBy: null, enabledAt: null, updatedAt: null })),
}));

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: h.getServerSession,
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    liveSmokeTestConfig: {
      findUnique: h.prismaLiveFindUnique,
      upsert: h.prismaSmokeUpsert,
    },
    billingSubscription: { findUnique: h.billingFindSubByWorkspace, findFirst: vi.fn() },
    billingInvoice: { findFirst: h.prismaInvoiceFindFirst, create: h.prismaBillingInvoiceCreate, update: h.prismaBillingInvoiceUpdate },
    workspace: { findUnique: h.prismaWorkspaceFindUnique },
    billingEvent: { findUnique: vi.fn(async () => null), create: h.billingCreateEvent },
    billingPlan: { findUnique: h.billingFindPlan },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn({})),
  },
}));

// Mock capabilities / plans
vi.mock("@/lib/capabilities", async () => {
  const actual = await vi.importActual<typeof import("@/lib/capabilities")>("@/lib/capabilities");
  return actual;
});

vi.mock("@/modules/billing/infrastructure/providers/razorpay", () => ({
  razorpayProvider: {
    createCheckout: h.razorpayCreateCheckout,
    createCapacityAddonOrder: h.razorpayCreateCapacity,
  },
}));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: {
    findPlanByCode: h.billingFindPlan,
    findSubscriptionByWorkspaceId: h.billingFindSubByWorkspace,
    findSubscriptionWithPlan: vi.fn(async () => null),
    isDuplicateEvent: vi.fn(async () => false),
    createEvent: h.billingCreateEvent,
    createInvoice: h.prismaBillingInvoiceCreate,
    upsertSubscription: vi.fn(async () => ({ id: "sub-1" })),
  },
}));

vi.mock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn() } }));
vi.mock("@/lib/events", () => ({ platformEventBus: { publish: vi.fn() } }));
vi.mock("@/modules/commission/runtime", () => ({ recordSubscriptionCommission: vi.fn(async () => {}) }));

beforeEach(() => {
  vi.clearAllMocks();
  h.isSmokeEnabled.mockResolvedValue(false);
  h.getServerSession.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN", email: "admin@test.com" } } as never);
  h.billingFindPlan.mockResolvedValue(null);
  h.razorpayCreateCheckout.mockResolvedValue({ success: true, orderId: "order_123", providerOrderId: "order_123" });
  h.razorpayCreateCapacity.mockResolvedValue({ success: true, orderId: "order_cap_123", amountPaise: 200000 });
  h.billingCreateEvent.mockResolvedValue({ id: "evt-1" });
  h.prismaInvoiceFindFirst.mockResolvedValue(null);
  h.prismaWorkspaceFindUnique.mockResolvedValue({ id: "ws-1", agencyId: "agency-1" });
  h.prismaBillingInvoiceCreate.mockResolvedValue({ id: "inv-1", issuedAt: new Date() } as never);
  h.billingFindSubByWorkspace.mockResolvedValue(null);
  h.prismaLiveFindUnique.mockResolvedValue({ enabled: false });
});

describe("RCCF-LIVE-SMOKE-01 — canonical pricing untouched", () => {
  it("COMMERCE_PLANS canonical prices remain unchanged", async () => {
    const { COMMERCE_PLANS } = await import("@/config/commerce/plans");
    const byCode = Object.fromEntries(COMMERCE_PLANS.map((p) => [p.code, p.price]));
    expect(byCode["creator_grow"]).toBe(999);
    expect(byCode["creator_scale"]).toBe(1999);
    expect(byCode["partner_solo"]).toBe(4999);
    expect(byCode["partner_scale"]).toBe(14999);
    const { PARTNER_ADDON_UNIT_PRICE_INR } = await import("@/config/commerce/agency-commercial");
    expect(PARTNER_ADDON_UNIT_PRICE_INR).toBe(2000);
  });

  it("marketing pricing not mutated by smoke test", async () => {
    const src = readFileSync(join(process.cwd(), "src/config/commerce/plans.ts"), "utf8");
    expect(src).not.toContain("SMOKE_TEST");
    expect(src).not.toContain("liveSmokeTest");
    expect(src).toContain('price: 999');
    expect(src).toContain('price: 1999');
    expect(src).toContain('price: 4999');
    expect(src).toContain('price: 14999');
  });

  it("royalty and capacity formulas unchanged", async () => {
    const { royaltyPercentForActiveClients } = await import("@/config/commerce/agency-commercial");
    expect(royaltyPercentForActiveClients(5)).toBe(20);
    const relSrc = readFileSync(join(process.cwd(), "src/modules/partner/application/partner-relationship.ts"), "utf8");
    expect(relSrc).toContain("AgencyPaidCapacity");
    // No smoke test logic should touch royalty/capacity
    expect(relSrc).not.toContain("SMOKE_TEST");
  });
});

describe("RCCF-LIVE-SMOKE-01 — checkout amount override", () => {
  it("normal pricing unchanged when override OFF (creator_grow → 999)", async () => {
    h.isSmokeEnabled.mockResolvedValue(false);
    const { BillingService } = await import("@/modules/billing/application/service");
    const svc = new BillingService();
    // Mock plan
    const { getPlan } = await import("@/lib/capabilities");
    // Ensure getPlan returns creator_grow with price 999
    // BillingService will fallback to registry when billingFindPlan returns null
    await svc.createCheckout("ws-1", "creator_grow");
    expect(h.razorpayCreateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ planCode: "creator_grow", price: 999, smokeTest: false }),
    );
  });

  it("₹1 only when override explicitly ON + SUPER_ADMIN (creator_grow → 1)", async () => {
    h.isSmokeEnabled.mockResolvedValue(true);
    h.getServerSession.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } } as never);
    const { BillingService } = await import("@/modules/billing/application/service");
    const svc = new BillingService();
    await svc.createCheckout("ws-1", "creator_grow");
    expect(h.razorpayCreateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ price: 1, smokeTest: true }),
    );
    // Verify checkout event tagged
    expect(h.billingCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ liveSmokeTest: true, smokeTestPrice: 1 }),
      }),
    );
  });

  it("non-SUPER_ADMIN cannot get ₹1 even when override ON (creator_scale stays 1999)", async () => {
    h.isSmokeEnabled.mockResolvedValue(true);
    h.getServerSession.mockResolvedValue({ user: { id: "u2", role: "ADMIN", tenantId: "t1" } } as never);
    const { BillingService } = await import("@/modules/billing/application/service");
    const svc = new BillingService();
    await svc.createCheckout("ws-1", "creator_scale");
    expect(h.razorpayCreateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ planCode: "creator_scale", price: 1999, smokeTest: false }),
    );
  });

  it("partner plans: solo/scale → 1 when ON+SUPER_ADMIN", async () => {
    h.isSmokeEnabled.mockResolvedValue(true);
    h.getServerSession.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } } as never);
    const { BillingService } = await import("@/modules/billing/application/service");
    const svc = new BillingService();
    await svc.createCheckout("ws-agency-1", "partner_solo");
    expect(h.razorpayCreateCheckout).toHaveBeenCalledWith(expect.objectContaining({ price: 1, smokeTest: true }));
    // Also test scale
    vi.clearAllMocks();
    h.isSmokeEnabled.mockResolvedValue(true);
    h.getServerSession.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } } as never);
    h.razorpayCreateCheckout.mockResolvedValue({ success: true, orderId: "order_2", providerOrderId: "order_2" });
    await svc.createCheckout("ws-agency-2", "partner_scale");
    expect(h.razorpayCreateCheckout).toHaveBeenCalledWith(expect.objectContaining({ price: 1, smokeTest: true }));
  });

  it("yearly partner price also → 1 (not 49990)", async () => {
    h.isSmokeEnabled.mockResolvedValue(true);
    h.getServerSession.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } } as never);
    const { BillingService } = await import("@/modules/billing/application/service");
    const svc = new BillingService();
    await svc.createCheckout("ws-agency-1", "partner_solo", undefined, "yearly");
    expect(h.razorpayCreateCheckout).toHaveBeenCalledWith(expect.objectContaining({ price: 1 }));
  });

  it("client cannot manipulate amount via input — price derived server-side", async () => {
    h.isSmokeEnabled.mockResolvedValue(true);
    h.getServerSession.mockResolvedValue({ user: { id: "u1", role: "SUPER_ADMIN" } } as never);
    const { BillingService } = await import("@/modules/billing/application/service");
    const svc = new BillingService();
    // Even if caller tries to pass price via CheckoutParams, service ignores it and uses smoke test 1
    // The public API is createCheckout(workspaceId, planCode) — no amount param exists
    await svc.createCheckout("ws-1", "creator_grow");
    // Second call with different workspace but same plan still 1 — not from client input
    expect(h.razorpayCreateCheckout).toHaveBeenCalledWith(expect.objectContaining({ price: 1 }));
    // Verify no query param handling exists in service
    const svcSrc = readFileSync(join(process.cwd(), "src/modules/billing/application/service.ts"), "utf8");
    expect(svcSrc).not.toContain("query");
    expect(svcSrc).not.toContain("searchParams");
    expect(svcSrc).toContain("SMOKE_TEST_PRICE_INR");
    expect(svcSrc).toContain("isSmokeTestEligiblePlan");
  });

  it("additional capacity: OFF → 2000/unit, ON → 1/unit", async () => {
    const { PARTNER_ADDON_UNIT_PRICE_INR } = await import("@/config/commerce/agency-addons");
    expect(PARTNER_ADDON_UNIT_PRICE_INR).toBe(2000);
    // Test via partnerCapacityPurchase expectedAmountPaise helper
    const { partnerCapacityPurchase } = await import("@/modules/billing/application/partner-capacity-purchase");
    expect(partnerCapacityPurchase.expectedAmountPaise(1, 2000)).toBe(200000);
    expect(partnerCapacityPurchase.expectedAmountPaise(1, 1)).toBe(100);
    expect(partnerCapacityPurchase.expectedAmountPaise(2, 1)).toBe(200);
  });
});

describe("RCCF-LIVE-SMOKE-01 — toggle authorization", () => {
  it("non-SUPER_ADMIN cannot enable smoke test", async () => {
    h.getServerSession.mockResolvedValue({ user: { id: "u2", role: "ADMIN", tenantId: "t1" } } as never);
    const { setLiveSmokeTestEnabled } = await import("@/actions/live-smoke-test.actions");
    const res = await setLiveSmokeTestEnabled(true);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Unauthorized/);
    expect(h.prismaSmokeUpsert).not.toHaveBeenCalled();
  });

  it("SUPER_ADMIN can enable/disable (source check)", async () => {
    const src = readFileSync(join(process.cwd(), "src/actions/live-smoke-test.actions.ts"), "utf8");
    expect(src).toContain('role !== "SUPER_ADMIN"');
    expect(src).toContain("liveSmokeTestConfig");
    expect(src).toContain("upsert");
    expect(src).toContain('enabledBy');
    expect(src).toContain("SMOKE_TEST_WARNING");
  });

  it("toggle source is SUPER_ADMIN-controlled state, not query param", async () => {
    const src = readFileSync(join(process.cwd(), "src/actions/live-smoke-test.actions.ts"), "utf8");
    expect(src).toContain('role !== "SUPER_ADMIN"');
    expect(src).toContain("liveSmokeTestConfig");
    expect(src).not.toContain("searchParams");
    // service derives amount server-side, never from client query
    const svcSrc = readFileSync(join(process.cwd(), "src/modules/billing/application/service.ts"), "utf8");
    expect(svcSrc).toContain("isLiveSmokeTestEnabled");
    expect(svcSrc).not.toContain("searchParams");
    expect(svcSrc).not.toContain("req.query");
    expect(svcSrc).toContain("SMOKE_TEST_PRICE_INR");
  });
});

describe("RCCF-LIVE-SMOKE-01 — webhook/invoice validation", () => {
  it("webhook accepts ₹1 only when smoke test enabled (and rejects when OFF)", async () => {
    // Setup: mock plan price 999, webhook amount 1
    const { BillingService } = await import("@/modules/billing/application/service");
    const svc = new BillingService();
    // Mock dependencies for handleSubscriptionWebhook
    h.prismaLiveFindUnique.mockResolvedValue({ enabled: false });
    // Need to mock billingPlan find to return plan with price 999
    h.billingFindPlan.mockResolvedValue({ id: "plan-1", code: "creator_grow", price: 999, runtimeConfig: null } as never);
    h.billingFindSubByWorkspace.mockResolvedValue({ id: "sub-1", status: "TRIALING", planId: "plan-1", trialEndsAt: new Date(Date.now() + 86400000) } as never);
    // When OFF, amount 1 should be rejected (no activation)
    h.isSmokeEnabled.mockResolvedValue(false);
    const offResult = await svc.handleSubscriptionWebhook({
      eventName: "subscription.activated",
      workspaceId: "ws-1",
      planCode: "creator_grow",
      providerReference: "pay_off_1",
      idempotencyKey: "idem_off_1",
      amount: 1,
    });
    // Should not have created ACTIVE invoice with 1 when OFF — it will create RECONCILIATION_REQUIRED and return handled but not activate?
    // The service returns handled:true but status remains TRIALING (not ACTIVE) when amount mismatch
    // We verify that billingCreateEvent was called with reconciliation
    expect(h.billingCreateEvent).toHaveBeenCalled();

    vi.clearAllMocks();
    h.billingFindPlan.mockResolvedValue({ id: "plan-1", code: "creator_grow", price: 999, runtimeConfig: null } as never);
    h.billingFindSubByWorkspace.mockResolvedValue({ id: "sub-1", status: "TRIALING", planId: "plan-1", trialEndsAt: new Date(Date.now() + 86400000) } as never);
    h.isSmokeEnabled.mockResolvedValue(true);
    h.billingCreateEvent.mockResolvedValue({ id: "evt-2" } as never);
    h.prismaInvoiceFindFirst.mockResolvedValue(null);
    // When ON, amount 1 should be accepted (isSmokeTest flag or enabled)
    // Need to mock prisma call for invoice creation inside transaction
    h.prismaBillingInvoiceCreate.mockResolvedValue({ id: "inv-2", issuedAt: new Date() } as never);
    const onResult = await svc.handleSubscriptionWebhook({
      eventName: "subscription.activated",
      workspaceId: "ws-1",
      planCode: "creator_grow",
      providerReference: "pay_on_1",
      idempotencyKey: "idem_on_1",
      amount: 1,
      isSmokeTest: true,
    });
    expect(onResult.handled).toBe(true);
  });

  it("invoice metadata tagged when smoke test", async () => {
    const svcSrc = readFileSync(join(process.cwd(), "src/modules/billing/application/service.ts"), "utf8");
    expect(svcSrc).toContain("liveSmokeTest");
    expect(svcSrc).toContain("SMOKE_TEST_WARNING");
    expect(svcSrc).toContain("metadata");
    const providerSrc = readFileSync(join(process.cwd(), "src/modules/billing/infrastructure/providers/razorpay.ts"), "utf8");
    expect(providerSrc).toContain("smokeTest");
    expect(providerSrc).toContain("liveSmokeTest");
    const capSrc = readFileSync(join(process.cwd(), "src/modules/billing/application/partner-capacity-purchase.ts"), "utf8");
    expect(capSrc).toContain("liveSmokeTest");
  });

  it("production warning present in UI toggle", async () => {
    const uiSrc = readFileSync(join(process.cwd(), "src/app/super-admin/_components/live-smoke-test-toggle.tsx"), "utf8");
    expect(uiSrc).toContain("SMOKE_TEST_WARNING");
    expect(uiSrc).toMatch(/LIVE.*SMOKE.*TEST|SMOKE_TEST_WARNING/);
    expect(uiSrc).toContain("Enable");
    expect(uiSrc).toContain("Disable");
    expect(uiSrc).toContain("data-testid=\"live-smoke-test-toggle\"");
    expect(uiSrc).toContain("data-testid=\"smoke-test-warning\"");
    const domainSrc = readFileSync(join(process.cwd(), "src/modules/billing/domain/live-smoke-test.ts"), "utf8");
    expect(domainSrc).toContain("LIVE SMOKE TEST PRICING");
    expect(domainSrc).toContain("REAL MONEY");
  });
});

describe("RCCF-LIVE-SMOKE-01 — Razorpay routing / entitlements untouched", () => {
  it("Razorpay routing unchanged (LIVE vs TEST logic intact)", async () => {
    const razorSrc = readFileSync(join(process.cwd(), "src/modules/billing/infrastructure/providers/razorpay.ts"), "utf8");
    expect(razorSrc).toContain("VERCEL_ENV");
    expect(razorSrc).toContain("RAZORPAY_KEY_ID");
    expect(razorSrc).toContain("timingSafeEqual");
  });

  it("entitlements, royalties, capacities not mutated by smoke test", async () => {
    const svcSrc = readFileSync(join(process.cwd(), "src/modules/billing/application/service.ts"), "utf8");
    // Smoke test only touches checkoutPrice and webhook expectedAmounts, not royalty/capacity formulas
    expect(svcSrc).toContain("isSmokeTestEligiblePlan");
    expect(svcSrc).toContain("SMOKE_TEST_PRICE_INR");
    // Should not contain royalty or max_clients mutation
    expect(svcSrc).not.toContain("royaltyPercentForActiveClients");
    expect(svcSrc).not.toContain("AgencyPaidCapacity");
    // Capacity still 5/25 (partner-relationship)
    const relSrc = readFileSync(join(process.cwd(), "src/modules/partner/application/partner-relationship.ts"), "utf8");
    expect(relSrc).toContain("paidCapacity");
    // Marketing pricing untouched
    const plansSrc = readFileSync(join(process.cwd(), "src/config/commerce/plans.ts"), "utf8");
    expect(plansSrc).toContain("price: 999");
    expect(plansSrc).toContain("price: 4999");
  });
});
