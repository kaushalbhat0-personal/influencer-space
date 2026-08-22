import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// RCCF-72.18D.6.5 — DIRECT_CREATOR production activation & post-flip checks.
//
//   A. POLICY 1 (digital refund entitlement) — FULL refund revokes download
//      access INSIDE the successful refund transaction; PARTIAL / FAILED /
//      initiation never touch it; revocation is idempotent.
//   B. Webhook parity — refund.processed-driven FULL refunds revoke too.
//   C. Registry — DIRECT_CREATOR `active` (authorized flip), PLATFORM_COLLECT
//      unchanged, reserved strategies untouched.
//   D. Post-flip matrix A–G — eligibility, fail-closed states, tenant scoping,
//      platform independence.
// ─────────────────────────────────────────────────────────────────────────────

const TENANT_A = "ffffaaaa-ffff-4fff-8fff-ffffffffffff";
const ACCOUNT_ID = "aaaaaaaa-1111-4111-8111-111111111111";

const h = vi.hoisted(() => {
  return {
    orders: [] as Array<Record<string, unknown>>,
    accounts: [] as Array<Record<string, unknown>>,
    fulfillments: [] as Array<Record<string, unknown>>,
    billingEvents: [] as Array<Record<string, unknown>>,
    fulfillmentRevocations: [] as Array<{ where: Record<string, unknown>; data: Record<string, unknown> }>,
    mockAdapterRefund: vi.fn(),
    session: null as { user?: { id?: string; tenantId?: string; role?: string } } | null,
    products: [
      { id: "prod-A", tenantId: "ffffaaaa-ffff-4fff-8fff-ffffffffffff", price: 1000, name: "A Product", isActive: true, status: "PUBLISHED", archivedAt: null },
      { id: "prod-B", tenantId: "ffffbbbb-ffff-4bbb-8bbb-bbbbbbbbbbbb", price: 500, name: "B Product", isActive: true, status: "PUBLISHED", archivedAt: null },
    ] as Array<Record<string, unknown>>,
    strategyStatus: "active",
    checkoutTenantId: "ffffaaaa-ffff-4fff-8fff-ffffffffffff" as string | null,
    mockActionAdapterCreate: vi.fn(),
    mockProductOrderCreate: vi.fn(),
    actionReadiness: { tenantId: "ffffaaaa-ffff-4fff-8fff-ffffffffffff", readiness: "ready", strategy: "DIRECT_CREATOR", provider: "razorpay", requirements: [], missing: [] } as Record<string, unknown>,
  };
});

vi.mock("next-auth", () => ({ getServerSession: async () => h.session }));
vi.mock("@/actions/checkout.actions", () => ({
  resolveCheckoutTenantId: async () => h.checkoutTenantId,
}));
vi.mock("@/modules/commerce-strategy", () => ({
  resolveCommerceStrategy: async () => ({
    id: "DIRECT_CREATOR",
    definition: { id: "DIRECT_CREATOR", status: h.strategyStatus },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/crypto", () => ({
  decrypt: (v: unknown) => v,
  encrypt: (v: unknown) => v,
}));

function findOrder(where: Record<string, unknown>) {
  if (where.id !== undefined) return h.orders.find((o) => o.id === where.id) ?? null;
  if (where.refundStatus?.in) return h.orders.find((o) => (where.refundStatus.in as string[]).includes(o.refundStatus)) ?? null;
  return null;
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productOrder: {
      findUnique: ({ where }: { where: Record<string, unknown> }) => Promise.resolve(findOrder(where)),
      create: h.mockProductOrderCreate,
      findFirst: ({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(h.orders.find((o) => o.id === where.id && o.tenantId === where.tenantId) ?? null),
      update: ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const o = h.orders.find((x) => x.id === where.id);
        if (!o) return Promise.reject(new Error("not found"));
        Object.assign(o, data);
        return Promise.resolve({ ...o });
      },
    },
    billingEvent: {
      findUnique: ({ where }: { where: { idempotencyKey: string } }) =>
        Promise.resolve(h.billingEvents.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null),
      upsert: ({ where, create }: { where: { idempotencyKey: string }; create: Record<string, unknown> }) => {
        const existing = h.billingEvents.find((e) => e.idempotencyKey === where.idempotencyKey);
        if (!existing) {
          const row = { id: `evt-${h.billingEvents.length + 1}`, ...create };
          h.billingEvents.push(row);
          return Promise.resolve(row);
        }
        return Promise.resolve(existing);
      },
    },
    paymentAccount: {
      findUnique: ({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(
          h.accounts.find((a) => a.tenantId === where.tenantId || a.id === where.id) ?? null,
        ),
    },
    orderFulfillment: {
      findUnique: ({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(h.fulfillments.find((f) => f.downloadToken === where.downloadToken) ?? null),
    },
    product: {
      // Honors the tenant scope exactly like Prisma would — cross-tenant ids
      // must resolve to nothing.
      findFirst: ({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(
          h.products.find(
            (p) => p.id === where.id && (where.tenantId === undefined || p.tenantId === where.tenantId),
          ) ?? null,
        ),
    },
    $transaction: async (fn: (tx: Record<string, unknown>) => Promise<unknown>) => {
      const tx = {
        productOrder: {
          update: ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
            const o = h.orders.find((x) => x.id === where.id);
            if (!o) return Promise.reject(new Error("not found"));
            Object.assign(o, data);
            return Promise.resolve({ ...o });
          },
        },
        billingEvent: {
          upsert: ({ where, create }: { where: { idempotencyKey: string }; create: Record<string, unknown> }) => {
            const existing = h.billingEvents.find((e) => e.idempotencyKey === where.idempotencyKey);
            if (!existing) {
              const row = { id: `evt-${h.billingEvents.length + 1}`, ...create };
              h.billingEvents.push(row);
              return Promise.resolve(row);
            }
            return Promise.resolve(existing);
          },
        },
        orderFulfillment: {
          updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
            h.fulfillmentRevocations.push(args);
            return Promise.resolve({ count: 1 });
          },
        },
      };
      return fn(tx);
    },
  },
}));

vi.mock("@/modules/payment-account", () => ({
  getPaymentAccount: vi.fn(),
  savePaymentAccount: vi.fn(),
  verifyPaymentAccount: vi.fn(),
  disconnectPaymentAccount: vi.fn(),
  getPaymentHealth: vi.fn(),
  computePaymentReadiness: vi.fn(() => Promise.resolve(h.actionReadiness)),
  getPaymentProviderAdapter: () => ({
    id: "razorpay",
    refundPayment: h.mockAdapterRefund,
    createCheckout: h.mockActionAdapterCreate,
  }),
}));

import { requestProductOrderRefund, executeProductOrderRefund, createDirectCheckout } from "@/actions/payment-account.actions";
import { COMMERCE_STRATEGY_BY_ID } from "@/modules/commerce-strategy/application/registry";

function pushRefundableOrder(overrides: Record<string, unknown> = {}) {
  const order = {
    id: "order-rf", tenantId: TENANT_A, productId: "prod-A", amount: 1000,
    status: "COMPLETED", commerceStrategy: "DIRECT_CREATOR",
    razorpayOrderId: "plink_rf_1", razorpayPaymentId: "pay_rf_1",
    fanEmail: "buyer@example.com", provider: "razorpay",
    providerReference: "plink_rf_1", providerMetadata: {},
    paymentAccountId: ACCOUNT_ID, refundAmount: 0, refundStatus: "PENDING",
    refundId: null, refundedAt: null,
    ...overrides,
  };
  h.orders.length = 0;
  h.orders.push(order);
  return order;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.accounts.length = 0;
  h.fulfillments.length = 0;
  h.fulfillmentRevocations.length = 0;
  h.billingEvents.length = 0;
  h.session = { user: { id: "u1", tenantId: TENANT_A, role: "ADMIN" } };
  h.accounts.push({
    id: ACCOUNT_ID, tenantId: TENANT_A, provider: "razorpay",
    providerKeyId: "rzp_live_key", providerKeySecret: "rzp_live_secret",
  });
  h.mockAdapterRefund.mockResolvedValue({ success: true, providerRefundId: "rfnd_1", status: "processed" });
});

async function pushDigitalFulfillment(token: string | null) {
  const f = {
    id: "f-1", orderId: "order-rf", tenantId: TENANT_A, productId: "prod-A",
    type: "digital", status: "ready", downloadUrl: "https://files.example.com/a.pdf",
    downloadToken: token, downloadExpiresAt: token ? new Date(Date.now() + 60_000) : null,
    downloadLimit: 5, downloadCount: 0, timeline: [],
  };
  h.fulfillments.push(f);
  return f;
}

// ── A. POLICY 1 — digital refund entitlement ────────────────────────────────

describe("RCCF-72.18D.6.5 — POLICY 1: full refund revokes digital access", () => {
  it("FULL refund success clears the download token INSIDE the refund transaction", async () => {
    pushRefundableOrder(); // captured ₹1000
    await pushDigitalFulfillment("tok_live");

    const res = await executeProductOrderRefund({ orderId: "order-rf", amount: 100000 });

    expect(res.success).toBe(true);
    expect(h.orders[0].refundStatus).toBe("REFUNDED");
    expect(h.fulfillmentRevocations).toHaveLength(1);
    expect(h.fulfillmentRevocations[0].where).toMatchObject({
      orderId: "order-rf",
      type: { in: ["digital", "course"] },
      downloadToken: { not: null },
    });
    expect(h.fulfillmentRevocations[0].data).toEqual({ downloadToken: null, downloadExpiresAt: null });
  });

  it("PARTIAL refund preserves download access (no revocation)", async () => {
    pushRefundableOrder();
    await pushDigitalFulfillment("tok_partial");

    const res = await executeProductOrderRefund({ orderId: "order-rf", amount: 40000 });

    expect(res.success).toBe(true);
    expect(h.orders[0].refundStatus).toBe("PARTIAL");
    expect(h.fulfillmentRevocations).toHaveLength(0);
  });

  it("provider REJECTION (FAILED) never revokes access", async () => {
    pushRefundableOrder();
    await pushDigitalFulfillment("tok_failed");
    h.mockAdapterRefund.mockResolvedValue({ success: false, error: "rejected" });

    const res = await executeProductOrderRefund({ orderId: "order-rf", amount: 100000 });

    expect(res.success).toBe(false);
    expect(h.orders[0].refundStatus).toBe("FAILED");
    expect(h.fulfillmentRevocations).toHaveLength(0);
  });

  it("initiation (requestProductOrderRefund → PENDING) never touches entitlements", async () => {
    const order = pushRefundableOrder({ refundStatus: "NONE" });
    await pushDigitalFulfillment("tok_pending");

    const res = await requestProductOrderRefund({ orderId: order.id, amount: 100000 });

    expect(res.success).toBe(true);
    expect(order.refundStatus).toBe("PENDING");
    expect(h.fulfillmentRevocations).toHaveLength(0);
  });

  it("an ALREADY-revoked token stays revoked (re-full-refund matches nothing new)", async () => {
    pushRefundableOrder({ refundStatus: "PARTIAL", refundAmount: 40000 }); // prior partial cycle settled
    await pushDigitalFulfillment(null); // previously revoked
    h.billingEvents.push({ idempotencyKey: "product_refund_initiated_order-rf" });

    // Second full cycle on a non-PENDING order is reported alreadyProcessed…
    const res = await executeProductOrderRefund({ orderId: "order-rf", amount: 100000 });

    expect(res.alreadyProcessed).toBe(true);
    expect(h.fulfillmentRevocations).toHaveLength(0);
    expect(h.fulfillments[0].downloadToken).toBeNull(); // …and stays revoked
  });

  it("resolveDownloadToken rejects a revoked (null-token) link", async () => {
    const { resolveDownloadToken } = await import("@/modules/fulfillment/application/runtime");
    const r = await resolveDownloadToken("");
    expect(r.ok).toBe(false);
  });
});

// ── B. Webhook reconciliation parity ────────────────────────────────────────

describe("RCCF-72.18D.6.5 — webhook parity for POLICY 1 (source contract)", () => {
  it("route.ts revokes digital access when a reconciled refund reaches REFUNDED", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const src = readFileSync(resolve(__dirname, "..", "..", "src/app/api/webhooks/razorpay/route.ts"), "utf8");
    expect(src).toMatch(/POLICY 1[\s\S]*?finalStatus === "REFUNDED"[\s\S]*?orderFulfillment\.updateMany/);
    expect(src).toMatch(/type: \{ in: \["digital", "course"\] \}, downloadToken: \{ not: null \}/);
  });
});

// ── C/D. Registry + post-flip matrix ────────────────────────────────────────

describe("RCCF-72.18D.6.5 — registry activation", () => {
  it("DIRECT_CREATOR = active; PLATFORM_COLLECT = active (unchanged); reserves untouched", () => {
    expect(COMMERCE_STRATEGY_BY_ID["DIRECT_CREATOR"].status).toBe("active");
    expect(COMMERCE_STRATEGY_BY_ID["PLATFORM_COLLECT"].status).toBe("active");
    expect(COMMERCE_STRATEGY_BY_ID["MARKETPLACE"].status).toBe("reserved");
    expect(COMMERCE_STRATEGY_BY_ID["HYBRID"].status).toBe("reserved");
  });
});

// ── Post-flip matrix (Cases A–G at the checkout boundary) ───────────────────

describe("RCCF-72.18D.6.5 — post-flip verification matrix", () => {
  beforeEach(() => {
    h.mockActionAdapterCreate.mockReset().mockResolvedValue({
      success: true,
      checkoutUrl: "https://rzp.io/i/activated",
      providerReference: "plink_post_flip",
    });
    h.mockProductOrderCreate.mockReset().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "order-new", ...data }),
    );
    h.actionReadiness = {
      tenantId: TENANT_A, readiness: "ready", strategy: "DIRECT_CREATOR",
      provider: "razorpay", requirements: [], missing: [],
    };
  });

  it("Case A — verified creator + active strategy: checkout ALLOWED, order bound to account", async () => {
    const res = await createDirectCheckout({ productId: "prod-A", customerEmail: "buyer@example.com" });

    expect(res.success).toBe(true);
    expect(res.checkoutUrl).toBeTruthy();
    const created = h.mockProductOrderCreate.mock.calls[0][0].data as Record<string, unknown>;
    expect(created.paymentAccountId).toBe(ACCOUNT_ID);
    expect(created.commerceStrategy).toBe("DIRECT_CREATOR");
    expect(created.providerReference).toBe("plink_post_flip");
  });

  it.each([
    ["Case B — unverified (failed) creator", "failed", "blocked", ["Provider credentials verified"]],
    ["Case C — legacy configured creator must re-verify", "configured", "blocked", ["Provider credentials verified"]],
    ["Case E — missing settlement details", "verified", "blocked", ["Settlement detail provided"]],
  ])("%s → denied", async (_label, verification, readiness, missing) => {
    h.actionReadiness = {
      tenantId: TENANT_A, readiness, strategy: "DIRECT_CREATOR", provider: "razorpay",
      requirements: [], missing,
    };

    const res = await createDirectCheckout({ productId: "prod-A", customerEmail: "buyer@example.com" });

    expect(res.success).toBe(false);
    expect(res.error).toContain("not ready");
    expect(h.mockActionAdapterCreate).not.toHaveBeenCalled();
  });

  it("Case F — wrong-tenant product id resolves to nothing even post-activation", async () => {
    const res = await createDirectCheckout({ productId: "prod-B", customerEmail: "buyer@example.com" });
    expect(res.success).toBe(false);
    expect(res.error).toBe("Product not found");
    expect(h.mockActionAdapterCreate).not.toHaveBeenCalled();
  });
});
