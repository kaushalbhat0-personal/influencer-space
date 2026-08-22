import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import crypto from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────
// RCCF-72.18D.5.5 — DIRECT_CREATOR webhook production hardening & signed E2E.
//
// Route-level tests against the REAL POST handler with REAL HMAC-SHA256
// signature verification (never bypassed):
//   A. Signature security — valid/invalid/missing/wrong-secret/tampered/
//      malformed/garbage-body/unconfigured-secret.
//   B. Refund reconciliation — sequential partials, full-after-partial,
//      ceiling clamp, unknown orders, malformed entities, strategy gate.
//   C. Concurrency/idempotency — racing duplicates apply exactly once
//      (DB-style unique constraint + transaction rollback emulated),
//      different refunds sum atomically within the ceiling.
//   D. X-Razorpay-Failure-Reason — sanitization, persistence into
//      ProductOrder.providerMetadata (no schema change), dedupe, and the
//      untouched subscription path.
//
// Ledger invariant asserted throughout: 0 <= refundAmount <= captured.
// ─────────────────────────────────────────────────────────────────────────────

const SECRET = "whsec_rccf72_18d55";
const TENANT_A = "11111111-1111-4111-8111-111111111111";
const PAYMENT_ID = "pay_d55_001";
const RZP_ORDER_ID = "order_rzp_d55_001";
const ORDER_ID = "order-d55";
const CAPTURED = 100000; // ₹1000 in paise

const h = vi.hoisted(() => {
  const orders: Array<Record<string, any>> = [];
  const billingEvents: Array<Record<string, any>> = [];
  return {
    orders,
    billingEvents,
    mockProductOrderFindUnique: vi.fn(),
    mockProductOrderFindFirst: vi.fn(),
    mockProductOrderUpdate: vi.fn(),
    mockProductOrderUpdateMany: vi.fn(),
    mockPaymentAccountFindUnique: vi.fn(),
    mockBillingEventFindUnique: vi.fn(),
    mockBillingEventCreate: vi.fn(),
    mockBillingEventUpsert: vi.fn(),
    mockTransaction: vi.fn(),
    mockHandleRefund: vi.fn(),
    mockHandleSubscriptionWebhook: vi.fn(),
    mockCaptureError: vi.fn(),
  };
});

vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: null }) }));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init),
  },
}));

function findOrderByWhere(where: Record<string, unknown>) {
  if (typeof where.razorpayPaymentId === "string") {
    return h.orders.find((o) => o.razorpayPaymentId === where.razorpayPaymentId) ?? null;
  }
  if (typeof where.razorpayOrderId === "string") {
    return h.orders.find((o) => o.razorpayOrderId === where.razorpayOrderId) ?? null;
  }
  if (typeof where.id === "string") {
    return h.orders.find((o) => o.id === where.id) ?? null;
  }
  return null;
}

/** Applies update `data` to an order row; returns undo journal entry. */
function applyUpdate(order: Record<string, any>, data: Record<string, unknown>): () => void {
  const prev = { ...order };
  const d = data as Record<string, unknown>;
  const inc = d.refundAmount as { increment?: number } | undefined;
  if (inc && typeof inc === "object" && typeof inc.increment === "number") {
    order.refundAmount = (order.refundAmount ?? 0) + inc.increment;
  } else if ("refundAmount" in d) {
    order.refundAmount = d.refundAmount as number;
  }
  for (const key of ["refundStatus", "refundId", "refundedAt", "providerMetadata"] as const) {
    if (key in d) order[key] = d[key];
  }
  return () => Object.assign(order, prev);
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productOrder: {
      findUnique: h.mockProductOrderFindUnique,
      findFirst: h.mockProductOrderFindFirst,
      update: h.mockProductOrderUpdate,
      updateMany: h.mockProductOrderUpdateMany,
    },
    paymentAccount: { findUnique: h.mockPaymentAccountFindUnique },
    billingEvent: {
      findUnique: h.mockBillingEventFindUnique,
      create: h.mockBillingEventCreate,
      upsert: h.mockBillingEventUpsert,
    },
    // DB-realistic interactive transaction: mutations are journaled and rolled
    // back when any statement inside fails (e.g. unique-constraint P2002).
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => h.mockTransaction(fn),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  h.orders.length = 0;
  h.billingEvents.length = 0;

  h.mockProductOrderFindUnique.mockImplementation(({ where }: { where: { id: string } }) =>
    Promise.resolve(findOrderByWhere(where)),
  );
  h.mockProductOrderFindFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
    Promise.resolve(findOrderByWhere(where)),
  );
  h.mockProductOrderUpdate.mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
    const order = findOrderByWhere(where);
    if (!order) return Promise.reject(new Error("Record not found"));
    applyUpdate(order, data);
    return Promise.resolve({ ...order });
  });
  h.mockProductOrderUpdateMany.mockImplementation(({ where, data }: { where: { id: string; refundAmount?: unknown }; data: Record<string, unknown> }) => {
    const order = findOrderByWhere(where);
    if (!order) return Promise.resolve({ count: 0 });
    // Predicate emulation (the route relies on it for ceiling safety).
    const cond = where.refundAmount as { lte?: number } | undefined;
    if (cond && typeof cond === "object" && cond !== null && typeof cond.lte === "number") {
      if ((order.refundAmount ?? 0) > cond.lte) return Promise.resolve({ count: 0 });
    }
    applyUpdate(order, data);
    return Promise.resolve({ count: 1 });
  });
  h.mockBillingEventFindUnique.mockImplementation(({ where }: { where: { idempotencyKey: string } }) =>
    Promise.resolve(h.billingEvents.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null),
  );
  // The real BillingEvent.idempotencyKey is @unique — emulate its atomicity.
  h.mockBillingEventCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
    if (h.billingEvents.some((e) => e.idempotencyKey === data.idempotencyKey)) {
      return Promise.reject(new Error("P2002: Unique constraint failed on billing_events.idempotency_key"));
    }
    const row = { id: `evt-${h.billingEvents.length + 1}`, ...data };
    h.billingEvents.push(row);
    return Promise.resolve(row);
  });
  h.mockBillingEventUpsert.mockImplementation(({ where, create }: { where: { idempotencyKey: string }; create: Record<string, unknown> }) => {
    const existing = h.billingEvents.find((e) => e.idempotencyKey === where.idempotencyKey);
    if (!existing) {
      const row = { id: `evt-${h.billingEvents.length + 1}`, ...create };
      h.billingEvents.push(row);
      return Promise.resolve(row);
    }
    return Promise.resolve(existing);
  });
  // Interactive tx with journaling rollback around the shared mocks. The tx
  // client exposes every statement the route's apply-cycle uses so the whole
  // money+event sequence can roll back atomically (unique-constraint loss).
  h.mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    const undo: Array<() => void> = [];
    const tx = {
      productOrder: {
        findUnique: ({ where }: { where: { id: string } }) =>
          Promise.resolve(findOrderByWhere(where)),
        update: ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const order = findOrderByWhere(where);
          if (!order) return Promise.reject(new Error("Record not found"));
          undo.push(applyUpdate(order, data));
          return Promise.resolve({ ...order });
        },
        updateMany: ({ where, data }: { where: { id: string; refundAmount?: unknown }; data: Record<string, unknown> }) => {
          const order = findOrderByWhere(where);
          if (!order) return Promise.resolve({ count: 0 });
          const cond = where.refundAmount as { lte?: number } | undefined;
          if (cond && typeof cond === "object" && cond !== null && typeof cond.lte === "number") {
            if ((order.refundAmount ?? 0) > cond.lte) return Promise.resolve({ count: 0 });
          }
          if ("refundAmount" in (where as Record<string, unknown>)) {
            const expected = (where as { refundAmount?: number }).refundAmount;
            if ((order.refundAmount ?? 0) !== expected) return Promise.resolve({ count: 0 });
          }
          undo.push(applyUpdate(order, data));
          return Promise.resolve({ count: 1 });
        },
      },
      billingEvent: {
        create: ({ data }: { data: Record<string, unknown> }) => {
          if (h.billingEvents.some((e) => e.idempotencyKey === data.idempotencyKey)) {
            return Promise.reject(new Error("P2002: Unique constraint failed on billing_events.idempotency_key"));
          }
          const row = { id: `evt-${h.billingEvents.length + 1}`, ...data };
          h.billingEvents.push(row);
          undo.push(() => {
            const i = h.billingEvents.indexOf(row);
            if (i >= 0) h.billingEvents.splice(i, 1);
          });
          return Promise.resolve(row);
        },
      },
      // RCCF-72.18D.6.5 POLICY 1: digital revocation joins the refund apply-cycle
      // tx; stubbed here (behavior asserted in the D.6.5 suite).
      orderFulfillment: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };
    try {
      return await fn(tx);
    } catch (err) {
      [...undo].reverse().forEach((u) => u());
      throw err;
    }
  });
  h.mockHandleRefund.mockResolvedValue({ handled: true });
  h.mockHandleSubscriptionWebhook.mockResolvedValue({ handled: true });
});

vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true }),
}));
vi.mock("@/lib/observability/error-tracker", () => ({
  captureError: h.mockCaptureError,
}));
vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: { findMembershipsByUserId: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/modules/billing/application/service", () => ({
  billingService: {
    handleRefund: h.mockHandleRefund,
    handleSubscriptionWebhook: h.mockHandleSubscriptionWebhook,
  },
}));

import { POST as webhookPOST } from "@/app/api/webhooks/razorpay/route";

beforeAll(() => {
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
});

// ── helpers ──────────────────────────────────────────────────────────────────

function pushOrder(overrides: Record<string, unknown> = {}) {
  const order = {
    id: ORDER_ID,
    tenantId: TENANT_A,
    productId: "product-d55",
    amount: 1000, // rupees → CAPTURED paise
    status: "COMPLETED",
    commerceStrategy: "DIRECT_CREATOR",
    paymentAccountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    razorpayOrderId: RZP_ORDER_ID,
    razorpayPaymentId: PAYMENT_ID,
    providerMetadata: null as Record<string, unknown> | null,
    refundAmount: 0,
    refundStatus: "NONE" as string,
    refundId: null,
    refundedAt: null,
    ...overrides,
  };
  h.orders.push(order);
  return order;
}

const orderRow = () => h.orders[0];

function assertLedgerInvariant() {
  for (const o of h.orders) {
    const original = Math.round((o.amount as number) * 100);
    expect(o.refundAmount).toBeGreaterThanOrEqual(0);
    expect(o.refundAmount).toBeLessThanOrEqual(original);
  }
}

function refundEventBody(event: string, refundId: string, amountPaise: number, paymentId = PAYMENT_ID): string {
  return JSON.stringify({
    event,
    payload: {
      refund: { entity: { id: refundId, payment_id: paymentId, amount: amountPaise } },
      payment: { entity: { id: paymentId } },
    },
  });
}

function signedRequest(body: string, opts: { headers?: Record<string, string>; secret?: string; omitSignature?: boolean } = {}): Request {
  const headers: Record<string, string> = { "content-type": "application/json", ...(opts.headers ?? {}) };
  if (!opts.omitSignature && !headers["x-razorpay-signature"]) {
    headers["x-razorpay-signature"] = crypto.createHmac("sha256", opts.secret ?? SECRET).update(body).digest("hex");
  }
  return new Request("http://localhost/api/webhooks/razorpay", { method: "POST", body, headers });
}

const signedRefund = (event: string, refundId: string, amountPaise: number) =>
  signedRequest(refundEventBody(event, refundId, amountPaise));

// ── A. Signature security ────────────────────────────────────────────────────

describe("RCCF-72.18D.5.5 — webhook signature verification (real HMAC contract)", () => {
  it("accepts a correctly-signed refund.processed delivery and reconciles it", async () => {
    pushOrder({ refundStatus: "PENDING" });

    const res = await webhookPOST(signedRefund("refund.processed", "sig_ok", 30000));

    expect(res.status).toBe(200);
    expect(orderRow().refundAmount).toBe(30000);
    expect(orderRow().refundStatus).toBe("PARTIAL");
    assertLedgerInvariant();
  });

  it("rejects an invalid signature (401) without any mutation", async () => {
    pushOrder({ refundStatus: "PENDING" });
    const body = refundEventBody("refund.processed", "sig_bad", 30000);

    const res = await webhookPOST(signedRequest(body, { headers: { "x-razorpay-signature": "deadbeef".repeat(8) } }));

    expect(res.status).toBe(401);
    expect(orderRow().refundAmount).toBe(0);
    expect(h.billingEvents).toHaveLength(0);
  });

  it("rejects a missing signature header (401)", async () => {
    pushOrder({});
    const body = refundEventBody("refund.processed", "sig_missing", 30000);

    const res = await webhookPOST(signedRequest(body, { omitSignature: true }));

    expect(res.status).toBe(401);
    expect(orderRow().refundAmount).toBe(0);
  });

  it("rejects a payload signed with the WRONG webhook secret (401)", async () => {
    pushOrder({});

    const res = await webhookPOST(signedRequest(refundEventBody("refund.processed", "sig_wrong", 30000), { secret: "whsec_attacker" }));

    expect(res.status).toBe(401);
    expect(h.billingEvents).toHaveLength(0);
  });

  it("rejects a payload MODIFIED AFTER signing (401)", async () => {
    pushOrder({});
    const legit = refundEventBody("refund.processed", "sig_tamper", 100); // attacker inflates:
    const tampered = legit.replace('"amount":100', '"amount":100000');
    const signature = crypto.createHmac("sha256", SECRET).update(legit).digest("hex");

    const res = await webhookPOST(
      new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        body: tampered,
        headers: { "content-type": "application/json", "x-razorpay-signature": signature },
      }),
    );

    expect(res.status).toBe(401);
    expect(orderRow().refundAmount).toBe(0);
  });

  it("rejects a malformed length-mismatched signature as 401 (not a crash)", async () => {
    pushOrder({});
    const res = await webhookPOST(signedRequest(refundEventBody("refund.processed", "sig_short", 1), { headers: { "x-razorpay-signature": "abc" } }));
    expect(res.status).toBe(401);
  });

  it("answers 400 (not a crash) for a VALID signature over non-JSON bytes", async () => {
    const res = await webhookPOST(signedRequest("{{{not json at all"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid payload" });
  });

  it("answers 500 when the webhook secret is not configured", async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    try {
      const res = await webhookPOST(signedRefund("refund.processed", "sig_nosecret", 1));
      expect(res.status).toBe(500);
    } finally {
      process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
    }
  });
});

// ── B. Refund reconciliation ─────────────────────────────────────────────────

describe("RCCF-72.18D.5.5 — refund reconciliation via signed webhooks", () => {
  it("sequential partial refunds accumulate exactly (two independent provider refund ids)", async () => {
    pushOrder({ refundStatus: "PENDING" });

    await webhookPOST(signedRefund("refund.processed", "wh_r1", 30000));
    expect(orderRow().refundAmount).toBe(30000);

    await webhookPOST(signedRefund("refund.processed", "wh_r2", 20000));

    expect(orderRow().refundAmount).toBe(50000);
    expect(orderRow().refundStatus).toBe("PARTIAL");
    const keys = h.billingEvents.filter((e) => e.type === "REFUND_WEBHOOK_RECONCILED").map((e) => e.idempotencyKey);
    expect(keys).toEqual(["product_refund_webhook_wh_r1", "product_refund_webhook_wh_r2"]);
    assertLedgerInvariant();
  });

  it("full refund after partial lands REFUNDED at EXACTLY the captured amount", async () => {
    pushOrder({ refundStatus: "PARTIAL", refundAmount: 30000, refundId: "wh_p1" });

    await webhookPOST(signedRefund("refund.processed", "wh_rest", 70000));

    expect(orderRow().refundAmount).toBe(CAPTURED);
    expect(orderRow().refundStatus).toBe("REFUNDED");
    assertLedgerInvariant();
  });

  it("a single processed event reporting more than remaining clamps at the ceiling", async () => {
    pushOrder({ refundStatus: "PARTIAL", refundAmount: 80000, refundId: "wh_big1" });

    await webhookPOST(signedRefund("refund.processed", "wh_clamp55", 50000));

    expect(orderRow().refundAmount).toBe(CAPTURED); // min applied, never exceeded
    expect(orderRow().refundStatus).toBe("REFUNDED");
    assertLedgerInvariant();
  });

  it("an unknown ProductOrder is handled safely with zero mutations", async () => {
    const res = await webhookPOST(signedRefund("refund.processed", "wh_unknown", 40000));

    expect(res.status).toBe(200);
    expect(h.orders).toHaveLength(0);
    expect(h.billingEvents.filter((e) => String(e.idempotencyKey).startsWith("product_refund_webhook_"))).toHaveLength(0);
    expect(h.mockProductOrderUpdateMany).not.toHaveBeenCalled();
  });

  it("a refund entity missing identity fields is skipped safely", async () => {
    pushOrder({});
    const body = JSON.stringify({ event: "refund.processed", payload: { refund: { entity: { amount: 40000 } } } });

    const res = await webhookPOST(signedRequest(body));

    expect(res.status).toBe(200);
    expect(orderRow().refundAmount).toBe(0);
    expect(h.billingEvents).toHaveLength(0);
  });

  it("PLATFORM_COLLECT orders are never product-reconciled (commission path only)", async () => {
    pushOrder({ commerceStrategy: "PLATFORM_COLLECT", refundStatus: "PENDING" });

    await webhookPOST(signedRefund("refund.processed", "wh_pc55", 40000));

    expect(h.mockHandleRefund).toHaveBeenCalled(); // partner-commission reversal intact
    expect(orderRow().refundAmount).toBe(0);
    expect(orderRow().refundStatus).toBe("PENDING");
    expect(h.billingEvents.filter((e) => e.type === "REFUND_WEBHOOK_RECONCILED")).toHaveLength(0);
  });
});

// ── C. Concurrency / idempotency ─────────────────────────────────────────────

describe("RCCF-72.18D.5.5 — concurrent deliveries and idempotent application", () => {
  it("two IDENTICAL refund.processed deliveries racing on stale reads apply EXACTLY once", async () => {
    pushOrder({ refundStatus: "PENDING" });
    // Simulate both deliveries passing the fast-path gate before either writes:
    h.mockBillingEventFindUnique.mockResolvedValue(null);

    const [r1, r2] = await Promise.all([
      webhookPOST(signedRefund("refund.processed", "wh_race", 40000)),
      webhookPOST(signedRefund("refund.processed", "wh_race", 40000)),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(orderRow().refundAmount).toBe(40000); // NOT 80000
    expect(orderRow().refundStatus).toBe("PARTIAL");
    expect(h.billingEvents.filter((e) => e.idempotencyKey === "product_refund_webhook_wh_race").length).toBe(1);
    assertLedgerInvariant();
  });

  it("two DIFFERENT legitimate refunds racing sum atomically within the ceiling", async () => {
    pushOrder({ refundStatus: "PENDING" });
    h.mockBillingEventFindUnique.mockResolvedValue(null);

    const [rA, rB] = await Promise.all([
      webhookPOST(signedRefund("refund.processed", "wh_A", 30000)),
      webhookPOST(signedRefund("refund.processed", "wh_B", 20000)),
    ]);

    expect(rA.status).toBe(200);
    expect(rB.status).toBe(200);
    expect(orderRow().refundAmount).toBe(50000); // 30000 + 20000, no lost update
    expect(orderRow().refundStatus).toBe("PARTIAL");
    assertLedgerInvariant();
  });

  it("processed-then-failed for the SAME refund id is deterministic (first wins)", async () => {
    pushOrder({ refundStatus: "PENDING" });

    await webhookPOST(signedRefund("refund.processed", "wh_det", 40000));
    await webhookPOST(signedRefund("refund.failed", "wh_det", 40000)); // duplicate outcome flip attempt

    expect(orderRow().refundStatus).toBe("PARTIAL"); // settled state not downgraded
    expect(orderRow().refundAmount).toBe(40000);
    expect(h.billingEvents.filter((e) => e.idempotencyKey === "product_refund_webhook_wh_det").length).toBe(1);
    assertLedgerInvariant();
  });

  it("failed-then-processed for the SAME refund id is deterministic (failure owns the key)", async () => {
    pushOrder({ refundStatus: "PENDING" });

    await webhookPOST(signedRefund("refund.failed", "wh_det2", 40000));
    await webhookPOST(signedRefund("refund.processed", "wh_det2", 40000)); // late contradiction

    // Deterministic: the failure recorded first owns this provider refund id;
    // money that was never confirmed by a distinct refund id cannot appear.
    expect(orderRow().refundStatus).toBe("FAILED");
    expect(orderRow().refundAmount).toBe(0);
    expect(h.billingEvents.filter((e) => e.idempotencyKey.startsWith("product_refund_webhook_wh_det2")).length).toBe(1);
    assertLedgerInvariant();
  });

  it("a sequential processed event reporting more than remaining clamps at application time", async () => {
    pushOrder({ refundStatus: "PARTIAL", refundAmount: 90000, refundId: "wh_near" });

    // Reports far beyond remaining headroom (₹100): applies ONLY the remaining
    // ₹100 so cumulative refunds land at EXACTLY the captured amount.
    await webhookPOST(signedRefund("refund.processed", "wh_over", 50000));

    expect(orderRow().refundAmount).toBe(CAPTURED);
    expect(orderRow().refundStatus).toBe("REFUNDED");
    const evt = h.billingEvents.find((e) => e.type === "REFUND_WEBHOOK_RECONCILED");
    expect(evt?.payload.amountPaise).toBe(10000);
    assertLedgerInvariant();
  });
});

// ── D. X-Razorpay-Failure-Reason hardening ───────────────────────────────────

describe("RCCF-72.18D.5.5 — X-Razorpay-Failure-Reason recording", () => {
  function paymentFailedBody(paymentId = PAYMENT_ID, rzpOrderId = RZP_ORDER_ID): string {
    return JSON.stringify({
      event: "payment.failed",
      payload: { payment: { entity: { id: paymentId, order_id: rzpOrderId } } },
    });
  }

  async function deliverFailure(reasonHeader?: string) {
    const headers = reasonHeader === undefined ? {} : { "x-razorpay-failure-reason": reasonHeader };
    return webhookPOST(signedRequest(paymentFailedBody(), { headers }));
  }

  it("persists a present failure reason sanitized into providerMetadata + audit event", async () => {
    pushOrder({ status: "PENDING", razorpayPaymentId: null, refundAmount: 0 });

    const res = await deliverFailure("card_declined");

    expect(res.status).toBe(200);
    expect(orderRow().providerMetadata.lastPaymentFailureReason).toBe("card_declined");
    expect(typeof orderRow().providerMetadata.lastPaymentFailedAt).toBe("string");
    const evt = h.billingEvents.find((e) => e.type === "PAYMENT_FAILED_PRODUCT");
    expect(evt?.payload.failureReason).toBe("card_declined");
    expect(evt?.idempotencyKey).toBe(`razorpay_payment_failed_product_${PAYMENT_ID}`);
    // Order financial state untouched by diagnostics.
    expect(orderRow().status).toBe("PENDING");
  });

  it("records 'unspecified' when the header is absent", async () => {
    pushOrder({ status: "PENDING", razorpayPaymentId: null });

    await deliverFailure();

    expect(orderRow().providerMetadata.lastPaymentFailureReason).toBe("unspecified");
  });

  it("collapses whitespace (HTAB is the only control char HTTP headers permit)", async () => {
    pushOrder({ status: "PENDING", razorpayPaymentId: null });

    await deliverFailure("gateway_error\t timeout\t cause");

    expect(orderRow().providerMetadata.lastPaymentFailureReason).toBe("gateway_error timeout cause");
  });

  it("caps an extremely long reason at 256 characters", async () => {
    pushOrder({ status: "PENDING", razorpayPaymentId: null });

    await deliverFailure("x".repeat(5000));

    const stored = orderRow().providerMetadata.lastPaymentFailureReason as string;
    expect(stored.length).toBe(256);
  });

  it("stores hostile/script-like text inertly and NEVER returns it to the caller", async () => {
    pushOrder({ status: "PENDING", razorpayPaymentId: null });
    const hostile = "<script>alert('pwn')</script>";

    const res = await deliverFailure(hostile);

    expect(res.status).toBe(200);
    // Stored verbatim-as-data (sanitized of control chars only)…
    expect(orderRow().providerMetadata.lastPaymentFailureReason).toBe(hostile);
    // …and the HTTP response carries nothing of it.
    expect(JSON.stringify(await res.json())).not.toContain("script");
    // No audit/error channel echoed it back as an exception string either.
    expect(h.mockCaptureError).not.toHaveBeenCalled();
  });

  it("never mutates COMPLETED/settled orders from failure diagnostics", async () => {
    pushOrder({ status: "COMPLETED" }); // settled order sharing the payment id
    const beforeProviderMetadata = orderRow().providerMetadata;

    await deliverFailure("card_declined");

    expect(orderRow().providerMetadata).toBe(beforeProviderMetadata);
    expect(h.billingEvents.filter((e) => e.type === "PAYMENT_FAILED_PRODUCT")).toHaveLength(0);
  });

  it("deduplicates repeated failure deliveries for the same payment", async () => {
    pushOrder({ status: "PENDING", razorpayPaymentId: null });

    await deliverFailure("card_declined");
    await deliverFailure("card_declined");

    expect(h.billingEvents.filter((e) => e.type === "PAYMENT_FAILED_PRODUCT").length).toBe(1);
  });

  it("leaves the subscription payment.failed path fully functional", async () => {
    const body = JSON.stringify({
      event: "payment.failed",
      payload: { payment: { entity: { id: "pay_sub_1" }, subscription: { entity: { id: "sub_1" } } } },
    });
    // Subscription events carry workspace notes through entityNotes():
    const notesBody = JSON.parse(body);
    notesBody.payload.payment.entity.notes = { workspaceId: "ws-1", planCode: "PRO" };

    const res = await webhookPOST(signedRequest(JSON.stringify(notesBody)));

    expect(res.status).toBe(200);
    expect(h.mockHandleSubscriptionWebhook).toHaveBeenCalledWith(expect.objectContaining({ eventName: "payment.failed", workspaceId: "ws-1" }));
  });

  it("keeps database-looking hostile text server-side only (never in responses)", async () => {
    pushOrder({ status: "PENDING", razorpayPaymentId: null });

    const res = await deliverFailure("P2002: Unique constraint failed on User.email table stack=0x7f");
    const responseBody = JSON.stringify(await res.json());

    expect(res.status).toBe(200);
    expect(responseBody).not.toContain("P2002");
    expect(responseBody).not.toContain("constraint");
    // Durable diagnostics retain the detail for operators only.
    expect(orderRow().providerMetadata.lastPaymentFailureReason).toContain("P2002");
  });
});
