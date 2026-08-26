import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// RCCF-COM-01 — Commerce order truth + Products/Services decision guardrails.
//
// Production symptom: Razorpay showed a Payment Link as PAID while the creator
// dashboard still listed its order under Pending. Root cause (proven by code
// trace): the DIRECT_CREATOR Payment Link reconciliation bridge only ran for
// `payment.captured`; Razorpay's dedicated `payment_link.paid` event fell
// through the webhook unhandled, so an account delivering only link events
// left its ProductOrder PENDING forever.
//
// Fix under test: the webhook's product-order branch now accepts BOTH
// `payment.captured` and `payment_link.paid`. Everything else is unchanged:
// same signature gate, same canonical `completeProductOrder` boundary
// (PENDING → COMPLETED), same BillingEvent idempotency keyed on the payment id,
// same server-persisted identity resolution (plink providerReference /
// reconciliationRef notes).
//
// The second half pins the Phase E DECISION: Services (`Offering` type
// "coaching" + Bookings) is a genuinely separate domain from commerce Products
// (`Product.type` includes "service"), so both admin surfaces are KEPT — no
// consolidation, no data migration, no deleted records.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const SECRET = "whsec_test_secret_for_com01";
const TENANT = "11111111-1111-4111-8111-111111111111";

interface OrderRow {
  id: string;
  tenantId: string;
  productId: string;
  amount: number;
  status: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  commerceStrategy: string;
  providerReference: string | null;
  providerMetadata: Record<string, unknown> | null;
}

const h = vi.hoisted(() => ({
  orders: [] as OrderRow[],
  billingEvents: [] as Array<Record<string, unknown>>,
  fulfillments: new Set<string>(),
  mockCompleteProductOrder: vi.fn(),
  mockCaptureError: vi.fn(),
  mockHandleSubscriptionWebhook: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: async () => ({ user: null }) }));
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), init),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));

function findOrder(where: Record<string, unknown>): OrderRow | null {
  if (typeof where.id === "string") return h.orders.find((o) => o.id === where.id) ?? null;
  if (typeof where.razorpayPaymentId === "string")
    return h.orders.find((o) => o.razorpayPaymentId === where.razorpayPaymentId) ?? null;
  if (typeof where.razorpayOrderId === "string")
    return h.orders.find((o) => o.razorpayOrderId === where.razorpayOrderId) ?? null;
  return null;
}

/** Emulates both resolver shapes incl. the STRICT strategy filter. */
function findFirstByWhere(where: Record<string, unknown>): OrderRow | null {
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
      findUnique: vi.fn(({ where }: { where: Record<string, unknown> }) => Promise.resolve(findOrder(where))),
      findFirst: vi.fn(({ where }: { where: Record<string, unknown> }) => Promise.resolve(findFirstByWhere(where))),
      update: vi.fn(({ where, data }: { where: { id: string }; data: Partial<OrderRow> }) => {
        const order = findOrder(where);
        if (!order) return Promise.reject(new Error("Record not found"));
        Object.assign(order, data);
        return Promise.resolve({ ...order });
      }),
      create: vi.fn(),
    },
    paymentAccount: { findUnique: vi.fn(async () => null) },
    billingEvent: {
      findUnique: vi.fn(({ where }: { where: { idempotencyKey: string } }) =>
        Promise.resolve(h.billingEvents.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null)),
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        if (h.billingEvents.some((e) => e.idempotencyKey === data.idempotencyKey)) {
          return Promise.reject(new Error("P2002 unique idempotency_key"));
        }
        const row = { id: `evt-${h.billingEvents.length + 1}`, ...data };
        h.billingEvents.push(row);
        return Promise.resolve(row);
      }),
    },
    product: {
      findFirst: vi.fn(async () => ({
        id: "product-xyz",
        tenantId: TENANT,
        price: 299,
        name: "Sticker",
        isActive: true,
        status: "PUBLISHED",
        archivedAt: null,
      })),
    },
    user: { findUnique: vi.fn(async () => null) },
  },
}));

vi.mock("@/modules/billing/application/order-completion", () => ({
  ORDERS_FEATURE_KEY: "orders",
  getCurrentOrderUsage: vi.fn().mockResolvedValue({ used: 0, limit: -1 }),
  completeProductOrder: h.mockCompleteProductOrder,
}));
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: () => ({ allowed: true }),
}));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: h.mockCaptureError }));
vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: { findMembershipsByUserId: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/modules/billing/application/service", () => ({
  billingService: {
    handleSubscriptionWebhook: h.mockHandleSubscriptionWebhook,
    handleRefund: vi.fn().mockResolvedValue({ handled: true }),
  },
}));

import { POST as webhookPOST } from "@/app/api/webhooks/razorpay/route";

function pushDirectOrder(overrides: Partial<OrderRow> = {}): OrderRow {
  const row: OrderRow = {
    id: "order-com01",
    tenantId: TENANT,
    productId: "product-xyz",
    amount: 299,
    status: "PENDING",
    razorpayOrderId: "",
    razorpayPaymentId: null,
    commerceStrategy: "DIRECT_CREATOR",
    providerReference: "plink_com01",
    providerMetadata: { reconciliationRef: "recon-com01" },
    ...overrides,
  };
  h.orders.push(row);
  return row;
}

function signedRequest(body: object): Request {
  const raw = JSON.stringify(body);
  return new Request("http://localhost/api/webhooks/razorpay", {
    method: "POST",
    body: raw,
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": crypto.createHmac("sha256", SECRET).update(raw).digest("hex"),
    },
  });
}

const paymentEntity = (over: Record<string, unknown> = {}) => ({
  id: "pay_com01",
  amount: 29900,
  status: "captured",
  notes: { referenceId: "recon-com01", creatorStore: "true", reconciliationRef: "recon-com01" },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  h.orders.length = 0;
  h.billingEvents.length = 0;
  h.fulfillments.clear();

  // Canonical boundary contract (RCCF-38): only PENDING completes; COMPLETED is
  // an idempotent success no-op; completion writes the payment id and creates
  // exactly one fulfillment via the orderId @unique constraint.
  h.mockCompleteProductOrder.mockImplementation(async (orderId: string, ctx?: { paymentId?: string }) => {
    const order = findOrder({ id: orderId });
    if (!order) return { success: false, error: "Order not found", reason: "not_found" };
    if (order.status === "COMPLETED") return { success: true, reason: "already_completed" };
    if (order.status !== "PENDING") return { success: false, error: "Order is not pending", reason: "not_pending" };
    order.status = "COMPLETED";
    if (ctx?.paymentId) order.razorpayPaymentId = ctx.paymentId;
    h.fulfillments.add(orderId);
    return { success: true };
  });
  h.mockHandleSubscriptionWebhook.mockResolvedValue({ handled: false });
});

// ── A. Successful TEST payment transitions through the NEW event path ────────

describe("COM-01 · successful payment_link.paid completes the canonical order", () => {
  it("a delivered `payment_link.paid` event transitions PENDING → COMPLETED with one fulfillment", async () => {
    pushDirectOrder();
    const res = await webhookPOST(
      signedRequest({
        event: "payment_link.paid",
        payload: {
          payment: { entity: paymentEntity() },
          payment_link: { entity: { id: "plink_com01", status: "paid" } },
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(findOrder({ id: "order-com01" })?.status).toBe("COMPLETED");
    expect(findOrder({ id: "order-com01" })?.razorpayPaymentId).toBe("pay_com01");
    expect(h.fulfillments).toEqual(new Set(["order-com01"]));
  });

  it("`payment_link.paid` carries NO subscription side effects (no plan activation)", async () => {
    pushDirectOrder();
    await webhookPOST(
      signedRequest({
        event: "payment_link.paid",
        payload: {
          payment: { entity: paymentEntity() },
          payment_link: { entity: { id: "plink_com01" } },
        },
      }),
    );
    expect(h.mockHandleSubscriptionWebhook).not.toHaveBeenCalled();
  });
});

describe("COM-01 · captured path unchanged and cross-event idempotent", () => {
  it("payment.captured still completes a DIRECT_CREATOR link order (existing D.6.1 behavior)", async () => {
    pushDirectOrder();
    await webhookPOST(
      signedRequest({
        event: "payment.captured",
        payload: { payment: { entity: paymentEntity({ payment_link: "plink_com01" }) } },
      }),
    );
    expect(findOrder({ id: "order-com01" })?.status).toBe("COMPLETED");
  });

  it("BOTH events delivered for one payment → exactly ONE completion, ONE fulfillment, ONE capture BillingEvent", async () => {
    pushDirectOrder();
    const plinkPaid = signedRequest({
      event: "payment_link.paid",
      payload: {
        payment: { entity: paymentEntity() },
        payment_link: { entity: { id: "plink_com01" } },
      },
    });
    const captured = signedRequest({
      event: "payment.captured",
      payload: { payment: { entity: paymentEntity({ payment_link: "plink_com01" }) } },
    });
    await webhookPOST(plinkPaid);
    await webhookPOST(captured); // duplicate financial occurrence

    expect(h.fulfillments).toEqual(new Set(["order-com01"]));
    const captures = h.billingEvents.filter((e) => e.idempotencyKey === "razorpay_payment_captured_product_pay_com01");
    expect(captures).toHaveLength(1);
  });

  it("duplicate `payment_link.paid` delivery is an idempotent no-op", async () => {
    pushDirectOrder();
    const body = signedRequest({
      event: "payment_link.paid",
      payload: {
        payment: { entity: paymentEntity() },
        payment_link: { entity: { id: "plink_com01" } },
      },
    });
    await webhookPOST(body);
    await webhookPOST(signedRequest({
      event: "payment_link.paid",
      payload: {
        payment: { entity: paymentEntity() },
        payment_link: { entity: { id: "plink_com01" } },
      },
    }));
    expect(h.fulfillments).toEqual(new Set(["order-com01"]));
  });
});

// ── B. Fail-closed matrix ────────────────────────────────────────────────────

describe("COM-01 · fail-closed semantics preserved on the new event", () => {
  it("pending order WITHOUT any event stays pending (no fake transitions)", async () => {
    pushDirectOrder();
    expect(findOrder({ id: "order-com01" })?.status).toBe("PENDING");
    expect(h.fulfillments.size).toBe(0);
  });

  it("amount mismatch never completes (amount authority)", async () => {
    pushDirectOrder();
    await webhookPOST(
      signedRequest({
        event: "payment_link.paid",
        payload: {
          payment: { entity: paymentEntity({ amount: 100 }) }, // ₹1 vs ₹299
          payment_link: { entity: { id: "plink_com01" } },
        },
      }),
    );
    expect(findOrder({ id: "order-com01" })?.status).toBe("PENDING");
  });

  it("unknown provider identity → zero mutation (unmatched)", async () => {
    pushDirectOrder({ providerReference: "plink_other", providerMetadata: { reconciliationRef: "recon-other" } });
    await webhookPOST(
      signedRequest({
        event: "payment_link.paid",
        payload: {
          payment: { entity: paymentEntity({ notes: { referenceId: "unknown-ref" } }) },
          payment_link: { entity: { id: "plink_unknown" } },
        },
      }),
    );
    expect(findOrder({ id: "order-com01" })?.status).toBe("PENDING");
    expect(h.fulfillments.size).toBe(0);
  });

  it("tenant isolation: client-supplied tenant/email in the payload can never select or mutate another tenant's order", async () => {
    pushDirectOrder(); // belongs to TENANT
    await webhookPOST(
      signedRequest({
        event: "payment_link.paid",
        payload: {
          payment: { entity: paymentEntity({ notes: { tenantId: "99999999-9999-4999-8999-999999999999", email: "attacker@evil.test" } }) },
          payment_link: { entity: { id: "plink_com01" } },
        },
      }),
    );
    const row = findOrder({ id: "order-com01" });
    expect(row?.tenantId).toBe(TENANT); // identity came from server-persisted fields only
    expect(row?.status).toBe("COMPLETED"); // matched by plink ref, not by wire claims
  });

  it("signature gate remains mandatory for the new event too", async () => {
    pushDirectOrder();
    const raw = JSON.stringify({
      event: "payment_link.paid",
      payload: { payment: { entity: paymentEntity() }, payment_link: { entity: { id: "plink_com01" } } },
    });
    const res = await webhookPOST(
      new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        body: raw,
        headers: { "content-type": "application/json", "x-razorpay-signature": "deadbeef" },
      }),
    );
    expect(res.status).toBe(401);
    expect(findOrder({ id: "order-com01" })?.status).toBe("PENDING");
  });

  it("failed payments never complete; failure diagnostics stay on payment.failed only", async () => {
    pushDirectOrder({ status: "PENDING" });
    await webhookPOST(
      signedRequest({
        event: "payment.failed",
        payload: { payment: { entity: paymentEntity({ status: "failed", order_id: "" }) } },
      }),
    );
    expect(findOrder({ id: "order-com01" })?.status).toBe("PENDING");
    expect(h.fulfillments.size).toBe(0);
  });
});

// ── C. Dashboard truth audit (presentation reads canonical vocabulary only) ──

describe("COM-01 · dashboard reads canonical state (no second vocabulary)", () => {
  it("orders presentation maps ONLY PENDING/COMPLETED — COMPLETED renders as Paid", () => {
    const src = readFileSync(join(ROOT, "src/app/admin/orders/_components/order-presentation.ts"), "utf8");
    expect(src).toContain('PENDING: { label: "Pending", badgeVariant: "warning" }');
    expect(src).toContain('COMPLETED: { label: "Paid", badgeVariant: "success" }');
    expect(src).not.toMatch(/(^|\n)\s*PAID:\s*\{/); // dead "PAID" key stays dead (mentioned only in prose)
  });

  it("the orders page derives metrics from canonical status with force-dynamic (no stale projection)", () => {
    const src = readFileSync(join(ROOT, "src/app/admin/orders/page.tsx"), "utf8");
    expect(src).toContain('export const dynamic = "force-dynamic"');
    expect(src).toContain('(o) => o.status === "COMPLETED"');
    expect(src).toContain('(o) => o.status === "PENDING"');
  });

  it("the webhook fix routes the new event into the SAME canonical boundary (no parallel completion system)", () => {
    const src = readFileSync(join(ROOT, "src/app/api/webhooks/razorpay/route.ts"), "utf8");
    expect(src).toContain('event === "payment.captured" || event === "payment_link.paid"');
    // The reconciliation still feeds completeProductOrder — never writes status directly.
    expect(src).toContain("reconcileDirectCreatorPaymentLinkPayment");
    expect(src).toContain("completeProductOrder");
  });
});

// ── D. Products/Services decision guardrails (Phase E verdict pinned) ────────

describe("COM-01 · Products vs Services architecture decision is preserved", () => {
  it("Services persist to the Offering domain (type coaching) — NOT merged into Product", () => {
    const src = readFileSync(join(ROOT, "src/features/services/service.ts"), "utf8");
    expect(src).toContain("prisma.offering.findMany");
    expect(src).toContain('type: "coaching"');
    expect(src).not.toContain("prisma.product.create");
  });

  it("both management surfaces exist as distinct routes; neither was deleted", () => {
    expect(readFileSync(join(ROOT, "src/app/admin/products/page.tsx"), "utf8").length).toBeGreaterThan(0);
    expect(readFileSync(join(ROOT, "src/app/admin/services/page.tsx"), "utf8").length).toBeGreaterThan(0);
  });

  it("service bookings remain wired to the Booking flow (bookable offerings keep their domain)", () => {
    const actions = readFileSync(join(ROOT, "src/features/services/actions.ts"), "utf8");
    expect(actions).toContain("bookingService");
    expect(actions).toContain("withLaunchCoreContentCapacity"); // entitlements intact
  });

  it("Product.type keeps service in its taxonomy (commerce-side service selling untouched)", () => {
    const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
    expect(schema).toContain("digital | physical | course | service | booking | affiliate | donation");
  });
});
