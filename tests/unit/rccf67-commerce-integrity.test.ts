import { describe, it, expect, vi, beforeEach } from "vitest";

// ── RCCF-67.2 — Commerce Integrity & Authorization Closure ─────────────────
// 1) Affiliate reorder IDOR   2) Shipping-address IDOR
// 3) Checkout buyer email     4) Live-preview commerce isolation

const h = vi.hoisted(() => {
  const links: Array<{ id: string; tenantId: string; order: number }> = [];
  const orders: Array<{ id: string; tenantId: string; fanEmail: string | null; amount: number; status: string; productId: string; razorpayOrderId: string; product?: { name: string } }> = [];
  const shipping: Record<string, { orderId: string; tenantId: string; line1?: string }> = {};
  const products: Array<{ id: string; tenantId: string; name: string; price: number; isActive: boolean; status: string; archivedAt: null | Date; commerceMode?: string }> = [];
  return {
    links, orders, shipping, products,
    session: null as { user: { id: string; tenantId: string; role: string } } | null,
    storefrontTenant: null as { id: string } | null,
    mockLogAction: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockAfterContentChange: vi.fn(),
    reset: () => { links.length = 0; orders.length = 0; Object.keys(shipping).forEach((k) => delete shipping[k]); products.length = 0; h.session = null; h.storefrontTenant = null; },
  };
});

vi.mock("next-auth", () => ({ getServerSession: async () => h.session }));
vi.mock("next/cache", () => ({ revalidatePath: h.mockRevalidatePath }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/lib/publishing/content-change", () => ({ afterContentChange: h.mockAfterContentChange }));
vi.mock("@/lib/tenant", () => ({ getTenantContext: async () => h.storefrontTenant }));
vi.mock("@/lib/security/rate-limiter", () => ({ checkRateLimit: () => ({ allowed: true, remaining: 19, resetAt: 0, retryAfterMs: 0 }) }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    affiliateLink: {
      updateMany: async ({ where, data }: { where: { id?: string; tenantId?: string }; data: { order?: number } }) => {
        for (const l of h.links) {
          if ((!where.id || l.id === where.id) && (!where.tenantId || l.tenantId === where.tenantId)) {
            if (data.order !== undefined) l.order = data.order;
          }
        }
        return { count: 1 };
      },
    },
    productOrder: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const o = h.orders.find((o) => o.id === where.id) ?? null;
        if (o) {
          const p = h.products.find((p) => p.id === o.productId);
          return { ...o, product: { name: p?.name ?? "Product" } };
        }
        return null;
      },
      findFirst: async ({ where }: { where: { id: string; tenantId?: string } }) =>
        h.orders.find((o) => o.id === where.id && (where.tenantId === undefined || o.tenantId === where.tenantId)) ?? null,
      create: async ({ data }: { data: { tenantId: string; productId: string; amount: number; status: string; razorpayOrderId: string; fanEmail: string } }) => {
        const o = { id: `o-${h.orders.length + 1}`, ...data, updatedAt: new Date(), createdAt: new Date() };
        h.orders.push(o as never);
        return o;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const o = h.orders.find((o) => o.id === where.id)!;
        Object.assign(o, data);
        return o;
      },
    },
    product: {
      findFirst: async ({ where }: { where: { id: string; isActive?: boolean; status?: string; archivedAt?: null } }) =>
        h.products.find((p) => p.id === where.id && (where.isActive === undefined || p.isActive === where.isActive) && (where.status === undefined || p.status === where.status) && (where.archivedAt === undefined || p.archivedAt === where.archivedAt)) ?? null,
    },
    shippingAddress: {
      upsert: async ({ where, create, update }: { where: { orderId: string }; create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const orderId = where.orderId;
        const existing = shipping[orderId] ?? { orderId, tenantId: "" };
        shipping[orderId] = { ...existing, ...update, ...create };
        return shipping[orderId];
      },
    },
    $transaction: async (fns: Array<Promise<unknown>>) => Promise.all(fns),
  },
}));

vi.mock("@/modules/commerce-strategy", () => ({
  resolveCommerceStrategy: async () => ({ id: "PLATFORM_COLLECT", source: "default", definition: {}, readiness: "ready", reason: null }),
}));
vi.mock("@/lib/commerce/coupons", () => ({
  validateCoupon: () => ({ valid: false }),
  applyCoupon: () => ({ applied: false, finalAmount: 0, discountAmount: 0 }),
  calculateTax: (amount: number) => ({ tax: 0, total: amount }),
}));
vi.mock("@/lib/razorpay", () => ({
  getRazorpayInstance: () => ({ orders: { create: async () => ({ id: "rzp_test" }) } }),
}));
vi.mock("@/modules/fulfillment", () => ({
  saveShippingAddress: async (orderId: string, tenantId: string, input: Record<string, unknown>) => {
    h.shipping[orderId] = { orderId, tenantId, ...input } as never;
    return { success: true };
  },
  getShippingAddress: async () => null,
  getFulfillmentByOrder: async () => null,
  generateDownloadForOrder: async () => ({ success: true, url: "/api/fulfillment/download/tok" }),
}));

import { updateLinkOrder } from "@/actions/link.actions";
import { getCustomerOrder, getOrderDownload, submitShippingAddress } from "@/actions/customer-orders.actions";
import { createCheckout } from "@/actions/checkout.actions";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockLogAction.mockResolvedValue(undefined);
  h.mockAfterContentChange.mockResolvedValue(undefined);
  h.links.push({ id: "link-A1", tenantId: TENANT_A, order: 0 });
  h.links.push({ id: "link-A2", tenantId: TENANT_A, order: 1 });
  h.links.push({ id: "link-B1", tenantId: TENANT_B, order: 0 });
});

// ── 1. Affiliate link reorder IDOR ─────────────────────────────────────────

describe("RCCF-67.2 — updateLinkOrder (affiliate reorder) authorization", () => {
  it("A can reorder A's links", async () => {
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    const res = await updateLinkOrder(TENANT_A, [
      { id: "link-A1", order: 1 },
      { id: "link-A2", order: 0 },
    ]);
    expect(res.success).toBe(true);
    expect(h.links.find((l) => l.id === "link-A1")!.order).toBe(1);
    expect(h.links.find((l) => l.id === "link-A2")!.order).toBe(0);
  });

  it("A cannot reorder B's links", async () => {
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    const before = h.links.find((l) => l.id === "link-B1")!.order;
    const res = await updateLinkOrder(TENANT_A, [{ id: "link-B1", order: 99 }]);
    expect(res.success).toBe(true); // no error surfaced, but B's link is untouched
    expect(h.links.find((l) => l.id === "link-B1")!.order).toBe(before);
  });

  it("mixed A/B ids only mutate A's links (no partial cross-tenant mutation)", async () => {
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    const res = await updateLinkOrder(TENANT_A, [
      { id: "link-A1", order: 1 },
      { id: "link-B1", order: 5 },
      { id: "link-A2", order: 0 },
    ]);
    expect(res.success).toBe(true);
    expect(h.links.find((l) => l.id === "link-A1")!.order).toBe(1);
    expect(h.links.find((l) => l.id === "link-A2")!.order).toBe(0);
    expect(h.links.find((l) => l.id === "link-B1")!.order).toBe(0);
  });

  it("client-supplied tenant cannot bypass the session tenant", async () => {
    // Session is A; client tries to pass B's tenant to reorder B's links.
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    const res = await updateLinkOrder(TENANT_B, [{ id: "link-B1", order: 9 }]);
    expect(res.success).toBe(false); // requireAuth rejects the mismatch
    expect(h.links.find((l) => l.id === "link-B1")!.order).toBe(0);
  });

  it("unauthenticated request is rejected", async () => {
    h.session = null;
    const res = await updateLinkOrder(TENANT_A, [{ id: "link-A1", order: 3 }]);
    expect(res.success).toBe(false);
    expect(h.links.find((l) => l.id === "link-A1")!.order).toBe(0);
  });
});

// ── 2. Shipping address authorization ───────────────────────────────────────

describe("RCCF-67.2 — submitShippingAddress authorization", () => {
  const orderA = () => ({ id: "order-A", tenantId: TENANT_A, fanEmail: "buyer@example.com", amount: 100, status: "COMPLETED", productId: "p1", razorpayOrderId: "r1", product: { name: "Wallet" } });
  const input = { name: "Buyer", line1: "1 Main St", city: "Pune", country: "India" } as const;

  beforeEach(() => {
    h.orders.push(orderA() as never);
  });

  it("authorized buyer (verified email) can update their address", async () => {
    const res = await submitShippingAddress("order-A", "BUYER@Example.COM", input as never);
    expect(res.success).toBe(true);
    expect(h.shipping["order-A"].line1).toBe("1 Main St");
  });

  it("authenticated creator/owner can update the address", async () => {
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    const res = await submitShippingAddress("order-A", undefined, input as never);
    expect(res.success).toBe(true);
  });

  it("wrong email is blocked (orderId alone is insufficient)", async () => {
    const res = await submitShippingAddress("order-A", "someone-else@example.com", input as never);
    expect(res.success).toBe(false);
    expect(res.error).toBe("Order not found");
    expect(h.shipping["order-A"]).toBeUndefined();
  });

  it("unauthenticated + no email is blocked", async () => {
    const res = await submitShippingAddress("order-A", undefined, input as never);
    expect(res.success).toBe(false);
    expect(h.shipping["order-A"]).toBeUndefined();
  });

  it("another customer's order (cross-tenant) cannot be modified", async () => {
    h.orders.push({ id: "order-B", tenantId: TENANT_B, fanEmail: "other@example.com", amount: 50, status: "COMPLETED", productId: "p2", razorpayOrderId: "r2", product: { name: "Mug" } } as never);
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    const res = await submitShippingAddress("order-B", undefined, input as never);
    // A is not the owner of order-B and provided no matching email → blocked.
    expect(res.success).toBe(false);
    expect(h.shipping["order-B"]).toBeUndefined();
  });

  it("arbitrary orderId attack is blocked", async () => {
    const res = await submitShippingAddress("order-unknown", undefined, input as never);
    expect(res.success).toBe(false);
  });
});

// ── 3. Checkout buyer email capture ─────────────────────────────────────────

describe("RCCF-67.2 — createCheckout buyer email", () => {
  beforeEach(() => {
    h.products.push({ id: "prod-1", tenantId: TENANT_A, name: "Wallet", price: 100, isActive: true, status: "PUBLISHED", archivedAt: null });
    // RCCF-69.2 — checkout is tenant-scoped: the storefront tenant owns prod-1.
    h.storefrontTenant = { id: TENANT_A };
  });

  it("valid buyer email reaches and is stored on the order", async () => {
    const res = await createCheckout("prod-1", "  Buyer@Example.COM ");
    expect(res.success).toBe(true);
    const created = h.orders.find((o) => o.productId === "prod-1");
    expect(created).toBeDefined();
    expect(created!.fanEmail).toBe("buyer@example.com");
  });

  it("invalid email is rejected (no order created)", async () => {
    const res = await createCheckout("prod-1", "not-an-email");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/email/i);
    expect(h.orders.some((o) => o.productId === "prod-1")).toBe(false);
  });

  it("empty email cannot silently create an order", async () => {
    const res = await createCheckout("prod-1", "");
    expect(res.success).toBe(false);
    expect(h.orders.some((o) => o.productId === "prod-1")).toBe(false);
  });

  it("payment amount remains server-derived", async () => {
    await createCheckout("prod-1", "buyer@example.com");
    const created = h.orders.find((o) => o.productId === "prod-1");
    expect(created!.amount).toBe(100); // product.price server-side, no client input
  });

  it("guest order lookup can subsequently use the captured email", async () => {
    await createCheckout("prod-1", "buyer@example.com");
    const created = h.orders.find((o) => o.productId === "prod-1")!;
    const view = await getCustomerOrder(created.id, "BUYER@example.com");
    expect(view.ok).toBe(true);
    expect(view.order!.customerEmail).toBe("buyer@example.com");
  });

  it("customer grouping no longer collapses into an empty email", async () => {
    await createCheckout("prod-1", "buyer@example.com");
    const created = h.orders.find((o) => o.productId === "prod-1")!;
    expect(created.fanEmail).not.toBe("");
    expect(created.fanEmail).not.toBeUndefined();
  });
});

// ── 4. Preview commerce isolation (server-action boundary is inert) ─────────

describe("RCCF-67.2 — preview commerce isolation", () => {
  it("getOrderDownload requires email proof even when a session exists for another tenant", async () => {
    h.orders.push({ id: "order-A", tenantId: TENANT_A, fanEmail: "buyer@example.com", amount: 100, status: "COMPLETED", productId: "p1", razorpayOrderId: "r1" } as never);
    h.session = { user: { id: "uB", tenantId: TENANT_B, role: "ADMIN" } };
    const res = await getOrderDownload("order-A");
    expect(res.success).toBe(false);
    expect(res.error).toBe("Order not found");
  });

  it("getOrderDownload works for the verified buyer email", async () => {
    h.orders.push({ id: "order-A", tenantId: TENANT_A, fanEmail: "buyer@example.com", amount: 100, status: "COMPLETED", productId: "p1", razorpayOrderId: "r1" } as never);
    const res = await getOrderDownload("order-A", "buyer@example.com");
    // generateDownloadForOrder is mocked away via fulfillment module boundary;
    // success/failure is not asserted — the key is it passes the auth gate.
    expect(res.error).not.toBe("Order not found");
  });
});
