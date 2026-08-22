import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import crypto from "node:crypto";

// ─────────────────────────────────────────────────────────────────────────────
// RCCF-72.18D.6.1 — DIRECT_CREATOR Payment Link reconciliation & signed E2E.
//
// Route-level tests against the REAL POST handler with REAL HMAC-SHA256
// signature verification (never bypassed). Mocked boundaries: prisma (stateful,
// DB-realistic unique constraints) and the canonical completion boundary
// (completeProductOrder — emulated with its exact published contract:
//   not_found / COMPLETED→already_completed no-op / non-PENDING refusal /
//   PENDING→COMPLETED + razorpayPaymentId write + one fulfillment per order).
// Everything else — signature gate, event routing, identity resolution,
// strategy/amount/state gates, idempotency keys — is the real implementation.
//
// Matrix:
//   A. Identity      — plink id / reconciliationRef / legacy plink-only /
//                      unknown / wrong link / conflicting identities.
//   B. Completion    — exact amount; under/over/malformed amounts refused;
//                      already-completed idempotent.
//   C. Strategy      — DIRECT_CREATOR only; PLATFORM_COLLECT legacy path
//                      untouched end-to-end.
//   D. Tenant        — identity-derived tenant; forged wire notes ignored;
//                      cross-tenant never completes.
//   E. Account       — historical binding untouched; NO credential decryption,
//                      NO paymentAccount lookups during reconciliation.
//   F. Signature     — valid / missing / invalid / wrong-secret / tampered /
//                      short / valid-sig-non-JSON / unconfigured secret.
//   G. Idempotency   — sequential duplicate, CONCURRENT duplicate, independent
//                      payments stay separate.
//   H. Ordering      — delayed capture; failed-then-captured; capture-then-
//                      duplicate.
//   I. Failure safety— malformed entities, provider errors → safe no-mutation.
// ─────────────────────────────────────────────────────────────────────────────

const SECRET = "whsec_rccf72_18d61";
const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

type BillingRow = { idempotencyKey: string } & Record<string, unknown>;

const h = vi.hoisted(() => {
  return {
    orders: [] as Array<Record<string, unknown>>,
    billingEvents: [] as Array<BillingRow>,
    /** orderId set — emulates ensureFulfillment's @unique orderId exactly-once. */
    fulfillments: new Set<string>(),
    mockProductOrderFindUnique: vi.fn(),
    mockProductOrderFindFirst: vi.fn(),
    mockProductOrderUpdate: vi.fn(),
    mockProductOrderCreate: vi.fn(),
    mockPaymentAccountFindUnique: vi.fn(),
    mockBillingEventFindUnique: vi.fn(),
    mockBillingEventCreate: vi.fn(),
    mockCompleteProductOrder: vi.fn(),
    mockCaptureError: vi.fn(),
    mockHandleSubscriptionWebhook: vi.fn(),
    mockHandleRefund: vi.fn(),
    // checkout-side spies
    mockAdapterCreateCheckout: vi.fn(),
    mockResolveCheckoutTenantId: vi.fn(),
    mockResolveCommerceStrategy: vi.fn(),
    mockComputePaymentReadiness: vi.fn(),
    mockGetPaymentProviderAdapter: vi.fn(),
  };
});

vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: null }) }));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));

function findOrderByWhere(where: Record<string, unknown>) {
  if (typeof where.id === "string") {
    return h.orders.find((o) => o.id === where.id) ?? null;
  }
  if (typeof where.razorpayPaymentId === "string") {
    return h.orders.find((o) => o.razorpayPaymentId === where.razorpayPaymentId) ?? null;
  }
  if (typeof where.razorpayOrderId === "string") {
    return h.orders.find((o) => o.razorpayOrderId === where.razorpayOrderId) ?? null;
  }
  return null;
}

/**
 * Faithful emulation of the two findFirst shapes the reconciliation resolver
 * issues — including the STRICT commerceStrategy filter, so a PLATFORM_COLLECT
 * row can never be matched by creator-link identity.
 */
function findFirstByWhere(where: Record<string, unknown>) {
  const cs = where.commerceStrategy as string | undefined;
  const pr = typeof where.providerReference === "string" ? where.providerReference : null;
  const pm = where.providerMetadata as { path?: string[]; equals?: string } | undefined;
  return (
    h.orders.find((o) => {
      if (cs !== undefined && o.commerceStrategy !== cs) return false;
      if (pr !== null && o.providerReference !== pr) return false;
      if (pm?.equals !== undefined) {
        const meta = (o.providerMetadata ?? {}) as Record<string, unknown>;
        if (meta[pm.path?.[0] ?? ""] !== pm.equals) return false;
      }
      return true;
    }) ?? null
  );
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productOrder: {
      findUnique: h.mockProductOrderFindUnique,
      findFirst: h.mockProductOrderFindFirst,
      update: h.mockProductOrderUpdate,
      create: h.mockProductOrderCreate,
    },
    paymentAccount: { findUnique: h.mockPaymentAccountFindUnique },
    billingEvent: {
      findUnique: h.mockBillingEventFindUnique,
      create: h.mockBillingEventCreate,
    },
    product: {
      findFirst: vi.fn().mockResolvedValue({
        id: "product-xyz",
        tenantId: "11111111-1111-4111-8111-111111111111",
        price: 1000,
        name: "Test Product",
        isActive: true,
        status: "PUBLISHED",
        archivedAt: null,
      }),
    },
  },
}));

/**
 * Canonical boundary emulation — exact contract of completeProductOrder
 * (RCCF-38): only PENDING completes; COMPLETED is an idempotent success
 * no-op; every other state refuses with reason; completion writes
 * razorpayPaymentId and triggers fulfillment exactly once per order.
 */
vi.mock("@/modules/billing/application/order-completion", () => ({
  ORDERS_FEATURE_KEY: "orders",
  getCurrentOrderUsage: vi.fn().mockResolvedValue({ used: 0, limit: -1 }),
  completeProductOrder: h.mockCompleteProductOrder,
}));

beforeEach(() => {
  vi.clearAllMocks();
  h.orders.length = 0;
  h.billingEvents.length = 0;
  h.fulfillments.clear();

  h.mockProductOrderFindUnique.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
    Promise.resolve(findOrderByWhere(where)),
  );
  h.mockProductOrderFindFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
    Promise.resolve(findFirstByWhere(where)),
  );
  h.mockProductOrderUpdate.mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
    const order = findOrderByWhere(where);
    if (!order) return Promise.reject(new Error("Record not found"));
    Object.assign(order, data);
    return Promise.resolve({ ...order });
  });
  h.mockPaymentAccountFindUnique.mockResolvedValue(null);

  h.mockBillingEventFindUnique.mockImplementation(({ where }: { where: { idempotencyKey: string } }) =>
    Promise.resolve(h.billingEvents.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null),
  );
  // Real BillingEvent.idempotencyKey is @unique — emulate its atomicity.
  h.mockBillingEventCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
    if (h.billingEvents.some((e) => e.idempotencyKey === data.idempotencyKey)) {
      return Promise.reject(new Error("P2002: Unique constraint failed on billing_events.idempotency_key"));
    }
    const row = { id: `evt-${h.billingEvents.length + 1}`, ...data } as BillingRow;
    h.billingEvents.push(row);
    return Promise.resolve(row);
  });

  h.mockCompleteProductOrder.mockImplementation(async (orderId: string, ctx?: { paymentId?: string }) => {
    const order = findOrderByWhere({ id: orderId });
    if (!order) return { success: false, error: "Order not found", reason: "not_found" };
    if (order.status === "COMPLETED") return { success: true, reason: "already_completed" };
    if (order.status !== "PENDING") return { success: false, error: "Order is not pending", reason: "not_pending" };
    order.status = "COMPLETED";
    if (ctx?.paymentId) order.razorpayPaymentId = ctx.paymentId;
    h.fulfillments.add(orderId); // ensureFulfillment(orderId @unique)
    return { success: true };
  });

  h.mockHandleSubscriptionWebhook.mockResolvedValue({ handled: true });
  h.mockHandleRefund.mockResolvedValue({ handled: true });
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
    handleSubscriptionWebhook: h.mockHandleSubscriptionWebhook,
    handleRefund: h.mockHandleRefund,
  },
}));

// ── checkout-side module mocks (createDirectCheckout persistence) ───────────
vi.mock("@/actions/checkout.actions", () => ({
  resolveCheckoutTenantId: h.mockResolveCheckoutTenantId,
}));
vi.mock("@/modules/commerce-strategy", () => ({
  resolveCommerceStrategy: h.mockResolveCommerceStrategy,
}));
vi.mock("@/modules/payment-account", () => ({
  getPaymentAccount: vi.fn(),
  savePaymentAccount: vi.fn(),
  verifyPaymentAccount: vi.fn(),
  disconnectPaymentAccount: vi.fn(),
  getPaymentHealth: vi.fn(),
  computePaymentReadiness: h.mockComputePaymentReadiness,
  getPaymentProviderAdapter: h.mockGetPaymentProviderAdapter,
}));
vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((val: unknown) => val),
  encrypt: vi.fn((val: unknown) => val),
}));

import { POST as webhookPOST } from "@/app/api/webhooks/razorpay/route";
import { createDirectCheckout } from "@/actions/payment-account.actions";

beforeAll(() => {
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
});

// ── helpers ──────────────────────────────────────────────────────────────────

let orderSeq = 0;

interface DirectCreatorOrderOverrides {
  id?: string;
  tenantId?: string;
  amount?: number;
  status?: string;
  commerceStrategy?: string | null;
  providerReference?: string | null;
  razorpayOrderId?: string;
  razorpayPaymentId?: string | null;
  providerMetadata?: Record<string, unknown> | null;
  paymentAccountId?: string | null;
}

function pushDirectCreatorOrder(overrides: DirectCreatorOrderOverrides = {}) {
  const seq = ++orderSeq;
  const order = {
    id: overrides.id ?? `dc-order-${seq}`,
    tenantId: TENANT_A,
    productId: `product-${seq}`,
    amount: 1000, // rupees → 100000 paise captured
    status: "PENDING",
    commerceStrategy: "DIRECT_CREATOR",
    razorpayOrderId: `plink_d61_${seq}`,
    razorpayPaymentId: null,
    fanEmail: "buyer@example.com",
    provider: "razorpay",
    providerReference: `plink_d61_${seq}`,
    providerMetadata: { checkoutUrl: `https://rzp.io/i/d61_${seq}`, reconciliationRef: `reconcile-d61-${seq}` },
    paymentAccountId: `aaaaaaaa-0000-4000-8000-00000000000${seq}`,
    refundAmount: 0,
    refundStatus: "NONE",
    ...overrides,
  };
  h.orders.push(order);
  return order;
}

/** Reads the persisted reconciliation token from a mock order row. */
const tokenOf = (o: Record<string, unknown>): string =>
  ((o.providerMetadata as Record<string, unknown> | null | undefined)?.reconciliationRef as string) ?? "";

/** Razorpay-shaped payment.captured for a Payment Link payment. */
function plinkCapturedBody(opts: {
  paymentId?: string;
  amountPaise?: number;
  notes?: Record<string, string>;
  linkEntityId?: string;
  paymentLinkField?: string;
  wireOrderId?: string;
}): string {
  const paymentId = opts.paymentId ?? "pay_d61_001";
  // An explicitly-absent amountPaise must produce a genuinely missing amount
  // field on the wire (malformed-entity coverage), not silently default.
  const hasAmount = Object.prototype.hasOwnProperty.call(opts, "amountPaise");
  const entity: Record<string, unknown> = {
    id: paymentId,
    ...(hasAmount ? { amount: opts.amountPaise } : { amount: 100000 }),
    currency: "INR",
    status: "captured",
    order_id: opts.wireOrderId ?? "order_rzp_internal_not_stored",
    ...(opts.notes ? { notes: opts.notes } : {}),
    ...(opts.paymentLinkField ? { payment_link: opts.paymentLinkField } : {}),
  };
  return JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: { entity },
      ...(opts.linkEntityId ? { payment_link: { entity: { id: opts.linkEntityId, status: "paid" } } } : {}),
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

const postPlinkCaptured = (opts: Parameters<typeof plinkCapturedBody>[0], reqOpts?: Parameters<typeof signedRequest>[1]) =>
  webhookPOST(signedRequest(plinkCapturedBody(opts), reqOpts));

const completedCount = () => h.orders.filter((o) => o.status === "COMPLETED").length;

// ── A. Identity resolution ───────────────────────────────────────────────────

describe("RCCF-72.18D.6.1 — Payment Link → ProductOrder identity resolution", () => {
  it("completes the EXACT order via payload.payment_link.entity.id matched to persisted providerReference", async () => {
    const orderA = pushDirectCreatorOrder();
    pushDirectCreatorOrder(); // decoy order B

    const res = await postPlinkCaptured({ linkEntityId: orderA.providerReference, paymentId: "pay_id_A" });

    expect(res.status).toBe(200);
    expect(orderA.status).toBe("COMPLETED");
    expect(completedCount()).toBe(1);
  });

  it("completes via notes.reconciliationRef when no plink entity is present in the payload", async () => {
    const order = pushDirectCreatorOrder();

    const res = await postPlinkCaptured({
      paymentId: "pay_token_only",
      notes: { referenceId: order.productId, creatorStore: "true", reconciliationRef: tokenOf(order) },
    });

    expect(res.status).toBe(200);
    expect(order.status).toBe("COMPLETED");
  });

  it("supports LEGACY orders (pre-reconciliationRef metadata) through the plink-id path", async () => {
    const legacy = pushDirectCreatorOrder({ providerMetadata: { checkoutUrl: "https://rzp.io/i/legacy" } });

    const res = await postPlinkCaptured({ linkEntityId: legacy.providerReference, paymentId: "pay_legacy" });

    expect(res.status).toBe(200);
    expect(legacy.status).toBe("COMPLETED");
  });

  it("accepts the payment.entity.payment_link field as an equivalent plink identity", async () => {
    const order = pushDirectCreatorOrder();

    const res = await postPlinkCaptured({ paymentLinkField: order.providerReference, paymentId: "pay_field" });

    expect(res.status).toBe(200);
    expect(order.status).toBe("COMPLETED");
  });

  it("UNKNOWN provider identity → 200 ok with ZERO mutation", async () => {
    const order = pushDirectCreatorOrder();

    const res = await postPlinkCaptured({ linkEntityId: "plink_totally_unknown", paymentId: "pay_unknown" });

    expect(res.status).toBe(200);
    expect(order.status).toBe("PENDING");
    expect(h.billingEvents).toHaveLength(0);
  });

  it("WRONG Payment Link (B's payment against A's order) must NOT complete A", async () => {
    const orderA = pushDirectCreatorOrder();
    const orderB = pushDirectCreatorOrder();

    const res = await postPlinkCaptured({ linkEntityId: orderB.providerReference, paymentId: "pay_of_B", notes: { reconciliationRef: tokenOf(orderB) } });

    expect(res.status).toBe(200);
    expect(orderA.status).toBe("PENDING"); // untouched
    expect(orderB.status).toBe("COMPLETED"); // correct target completed
    expect(completedCount()).toBe(1);
  });

  it("CONFLICTING identities (plink resolves X, token resolves Y) are refused — nothing mutated", async () => {
    const orderX = pushDirectCreatorOrder();
    const orderY = pushDirectCreatorOrder();

    const res = await postPlinkCaptured({
      linkEntityId: orderX.providerReference,
      paymentId: "pay_conflict",
      notes: { reconciliationRef: tokenOf(orderY) },
    });

    expect(res.status).toBe(200);
    expect(orderX.status).toBe("PENDING");
    expect(orderY.status).toBe("PENDING");
    expect(h.billingEvents).toHaveLength(0);
    expect(h.fulfillments.size).toBe(0);
  });
});

// ── B. Completion gates ──────────────────────────────────────────────────────

describe("RCCF-72.18D.6.1 — amount authority & state safety", () => {
  it.each([
    ["underpayment rejected", 99999],
    ["overpayment rejected", 100001],
    ["malformed (zero) amount rejected", undefined],
  ])("%s — no mutation", async (_label, amountPaise) => {
    const order = pushDirectCreatorOrder();

    const res = await postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: `pay_${amountPaise ?? 0}`, amountPaise });

    expect(res.status).toBe(200);
    expect(order.status).toBe("PENDING");
    expect(order.razorpayPaymentId).toBeNull();
    expect(h.fulfillments.size).toBe(0);
    expect(h.mockCaptureError).toHaveBeenCalled();
  });

  it("an already-COMPLETED order redelivered is an idempotent success no-op", async () => {
    const order = pushDirectCreatorOrder({ status: "COMPLETED", razorpayPaymentId: "pay_original" });
    h.billingEvents.push({ id: "evt-orig", idempotencyKey: "razorpay_payment_captured_product_pay_original" });

    const res = await postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_original" });

    expect(res.status).toBe(200);
    expect(order.razorpayPaymentId).toBe("pay_original");
    expect(h.billingEvents.filter((e) => e.idempotencyKey === "razorpay_payment_captured_product_pay_original")).toHaveLength(1);
    expect(completedCount()).toBe(1);
  });

  it("a FAILED order is never resurrected to COMPLETED by a capture delivery", async () => {
    const order = pushDirectCreatorOrder({ status: "FAILED" });

    await postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_failed_order" });

    expect(order.status).toBe("FAILED");
    expect(h.fulfillments.size).toBe(0);
  });
});

// ── C. Strategy isolation ────────────────────────────────────────────────────

describe("RCCF-72.18D.6.1 — strategy isolation", () => {
  it("PLATFORM_COLLECT product orders still complete through the LEGACY notes path (untouched)", async () => {
    const pcOrder = pushDirectCreatorOrder({
      commerceStrategy: "PLATFORM_COLLECT",
      providerReference: null,
      razorpayOrderId: "order_rzp_pc_001",
      providerMetadata: null,
      paymentAccountId: null,
      productId: "product-pc",
      id: "pc-order-1",
    });

    const body = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_pc_001",
            amount: 100000,
            status: "captured",
            order_id: "order_rzp_pc_001",
            notes: { productId: "product-pc", orderId: "pc-order-1", tenantId: TENANT_A },
          },
        },
      },
    });
    const res = await webhookPOST(signedRequest(body));

    expect(res.status).toBe(200);
    void pcOrder;
    expect(findOrderByWhere({ id: "pc-order-1" })!.status).toBe("COMPLETED");
    // The creator-reconciliation branch must NOT have run for this delivery.
    expect(h.mockCaptureError).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ operation: "amountGate" }));
  });

  it("creator reconciliation NEVER matches a PLATFORM_COLLECT row even with an identical providerReference value", async () => {
    pushDirectCreatorOrder({
      commerceStrategy: "PLATFORM_COLLECT",
      providerReference: "plink_d61_9",
      razorpayOrderId: "order_rzp_pc_sneaky",
      status: "PENDING",
      id: "sneaky-pc",
    });

    const res = await postPlinkCaptured({ linkEntityId: "plink_d61_9", paymentId: "pay_sneaky" });

    expect(res.status).toBe(200);
    expect(findOrderByWhere({ id: "sneaky-pc" })!.status).toBe("PENDING");
    expect(h.billingEvents).toHaveLength(0);
  });
});

// ── D. Tenant safety ────────────────────────────────────────────────────────

describe("RCCF-72.18D.6.1 — cross-tenant safety", () => {
  it("tenant authority comes from the resolved server row, never from wire notes", async () => {
    const orderA = pushDirectCreatorOrder({ tenantId: TENANT_A });

    const res = await postPlinkCaptured({
      linkEntityId: orderA.providerReference,
      paymentId: "pay_forged_tenant",
      notes: { reconciliationRef: tokenOf(orderA), tenantId: TENANT_B },
    });

    expect(res.status).toBe(200);
    expect(orderA.status).toBe("COMPLETED");
    const evt = h.billingEvents[0];
    expect(evt.accountId).toBe(TENANT_A); // server row tenant, not the forged one
  });

  it("a foreign creator's payment can never cross-complete another creator's order", async () => {
    const orderA = pushDirectCreatorOrder({ tenantId: TENANT_A }); // plink_d61_1
    const orderB = pushDirectCreatorOrder({ tenantId: TENANT_B }); // plink_d61_2

    await postPlinkCaptured({ linkEntityId: orderA.providerReference, paymentId: "pay_cross" });

    expect(orderA.status).toBe("COMPLETED");
    expect(orderB.status).toBe("PENDING");
    expect(completedCount()).toBe(1);
  });
});

// ── E. Historical PaymentAccount discipline ─────────────────────────────────

describe("RCCF-72.18D.6.1 — historical PaymentAccount discipline", () => {
  it("webhook-only reconciliation performs NO paymentAccount lookup and decrypts NO credentials", async () => {
    const order = pushDirectCreatorOrder();

    await postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_no_creds" });

    expect(order.status).toBe("COMPLETED");
    expect(h.mockPaymentAccountFindUnique).not.toHaveBeenCalled();
  });
});

// ── F. Signature security (real HMAC contract) ──────────────────────────────

describe("RCCF-72.18D.6.1 — webhook signature verification", () => {
  it.each([
    ["missing signature header", { omitSignature: true }, 401],
    ["invalid signature", { headers: { "x-razorpay-signature": "deadbeef".repeat(8) } }, 401],
    ["wrong signing secret", { secret: "whsec_attacker" }, 401],
    ["malformed length-mismatched signature", { headers: { "x-razorpay-signature": "abc" } }, 401],
  ] as Array<[string, Parameters<typeof signedRequest>[1], number]>)("%s → 401, zero mutation", async (_label, reqOpts, expectedStatus) => {
    const order = pushDirectCreatorOrder();
    const body = plinkCapturedBody({ linkEntityId: order.providerReference, paymentId: "pay_badsig" });

    const res = await webhookPOST(signedRequest(body, reqOpts));

    expect(res.status).toBe(expectedStatus);
    expect(order.status).toBe("PENDING");
    expect(h.billingEvents).toHaveLength(0);
  });

  it("a body TAMPERED after signing → 401, zero mutation", async () => {
    const order = pushDirectCreatorOrder();
    const legit = plinkCapturedBody({ linkEntityId: order.providerReference, paymentId: "pay_tamper", amountPaise: 1 });
    const tampered = legit.replace('"amount":1', '"amount":100000');
    const signature = crypto.createHmac("sha256", SECRET).update(legit).digest("hex");

    const res = await webhookPOST(
      new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        body: tampered,
        headers: { "content-type": "application/json", "x-razorpay-signature": signature },
      }),
    );

    expect(res.status).toBe(401);
    expect(order.status).toBe("PENDING");
  });

  it("valid signature over non-JSON bytes → 400 (no crash, no mutation)", async () => {
    pushDirectCreatorOrder();
    const res = await webhookPOST(signedRequest("{{{not json"));
    expect(res.status).toBe(400);
    expect(h.billingEvents).toHaveLength(0);
  });

  it("unconfigured webhook secret → 500 (fail closed)", async () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    try {
      const res = await postPlinkCaptured({ paymentId: "pay_nosecret" });
      expect(res.status).toBe(500);
    } finally {
      process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
    }
  });
});

// ── G. Idempotency & concurrency ────────────────────────────────────────────

describe("RCCF-72.18D.6.1 — idempotency & concurrent duplicate deliveries", () => {
  it("duplicate sequential deliveries of the same payment complete exactly once", async () => {
    const order = pushDirectCreatorOrder();

    await postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_dup" });
    await postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_dup" });
    await postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_dup" });

    expect(order.status).toBe("COMPLETED");
    expect(completedCount()).toBe(1);
    expect(h.fulfillments.size).toBe(1);
    expect(h.billingEvents.filter((e) => e.type === "PAYMENT_CAPTURED_PRODUCT")).toHaveLength(1);
  });

  it("CONCURRENT duplicate deliveries collapse to ONE completion, ONE fulfillment, ONE event", async () => {
    const order = pushDirectCreatorOrder();

    const results = await Promise.allSettled([
      postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_race" }),
      postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_race" }),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(order.status).toBe("COMPLETED");
    expect(completedCount()).toBe(1);
    expect(h.fulfillments.size).toBe(1);
    expect(h.billingEvents.filter((e) => e.type === "PAYMENT_CAPTURED_PRODUCT")).toHaveLength(1);
  });

  it("different valid payments/orders remain fully independent", async () => {
    const order1 = pushDirectCreatorOrder();
    const order2 = pushDirectCreatorOrder();

    await postPlinkCaptured({ linkEntityId: order1.providerReference, paymentId: "pay_indep_1" });
    await postPlinkCaptured({ linkEntityId: order2.providerReference, paymentId: "pay_indep_2" });

    expect(order1.status).toBe("COMPLETED");
    expect(order2.status).toBe("COMPLETED");
    expect(order1.razorpayPaymentId).toBe("pay_indep_1");
    expect(order2.razorpayPaymentId).toBe("pay_indep_2");
    expect(h.fulfillments.size).toBe(2);
    expect(h.billingEvents.filter((e) => e.type === "PAYMENT_CAPTURED_PRODUCT")).toHaveLength(2);
  });
});

// ── H. Event ordering / delayed delivery ────────────────────────────────────

describe("RCCF-72.18D.6.1 — ordering & delayed delivery", () => {
  it("delayed capture: order created first, webhook arrives later → eventually COMPLETED", async () => {
    const order = pushDirectCreatorOrder();
    expect(order.status).toBe("PENDING");

    // …customer pays days later…
    const res = await postPlinkCaptured({
      linkEntityId: order.providerReference,
      paymentId: "pay_delayed",
      notes: { reconciliationRef: tokenOf(order) },
    });

    expect(res.status).toBe(200);
    expect(order.status).toBe("COMPLETED");
  });

  it("payment.failed does NOT complete the order; a later valid capture does", async () => {
    const order = pushDirectCreatorOrder();

    const failBody = JSON.stringify({
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_fail_first",
            amount: 100000,
            status: "failed",
            order_id: "order_rzp_internal_not_stored",
            notes: { reconciliationRef: tokenOf(order) },
          },
        },
      },
    });
    const failRes = await webhookPOST(signedRequest(failBody));
    expect(failRes.status).toBe(200);
    expect(order.status).toBe("PENDING"); // failure never completes

    const capRes = await postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_after_fail" });
    expect(capRes.status).toBe(200);
    expect(order.status).toBe("COMPLETED");
  });

  it("capture then duplicate capture (same financial occurrence) stays single-completion", async () => {
    const order = pushDirectCreatorOrder();

    await postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_seq_dup" });
    const second = await postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_seq_dup" });

    expect(second.status).toBe(200);
    expect(order.status).toBe("COMPLETED");
    expect(completedCount()).toBe(1);
    expect(h.fulfillments.size).toBe(1);
  });
});

// ── I. Failure safety ───────────────────────────────────────────────────────

describe("RCCF-72.18D.6.1 — failure safety", () => {
  it("empty/malformed provider entity → safe 200, zero mutation", async () => {
    pushDirectCreatorOrder();
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: {} } } });

    const res = await webhookPOST(signedRequest(body));

    expect(res.status).toBe(200);
    expect(completedCount()).toBe(0);
    expect(h.billingEvents).toHaveLength(0);
  });

  it("an infrastructure error inside reconciliation is caught → safe 200, zero mutation", async () => {
    const order = pushDirectCreatorOrder();
    h.mockProductOrderFindFirst.mockRejectedValueOnce(new Error("db down"));

    const res = await postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_dbdown" });

    expect(res.status).toBe(200);
    expect(order.status).toBe("PENDING");
    expect(h.fulfillments.size).toBe(0);
  });

  it("quota refusal from the canonical boundary leaves the order PENDING (no partial side effects)", async () => {
    const order = pushDirectCreatorOrder();
    h.mockCompleteProductOrder.mockImplementationOnce(async () => ({
      success: false,
      error: "Order limit reached",
      reason: "quota",
    }));

    const res = await postPlinkCaptured({ linkEntityId: order.providerReference, paymentId: "pay_quota" });

    expect(res.status).toBe(200);
    expect(order.status).toBe("PENDING");
    expect(order.razorpayPaymentId).toBeNull();
    expect(h.billingEvents).toHaveLength(0);
    expect(h.fulfillments.size).toBe(0);
  });
});

// ── Checkout-side: reconciliation identity is minted & persisted ────────────

describe("RCCF-72.18D.6.1 — createDirectCheckout mints a per-checkout reconciliationRef", () => {
  beforeEach(() => {
    h.mockResolveCheckoutTenantId.mockResolvedValue(TENANT_A);
    h.mockResolveCommerceStrategy.mockResolvedValue({ id: "DIRECT_CREATOR", definition: { status: "active" } });
    h.mockComputePaymentReadiness.mockResolvedValue({ readiness: "ready", strategy: "DIRECT_CREATOR" });
    h.mockPaymentAccountFindUnique.mockResolvedValue({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      tenantId: TENANT_A,
      provider: "razorpay",
      providerKeyId: "rzp_test_key",
      providerKeySecret: "rzp_test_secret",
    });
    h.mockProductOrderCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: `created-${h.orders.length + 1}`, ...data }),
    );
  });

  it("passes a UUID reconciliationRef into the adapter metadata and persists the SAME value in providerMetadata", async () => {
    h.mockAdapterCreateCheckout.mockResolvedValue({
      success: true,
      checkoutUrl: "https://rzp.io/i/new",
      providerReference: "plink_new_checkout",
    });
    h.mockGetPaymentProviderAdapter.mockReturnValue({ id: "razorpay", createCheckout: h.mockAdapterCreateCheckout });

    await createDirectCheckout({ productId: "product-xyz", customerEmail: "buyer@example.com" });

    expect(h.mockAdapterCreateCheckout).toHaveBeenCalledTimes(1);
    const adapterInput = h.mockAdapterCreateCheckout.mock.calls[0][0];
    const minted = adapterInput?.order?.metadata?.reconciliationRef;
    expect(typeof minted).toBe("string");
    expect(minted).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const created = h.mockProductOrderCreate.mock.calls[0][0].data as Record<string, unknown>;
    expect(created.commerceStrategy).toBe("DIRECT_CREATOR");
    expect(created.providerReference).toBe("plink_new_checkout");
    expect((created.providerMetadata as Record<string, unknown>).reconciliationRef).toBe(minted);
    expect((created.providerMetadata as Record<string, unknown>).checkoutUrl).toBe("https://rzp.io/i/new");
  });

  it("does NOT persist an order when the provider checkout fails", async () => {
    h.mockAdapterCreateCheckout.mockResolvedValue({ success: false, error: "Creator Razorpay keys not configured" });
    h.mockGetPaymentProviderAdapter.mockReturnValue({ id: "razorpay", createCheckout: h.mockAdapterCreateCheckout });

    const result = await createDirectCheckout({ productId: "product-xyz", customerEmail: "buyer@example.com" });

    expect(result.success).toBe(false);
    expect(h.mockProductOrderCreate).not.toHaveBeenCalled();
  });
});
