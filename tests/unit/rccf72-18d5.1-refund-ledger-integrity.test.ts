import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import crypto from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────
// RCCF-72.18D.5.1 — DIRECT_CREATOR refund ledger integrity.
//
// Ledger contract under test:
//   ProductOrder.refundAmount = cumulative ACTUAL successfully refunded paise.
//   - Initiation (D.3) never writes it; PENDING status is the only reservation.
//   - Provider failure leaves it untouched and releases headroom (S-2).
//   - refund.processed webhook clamp-adds exactly once (S-1); refund.failed
//     NEVER mutates it and can never convert FAILED into PARTIAL.
//   Invariant: 0 <= refundAmount <= round(order.amount * 100).
// ─────────────────────────────────────────────────────────────────────────────

const h = vi.hoisted(() => {
  const orders: Array<Record<string, any>> = [];
  const paymentAccounts: Array<Record<string, any>> = [];
  const billingEvents: Array<Record<string, any>> = [];
  const session: Record<string, any> = {
    user: {
      id: "user-1",
      tenantId: "11111111-1111-4111-8111-111111111111",
      role: "ADMIN",
      email: "creator@example.com",
      name: "Test Creator",
    },
  };
  return {
    orders,
    paymentAccounts,
    billingEvents,
    session,
    mockPaymentAccountFindUnique: vi.fn(),
    mockProductOrderFindUnique: vi.fn(),
    mockProductOrderFindFirst: vi.fn(),
    mockProductOrderUpdate: vi.fn(),
    mockBillingEventFindUnique: vi.fn(),
    mockBillingEventCreate: vi.fn(),
    mockBillingEventUpsert: vi.fn(),
    mockAdapter: { refundPayment: vi.fn() },
    mockGetPaymentProviderAdapter: vi.fn(),
    mockHandleRefund: vi.fn(),
    reset: () => {
      orders.length = 0;
      paymentAccounts.length = 0;
      billingEvents.length = 0;
      session.user = {
        id: "user-1",
        tenantId: "11111111-1111-4111-8111-111111111111",
        role: "ADMIN",
        email: "creator@example.com",
        name: "Test Creator",
      };
      [
        h.mockPaymentAccountFindUnique,
        h.mockProductOrderFindUnique,
        h.mockProductOrderFindFirst,
        h.mockProductOrderUpdate,
        h.mockBillingEventFindUnique,
        h.mockBillingEventCreate,
        h.mockBillingEventUpsert,
        h.mockAdapter.refundPayment,
        h.mockGetPaymentProviderAdapter,
        h.mockHandleRefund,
      ].forEach((m) => m.mockReset());
    },
  };
});

vi.mock("next-auth", () => ({
  getServerSession: async () => h.session,
  authOptions: {},
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentAccount: { findUnique: h.mockPaymentAccountFindUnique },
    productOrder: {
      findUnique: h.mockProductOrderFindUnique,
      findFirst: h.mockProductOrderFindFirst,
      update: h.mockProductOrderUpdate,
    },
    billingEvent: {
      findUnique: h.mockBillingEventFindUnique,
      create: h.mockBillingEventCreate,
      upsert: h.mockBillingEventUpsert,
    },
    $transaction: async (fn: (tx: Record<string, unknown>) => Promise<unknown>) => {
      const tx = {
        productOrder: {
          findUnique: h.mockProductOrderFindUnique,
          update: h.mockProductOrderUpdate,
          // RCCF-72.18D.5.5: the route's atomic apply-cycle now issues an
          // in-tx conditional increment. Emulate Prisma semantics: exact-base
          // predicate + relative increment on the shared fixture row.
          updateMany: ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
            const order = h.orders.find((o) => o.id === where.id);
            if (!order) return Promise.resolve({ count: 0 });
            const expectedBase = (where as { refundAmount?: number }).refundAmount;
            if ((order.refundAmount ?? 0) !== expectedBase) return Promise.resolve({ count: 0 });
            const inc = data.refundAmount as { increment?: number } | undefined;
            if (inc && typeof inc === "object" && typeof inc.increment === "number") {
              order.refundAmount = (order.refundAmount ?? 0) + inc.increment;
            }
            if ("refundId" in data) order.refundId = data.refundId;
            if ("refundedAt" in data) order.refundedAt = data.refundedAt;
            return Promise.resolve({ count: 1 });
          },
        },
        billingEvent: { create: h.mockBillingEventCreate, upsert: h.mockBillingEventUpsert },
        // RCCF-72.18D.6.5 POLICY 1: digital revocation joins the refund tx;
        // stubbed here (behavior asserted in the D.6.5 suite).
        orderFulfillment: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      };
      return fn(tx);
    },
  },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: (ciphertext: string) => {
    if (ciphertext === "encrypted_key_id") return "rzp_test_actual_key_id";
    if (ciphertext === "encrypted_key_secret") return "rzp_test_actual_key_secret";
    return ciphertext;
  },
  encrypt: (plaintext: string) => `encrypted_${plaintext}`,
}));

vi.mock("@/lib/audit", () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/observability/error-tracker", () => ({
  captureError: vi.fn(),
}));

vi.mock("@/modules/payment-account", () => ({
  getPaymentProviderAdapter: h.mockGetPaymentProviderAdapter,
}));

vi.mock("@/modules/billing/application/service", () => ({
  billingService: { handleRefund: h.mockHandleRefund },
}));

vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: { findMembershipsByUserId: vi.fn().mockResolvedValue([]) },
}));

vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true }),
}));

import {
  requestProductOrderRefund,
  executeProductOrderRefund,
} from "@/actions/payment-account.actions";
import { POST as webhookPOST } from "@/app/api/webhooks/razorpay/route";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const PAYMENT_ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID = "order-d51";
const PAYMENT_ID = "pay_d51_001";
const PROVIDER_REFUND_ID = "refund_d51_001";
const ORIGINAL = 100000; // ₹1000 in paise — the ticket's canonical example

function setupPaymentAccountA() {
  h.paymentAccounts.push({
    id: PAYMENT_ACCOUNT_A,
    tenantId: TENANT_A,
    provider: "razorpay",
    status: "active",
    verificationStatus: "configured",
    providerKeyId: "encrypted_key_id",
    providerKeySecret: "encrypted_key_secret",
  });
}

function pushOrder(overrides: Record<string, unknown> = {}) {
  const order = {
    id: ORDER_ID,
    tenantId: TENANT_A,
    productId: "product-d51",
    amount: 1000, // rupees → ORIGINAL paise
    status: "COMPLETED",
    commerceStrategy: "DIRECT_CREATOR",
    paymentAccountId: PAYMENT_ACCOUNT_A,
    razorpayPaymentId: PAYMENT_ID,
    refundAmount: 0, // ACTUAL refunded-to-date
    refundStatus: "NONE" as string,
    refundId: null,
    refundedAt: null,
    ...overrides,
  };
  h.orders.push(order);
  return order;
}

const orderRow = () => h.orders.find((o) => o.id === ORDER_ID)!;

function assertLedgerInvariant() {
  for (const o of h.orders) {
    const original = Math.round((o.amount as number) * 100);
    expect(o.refundAmount).toBeGreaterThanOrEqual(0);
    expect(o.refundAmount).toBeLessThanOrEqual(original);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  setupPaymentAccountA();

  h.mockPaymentAccountFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
    Promise.resolve(h.paymentAccounts.find((a) => a.id === where.id) ?? null),
  );
  h.mockProductOrderFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
    Promise.resolve(h.orders.find((o) => o.id === where.id) ?? null),
  );
  h.mockProductOrderFindFirst.mockImplementation(({ where }: { where: { razorpayPaymentId: string } }) =>
    Promise.resolve(h.orders.find((o) => o.razorpayPaymentId === where.razorpayPaymentId) ?? null),
  );
  h.mockProductOrderUpdate.mockImplementation(({ where, data }: { where: { id: string; refundStatus?: { in?: string[] } }; data: Record<string, unknown> }) => {
    const order = h.orders.find((o) => o.id === where.id);
    const allowed = where.refundStatus?.in;
    if (!order || (allowed && !allowed.includes(order.refundStatus))) return Promise.resolve(null);
    Object.assign(order, data);
    return Promise.resolve({ ...order });
  });
  h.mockBillingEventFindUnique.mockImplementation(({ where }: { where: { idempotencyKey: string } }) =>
    Promise.resolve(h.billingEvents.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null),
  );
  h.mockBillingEventCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
    h.billingEvents.push({ id: `evt-${h.billingEvents.length + 1}`, ...data });
    return Promise.resolve({ id: `evt-${h.billingEvents.length}`, ...data });
  });
  // Upsert semantics for the per-order completion marker (RCCF-72.18D.5.1)
  h.mockBillingEventUpsert.mockImplementation(({ where, update, create }: { where: { idempotencyKey: string }; update: Record<string, unknown>; create: Record<string, unknown> }) => {
    const idx = h.billingEvents.findIndex((e) => e.idempotencyKey === where.idempotencyKey);
    if (idx >= 0) {
      h.billingEvents[idx] = { ...h.billingEvents[idx], ...update };
      return Promise.resolve(h.billingEvents[idx]);
    }
    const row = { id: `evt-up-${h.billingEvents.length + 1}`, ...create };
    h.billingEvents.push(row);
    return Promise.resolve(row);
  });
  h.mockGetPaymentProviderAdapter.mockReturnValue(h.mockAdapter);
  h.mockHandleRefund.mockResolvedValue({ handled: true });
});

// ── Part 1 — Synchronous D.3 → D.4 lifecycle ────────────────────────────────

describe("RCCF-72.18D.5.1 — synchronous refund ledger lifecycle", () => {
  it("Scenario 1: successful full refund — NONE → PENDING → REFUNDED, ledger = original", async () => {
    pushOrder();
    await requestProductOrderRefund({ orderId: ORDER_ID, amount: ORIGINAL });

    // Initiation must NOT have reserved anything
    expect(orderRow().refundStatus).toBe("PENDING");
    expect(orderRow().refundAmount).toBe(0);

    h.mockAdapter.refundPayment.mockResolvedValue({ success: true, providerRefundId: PROVIDER_REFUND_ID, status: "processed" });
    const exec = await executeProductOrderRefund({ orderId: ORDER_ID, amount: ORIGINAL });

    expect(exec.success).toBe(true);
    expect(orderRow().refundStatus).toBe("REFUNDED");
    expect(orderRow().refundAmount).toBe(ORIGINAL);
    expect(orderRow().refundId).toBe(PROVIDER_REFUND_ID);
    assertLedgerInvariant();
  });

  it("Scenario 2: successful partial refund — PARTIAL with exact actual amount", async () => {
    pushOrder();
    await requestProductOrderRefund({ orderId: ORDER_ID, amount: 30000 });
    h.mockAdapter.refundPayment.mockResolvedValue({ success: true, providerRefundId: PROVIDER_REFUND_ID, status: "processed" });
    const exec = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 30000 });

    expect(exec.success).toBe(true);
    expect(orderRow().refundStatus).toBe("PARTIAL");
    expect(orderRow().refundAmount).toBe(30000);
    assertLedgerInvariant();
  });

  it("Scenario 3: second partial refund accumulates on the actual ledger", async () => {
    pushOrder({ refundAmount: 30000, refundStatus: "PARTIAL", refundId: "r1" });
    await requestProductOrderRefund({ orderId: ORDER_ID, amount: 20000 }); // PARTIAL is re-initiable
    h.mockAdapter.refundPayment.mockResolvedValue({ success: true, providerRefundId: "r2", status: "processed" });
    const exec = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 20000 });

    expect(exec.success).toBe(true);
    expect(exec.totalRefundedPaise).toBe(50000);
    expect(orderRow().refundAmount).toBe(50000);
    expect(orderRow().refundStatus).toBe("PARTIAL");
    assertLedgerInvariant();
  });

  it("Scenario 4: cumulative ceiling enforced at initiation AND execution", async () => {
    pushOrder({ refundAmount: 70000, refundStatus: "PARTIAL", refundId: "r1" });

    const overInit = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 30001 });
    expect(overInit.code).toBe("AMOUNT_EXCEEDS_REMAINING");

    // Execution-side guard rejects even if a race slipped an over-sized
    // initiation through — simulate that cycle as PENDING.
    orderRow().refundStatus = "PENDING";
    const overExec = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 30001 });
    expect(overExec.success).toBe(false);
    expect(overExec.code).toBe("AMOUNT_EXCEEDS_REMAINING");

    // Exact remaining is admitted end-to-end (restore the settled PARTIAL state)
    orderRow().refundStatus = "PARTIAL";
    await requestProductOrderRefund({ orderId: ORDER_ID, amount: 30000 });
    h.mockAdapter.refundPayment.mockResolvedValue({ success: true, providerRefundId: "r2", status: "processed" });
    const exact = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 30000 });
    expect(exact.success).toBe(true);
    expect(orderRow().refundStatus).toBe("REFUNDED");
    expect(orderRow().refundAmount).toBe(ORIGINAL);
    assertLedgerInvariant();
  });

  it("Scenario 5+6: provider failure → FAILED and the reservation is released (ledger untouched)", async () => {
    pushOrder();
    await requestProductOrderRefund({ orderId: ORDER_ID, amount: ORIGINAL });
    expect(orderRow().refundStatus).toBe("PENDING");
    expect(orderRow().refundAmount).toBe(0);

    h.mockAdapter.refundPayment.mockResolvedValue({ success: false, error: "Insufficient balance" });
    const exec = await executeProductOrderRefund({ orderId: ORDER_ID, amount: ORIGINAL });

    expect(exec.success).toBe(false);
    expect(exec.code).toBe("INVALID_REQUEST");
    expect(orderRow().refundStatus).toBe("FAILED");
    // S-2: nothing was ever reserved, so there is nothing to leak.
    expect(orderRow().refundAmount).toBe(0);
    assertLedgerInvariant();
  });

  it("Scenario 7 (ticket regression): full refund fails → retry of the FULL amount succeeds truthfully", async () => {
    pushOrder();

    // Attempt #1 — provider fails
    await requestProductOrderRefund({ orderId: ORDER_ID, amount: ORIGINAL });
    h.mockAdapter.refundPayment.mockResolvedValueOnce({ success: false, error: "gateway timeout" });
    const fail1 = await executeProductOrderRefund({ orderId: ORDER_ID, amount: ORIGINAL });
    expect(fail1.code).toBe("INVALID_REQUEST"); // provider explicitly rejected
    expect(orderRow().refundStatus).toBe("FAILED");
    expect(orderRow().refundAmount).toBe(0);

    // Retry — headroom was released, so the FULL amount is requestable again
    const retryInit = await requestProductOrderRefund({ orderId: ORDER_ID, amount: ORIGINAL });
    expect(retryInit.success).toBe(true);
    h.mockAdapter.refundPayment.mockResolvedValueOnce({ success: true, providerRefundId: "r-retry", status: "processed" });
    const retry = await executeProductOrderRefund({ orderId: ORDER_ID, amount: ORIGINAL });

    expect(retry.success).toBe(true);
    expect(orderRow().refundStatus).toBe("REFUNDED");
    expect(orderRow().refundAmount).toBe(ORIGINAL); // counted once, not twice
    assertLedgerInvariant();
  });

  it("Scenario 8: partial success then failed remainder keeps the successful 300 only", async () => {
    pushOrder();

    await requestProductOrderRefund({ orderId: ORDER_ID, amount: 30000 });
    h.mockAdapter.refundPayment.mockResolvedValueOnce({ success: true, providerRefundId: "r1", status: "processed" });
    await executeProductOrderRefund({ orderId: ORDER_ID, amount: 30000 });
    expect(orderRow().refundAmount).toBe(30000);

    await requestProductOrderRefund({ orderId: ORDER_ID, amount: 70000 });
    h.mockAdapter.refundPayment.mockResolvedValueOnce({ success: false, error: "declined" });
    const failedRemainder = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 70000 });

    expect(failedRemainder.success).toBe(false);
    expect(orderRow().refundStatus).toBe("FAILED");
    expect(orderRow().refundAmount).toBe(30000); // ONLY the money that actually moved
    assertLedgerInvariant();
  });

  it("Scenario 9: partial → failed remainder → successful retry completes to REFUNDED", async () => {
    pushOrder({ refundAmount: 30000, refundStatus: "PARTIAL", refundId: "r1" });

    await requestProductOrderRefund({ orderId: ORDER_ID, amount: 70000 });
    h.mockAdapter.refundPayment.mockResolvedValueOnce({ success: false, error: "bank busy" });
    await executeProductOrderRefund({ orderId: ORDER_ID, amount: 70000 });
    expect(orderRow().refundAmount).toBe(30000);
    expect(orderRow().refundStatus).toBe("FAILED");

    await requestProductOrderRefund({ orderId: ORDER_ID, amount: 70000 });
    h.mockAdapter.refundPayment.mockResolvedValueOnce({ success: true, providerRefundId: "r3", status: "processed" });
    const retry = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 70000 });

    expect(retry.success).toBe(true);
    expect(retry.totalRefundedPaise).toBe(ORIGINAL);
    expect(orderRow().refundStatus).toBe("REFUNDED");
    expect(orderRow().refundAmount).toBe(ORIGINAL);
    assertLedgerInvariant();
  });
});

// ── Part 2 — Authorization / tenant / binding (table-driven) ────────────────

describe("RCCF-72.18D.5.1 — authorization & historical PaymentAccount binding", () => {
  const DENIED_ROLES = ["AGENCY_ADMIN", "AGENCY_STAFF", "SUPPORT", "READ_ONLY"] as const;

  it.each(DENIED_ROLES)("Scenario 18: role %s is denied on both refund actions", async (role) => {
    pushOrder();
    h.session.user = { ...(h.session.user as object), role, tenantId: TENANT_A };

    const init = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 100 });
    expect(init.code).toBe("UNAUTHORIZED");

    // Force a PENDING state so execution reaches past state checks if authz were broken
    pushOrder({ refundStatus: "PENDING" });
    const exec = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 100 });
    expect(exec.code).toBe("UNAUTHORIZED");
    expect(h.mockAdapter.refundPayment).not.toHaveBeenCalled();
  });

  it("Scenario 18b: anonymous is denied", async () => {
    pushOrder();
    h.session.user = null;
    const init = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 100 });
    expect(init.code).toBe("UNAUTHORIZED");
  });

  it("Scenario 15: another creator's tenant is denied (order not found semantics)", async () => {
    pushOrder();
    h.session.user = { ...(h.session.user as object), tenantId: "22222222-2222-4222-8222-222222222222" };

    const init = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 100 });
    expect(init.code).toBe("FORBIDDEN");
  });

  it("Scenario 19: SUPER_ADMIN retains intentional cross-tenant capability", async () => {
    pushOrder();
    h.session.user = { ...(h.session.user as object), role: "SUPER_ADMIN", tenantId: "other-tenant" };

    const init = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 30000 });
    expect(init.success).toBe(true);

    h.mockAdapter.refundPayment.mockResolvedValue({ success: true, providerRefundId: PROVIDER_REFUND_ID, status: "processed" });
    const exec = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 30000 });
    expect(exec.success).toBe(true);
  });

  it("Scenario 17: PLATFORM_COLLECT orders are rejected from the creator-direct path", async () => {
    pushOrder({ commerceStrategy: "PLATFORM_COLLECT" });

    const init = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 100 });
    expect(init.code).toBe("INVALID_STRATEGY");

    pushOrder({ commerceStrategy: "PLATFORM_COLLECT", refundStatus: "PENDING" });
    const exec = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 100 });
    expect(exec.code).toBe("INVALID_STRATEGY");
  });

  it("Scenario 16: cross-tenant PaymentAccount binding rejected before any provider call", async () => {
    pushOrder({ paymentAccountId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" });
    h.paymentAccounts.push({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      tenantId: "22222222-2222-4222-8222-222222222222",
      provider: "razorpay",
      providerKeyId: "encrypted_key_id",
      providerKeySecret: "encrypted_key_secret",
    });

    const init = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 100 });
    expect(init.code).toBe("INVALID_PAYMENT_ACCOUNT");

    // Execution probe on a PENDING cycle bound to the foreign account
    h.orders.length = 0;
    pushOrder({ paymentAccountId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", refundStatus: "PENDING" });
    const exec = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 100 });
    expect(exec.code).toBe("INVALID_PAYMENT_ACCOUNT");
    expect(h.mockAdapter.refundPayment).not.toHaveBeenCalled();
  });

  it("Scenario 20: execution uses the HISTORICAL account bound to the order, not the current tenant account", async () => {
    pushOrder({ refundStatus: "PENDING" }); // initiated cycle awaiting execution
    // A DIFFERENT account currently attached to the tenant must be ignored
    h.paymentAccounts.push({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      tenantId: TENANT_A,
      provider: "razorpay",
      providerKeyId: "encrypted_new_id",
      providerKeySecret: "encrypted_new_secret",
    });

    h.mockAdapter.refundPayment.mockResolvedValue({ success: true, providerRefundId: PROVIDER_REFUND_ID, status: "processed" });
    await executeProductOrderRefund({ orderId: ORDER_ID, amount: 30000 });

    expect(h.mockPaymentAccountFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PAYMENT_ACCOUNT_A } }),
    );
    expect(h.mockAdapter.refundPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        providerKeyId: "rzp_test_actual_key_id",
        providerKeySecret: "rzp_test_actual_key_secret",
      }),
    );
    // No secret material ever reaches the ACTION RESULT returned to the client
    expect(JSON.stringify(await executeProductOrderRefund({ orderId: ORDER_ID, amount: 30000 }))).not.toContain("rzp_test_actual");
  });
});

// ── Part 3 — Webhook reconciliation (signed route-level tests) ──────────────

describe("RCCF-72.18D.5.1 — refund webhook reconciliation", () => {
  const SECRET = "whsec_rccf72_18d5_1";

  function signedWebhook(event: string, refundId: string, amountPaise: number): Request {
    const body = JSON.stringify({
      event,
      payload: {
        refund: { entity: { id: refundId, payment_id: PAYMENT_ID, amount: amountPaise } },
        payment: { entity: { id: PAYMENT_ID } },
      },
    });
    const signature = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
    return new Request("http://localhost/api/webhooks/razorpay", {
      method: "POST",
      body,
      headers: { "x-razorpay-signature": signature, "content-type": "application/json" },
    });
  }

  beforeAll(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  });

  it("Scenario 14: refund.processed after PENDING counts the provider amount exactly once", async () => {
    pushOrder({ refundStatus: "PENDING" });

    const res = await webhookPOST(signedWebhook("refund.processed", "wh_r1", 40000));
    expect(res.status).toBe(200);
    expect(orderRow().refundStatus).toBe("PARTIAL");
    expect(orderRow().refundAmount).toBe(40000);
    expect(h.billingEvents.some((e) => e.type === "REFUND_WEBHOOK_RECONCILED")).toBe(true);
    assertLedgerInvariant();
  });

  it("Scenario 10: duplicate refund.processed produces no additional refund amount", async () => {
    pushOrder({ refundStatus: "PENDING" });

    await webhookPOST(signedWebhook("refund.processed", "wh_dup", 40000));
    const updatesAfterFirst = h.mockProductOrderUpdate.mock.calls.length;

    await webhookPOST(signedWebhook("refund.processed", "wh_dup", 40000));

    expect(orderRow().refundAmount).toBe(40000); // NOT 80000
    expect(orderRow().refundStatus).toBe("PARTIAL");
    expect(h.mockProductOrderUpdate.mock.calls.length).toBe(updatesAfterFirst); // no second write
    expect(h.billingEvents.filter((e) => e.idempotencyKey === "product_refund_webhook_wh_dup").length).toBe(1);
    assertLedgerInvariant();
  });

  it("Scenario 11: duplicate refund.failed causes no state corruption", async () => {
    pushOrder({ refundStatus: "PENDING" });

    await webhookPOST(signedWebhook("refund.failed", "wh_fail", 40000));
    expect(orderRow().refundStatus).toBe("FAILED");
    expect(orderRow().refundAmount).toBe(0);

    await webhookPOST(signedWebhook("refund.failed", "wh_fail", 40000));

    expect(orderRow().refundStatus).toBe("FAILED");
    expect(orderRow().refundAmount).toBe(0);
    expect(h.billingEvents.filter((e) => e.idempotencyKey === "product_refund_webhook_wh_fail").length).toBe(1);
    assertLedgerInvariant();
  });

  it("Scenario 12: refund.failed carrying amount > 0 can NOT become PARTIAL (S-1 regression)", async () => {
    pushOrder({ refundStatus: "PENDING" });

    await webhookPOST(signedWebhook("refund.failed", "wh_amt", 99999));

    expect(orderRow().refundStatus).toBe("FAILED"); // the old code produced PARTIAL here
    expect(orderRow().refundAmount).toBe(0);       // the old code double-counted here
    assertLedgerInvariant();
  });

  it("Scenario 13: late refund.failed after synchronous provider failure changes nothing", async () => {
    // Simulate: D.3 initiated, D.4 executed synchronously and failed
    pushOrder({ refundStatus: "FAILED", refundAmount: 30000, refundId: null });

    await webhookPOST(signedWebhook("refund.failed", "wh_late", 70000));

    expect(orderRow().refundStatus).toBe("FAILED");
    expect(orderRow().refundAmount).toBe(30000); // untouched — no double count of the failed attempt
    assertLedgerInvariant();
  });

  it("Late refund.processed after synchronous failure recovers truthfully (timeout-but-succeeded)", async () => {
    pushOrder({ refundStatus: "FAILED", refundAmount: 30000, refundId: null });

    await webhookPOST(signedWebhook("refund.processed", "wh_recover", 70000));

    expect(orderRow().refundStatus).toBe("REFUNDED");
    expect(orderRow().refundAmount).toBe(100000); // money really did move — counted now, exactly once
    assertLedgerInvariant();
  });

  it("Clamp: processed amount beyond remaining headroom caps at the captured ceiling", async () => {
    pushOrder({ refundStatus: "PARTIAL", refundAmount: 80000, refundId: "r1" });

    await webhookPOST(signedWebhook("refund.processed", "wh_clamp", 50000));

    expect(orderRow().refundAmount).toBe(100000); // min(80000+50000, 100000)
    expect(orderRow().refundStatus).toBe("REFUNDED");
    expect(h.billingEvents[0].payload.totalRefundedPaise).toBe(100000);
    expect(h.billingEvents[0].payload.amountPaise).toBe(20000);
    assertLedgerInvariant();
  });

  it("PLATFORM_COLLECT orders are never product-reconciled by this block", async () => {
    pushOrder({ commerceStrategy: "PLATFORM_COLLECT", refundStatus: "PENDING" });

    await webhookPOST(signedWebhook("refund.processed", "wh_pc", 40000));

    expect(h.mockHandleRefund).toHaveBeenCalled(); // partner-commission path still runs
    expect(h.mockProductOrderUpdate).not.toHaveBeenCalled(); // product ledger untouched
    expect(h.billingEvents.filter((e) => String(e.idempotencyKey).startsWith("product_refund_webhook_")).length).toBe(0);
  });
});
