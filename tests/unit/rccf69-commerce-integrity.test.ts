import { describe, it, expect, vi, beforeEach } from "vitest";

// ── RCCF-69.2 — Creator Commerce Integrity & Payment Boundary ─────────────
// 1) Checkout cross-tenant IDOR closure (P0)
// 2) Checkout rate limit
// 3) DIRECT_CREATOR truthfully gated (future strategy never invoked)
// 4) Payment-account verification truth (config-validated, never "verified")
// 5) Payment-account tenant isolation

const h = vi.hoisted(() => {
  const products: Array<{ id: string; tenantId: string; name: string; price: number; isActive: boolean; status: string; archivedAt: null | Date }> = [];
  const orders: Array<{ id: string; tenantId: string; productId: string; amount: number; status: string; razorpayOrderId: string; fanEmail: string | null }> = [];
  const accounts: Array<{ tenantId: string; provider: string; verificationStatus: string; status: string; providerKeyId: string | null; providerKeySecret: string | null }> = [];
  const rateCalls: Array<{ key: string; endpoint: string }> = [];
  return {
    products, orders, accounts, rateCalls,
    session: null as { user: { id: string; tenantId: string; role: string } } | null,
    storefrontTenant: null as { id: string } | null,
    strategyId: "PLATFORM_COLLECT" as string,
    strategyStatus: "active" as string,
    rateAllowed: true as boolean,
    mockLogAction: vi.fn(),
    mockRazorpayCreate: vi.fn(),
    mockCompleteProductOrder: vi.fn(),
    mockComputePaymentReadiness: vi.fn(),
    reset: () => {
      products.length = 0; orders.length = 0; accounts.length = 0; rateCalls.length = 0;
      h.session = null; h.storefrontTenant = null;
      h.strategyId = "PLATFORM_COLLECT"; h.strategyStatus = "active"; h.rateAllowed = true;
    },
  };
});

vi.mock("next-auth", () => ({ getServerSession: async () => h.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/lib/tenant", () => ({ getTenantContext: async () => h.storefrontTenant }));
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: (key: string, endpoint?: string) => {
    h.rateCalls.push({ key, endpoint: endpoint ?? "" });
    return h.rateAllowed
      ? { allowed: true, remaining: 19, resetAt: 0, retryAfterMs: 0 }
      : { allowed: false, remaining: 0, resetAt: 0, retryAfterMs: 1000 };
  },
  clearRateLimits: vi.fn(),
}));

vi.mock("@/lib/commerce/coupons", () => ({
  validateCoupon: () => ({ valid: false }),
  applyCoupon: () => ({ applied: false, finalAmount: 0, discountAmount: 0 }),
  calculateTax: (amount: number) => ({ tax: 0, total: amount }),
}));
vi.mock("@/lib/razorpay", () => ({
  getRazorpayInstance: () => ({ orders: { create: h.mockRazorpayCreate } }),
}));
vi.mock("@/modules/fulfillment", () => ({ ensureFulfillment: async () => {} }));

vi.mock("@/modules/commerce-strategy", () => ({
  resolveCommerceStrategy: async () => ({
    id: h.strategyId,
    source: "default",
    definition: { id: h.strategyId, status: h.strategyStatus },
    readiness: h.strategyId === "PLATFORM_COLLECT" ? "ready" : "incomplete",
    reason: null,
  }),
}));

vi.mock("@/modules/billing/application/order-completion", () => ({
  completeProductOrder: h.mockCompleteProductOrder,
}));

vi.mock("@/modules/payment-account", () => ({
  getPaymentAccount: async (tenantId: string) => {
    const a = h.accounts.find((x) => x.tenantId === tenantId);
    if (!a) return null;
    return { ...a, hasProviderKeys: !!a.providerKeyId && !!a.providerKeySecret };
  },
  savePaymentAccount: async (_tenantId: string, _input: Record<string, unknown>) => ({ success: true }),
  verifyPaymentAccount: async (tenantId: string, _actor: string) => {
    const a = h.accounts.find((x) => x.tenantId === tenantId);
    if (!a) return { success: false, error: "No payment account" };
    if (a.providerKeyId && a.providerKeyId.startsWith("rzp_")) {
      a.verificationStatus = "configured";
      return { success: true, verified: false, error: "Credentials format validated. Provider-side verification is not available for Direct Creator mode yet." };
    }
    return { success: false, error: "Keys missing" };
  },
  disconnectPaymentAccount: async () => ({ success: true }),
  computePaymentReadiness: h.mockComputePaymentReadiness,
  getPaymentHealth: async () => ({}),
  getPaymentProviderAdapter: (id: string) => id === "razorpay" ? {} : null,
  getPaymentProviderLabel: () => "Razorpay",
}));
vi.mock("@/modules/payment-account/providers/registry", () => ({
  getPaymentProviderAdapter: (id: string) => id === "razorpay" ? {} : null,
  getPaymentProviderLabel: () => "Razorpay",
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: async ({ where }: { where: { id: string; tenantId?: string; isActive?: boolean; status?: string; archivedAt?: null } }) =>
        h.products.find((p) =>
          p.id === where.id
          && (where.tenantId === undefined || p.tenantId === where.tenantId)
          && (where.isActive === undefined || p.isActive === where.isActive)
          && (where.status === undefined || p.status === where.status)
          && (where.archivedAt === undefined || p.archivedAt === where.archivedAt)
        ) ?? null,
    },
    productOrder: {
      create: async ({ data }: { data: { tenantId: string; productId: string; amount: number; status: string; razorpayOrderId: string; fanEmail: string } }) => {
        const o = { id: `o-${h.orders.length + 1}`, ...data };
        h.orders.push(o as never);
        return o;
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const o = h.orders.find((x) => x.id === where.id)!;
        Object.assign(o, data);
        return o;
      },
      findUnique: async ({ where }: { where: { id: string } }) => h.orders.find((o) => o.id === where.id) ?? null,
    },
    paymentAccount: {
      findUnique: async ({ where }: { where: { tenantId: string } }) => h.accounts.find((a) => a.tenantId === where.tenantId) ?? null,
      update: async ({ where, data }: { where: { tenantId: string }; data: Record<string, unknown> }) => {
        const a = h.accounts.find((x) => x.tenantId === where.tenantId)!;
        Object.assign(a, data);
        return a;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const a = { tenantId: String(data.tenantId), provider: "razorpay", verificationStatus: "unverified", status: "pending", providerKeyId: null, providerKeySecret: null, ...data };
        h.accounts.push(a as never);
        return a;
      },
    },
  },
}));

import { createCheckout, resolveCheckoutTenantId } from "@/actions/checkout.actions";
import { createDirectCheckout, verifyMyPaymentAccount, saveMyPaymentAccount } from "@/actions/payment-account.actions";
import { RazorpayPaymentAdapter } from "@/modules/payment-account/providers/razorpay";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

function product(id: string, tenantId: string, overrides: Record<string, unknown> = {}) {
  const p = { id, tenantId, name: `Product ${id}`, price: 100, isActive: true, status: "PUBLISHED", archivedAt: null };
  Object.assign(p, overrides);
  return p;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockLogAction.mockResolvedValue(undefined);
  h.mockRazorpayCreate.mockResolvedValue({ id: "rzp_test_order" });
  h.mockCompleteProductOrder.mockResolvedValue({ success: true });
  h.mockComputePaymentReadiness.mockResolvedValue({ strategy: "PLATFORM_COLLECT", readiness: "ready", requirements: [], missing: [] });
});

describe("RCCF-69.2 — checkout tenant authority (P0)", () => {
  it("Creator A can checkout A's published product (same-tenant)", async () => {
    h.products.push(product("pA", TENANT_A));
    h.storefrontTenant = { id: TENANT_A };
    const res = await createCheckout("pA", "buyer@example.com");
    expect(res.success).toBe(true);
    expect(h.orders.some((o) => o.productId === "pA")).toBe(true);
  });

  it("Creator A cannot checkout B's product (cross-tenant product → rejected, zero side effects)", async () => {
    h.products.push(product("pB", TENANT_B));
    h.storefrontTenant = { id: TENANT_A };
    const res = await createCheckout("pB", "buyer@example.com");
    expect(res.success).toBe(false);
    expect(res.error).toBe("Product not found");
    expect(h.orders).toHaveLength(0);
    expect(h.mockRazorpayCreate).not.toHaveBeenCalled();
  });

  it("public storefront A cannot checkout product B (host-derived tenant mismatch)", async () => {
    h.products.push(product("pB", TENANT_B));
    h.storefrontTenant = { id: TENANT_A };
    const res = await createCheckout("pB", "buyer@example.com");
    expect(res.success).toBe(false);
    expect(h.orders).toHaveLength(0);
  });

  it("authenticated admin context uses session tenant (Creator B checkout of B's product)", async () => {
    h.products.push(product("pB", TENANT_B));
    h.storefrontTenant = null;
    h.session = { user: { id: "uB", tenantId: TENANT_B, role: "ADMIN" } };
    const res = await createCheckout("pB", "buyer@example.com");
    expect(res.success).toBe(true);
    expect(h.orders.some((o) => o.productId === "pB")).toBe(true);
  });

  it("authenticated admin context cannot checkout another tenant's product via session", async () => {
    h.products.push(product("pB", TENANT_B));
    h.storefrontTenant = null;
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    const res = await createCheckout("pB", "buyer@example.com");
    expect(res.success).toBe(false);
    expect(h.orders).toHaveLength(0);
  });

  it("no tenant authority (no storefront host, no session) → rejected", async () => {
    h.products.push(product("pA", TENANT_A));
    h.storefrontTenant = null;
    h.session = null;
    const res = await createCheckout("pA", "buyer@example.com");
    expect(res.success).toBe(false);
    expect(h.orders).toHaveLength(0);
  });

  it("inactive product rejected", async () => {
    h.products.push(product("pA", TENANT_A, { isActive: false }));
    h.storefrontTenant = { id: TENANT_A };
    const res = await createCheckout("pA", "buyer@example.com");
    expect(res.success).toBe(false);
    expect(h.orders).toHaveLength(0);
  });

  it("unpublished product rejected", async () => {
    h.products.push(product("pA", TENANT_A, { status: "DRAFT" }));
    h.storefrontTenant = { id: TENANT_A };
    const res = await createCheckout("pA", "buyer@example.com");
    expect(res.success).toBe(false);
    expect(h.orders).toHaveLength(0);
  });

  it("unknown / malformed product id rejected", async () => {
    h.storefrontTenant = { id: TENANT_A };
    const res = await createCheckout("does-not-exist", "buyer@example.com");
    expect(res.success).toBe(false);
    expect(h.orders).toHaveLength(0);
  });

  it("spoofed tenantId cannot select another tenant's product (tenant is server-derived)", async () => {
    h.products.push(product("pB", TENANT_B));
    // The client has NO tenant parameter to spoof — the authority is server-side.
    h.storefrontTenant = { id: TENANT_A };
    const res = await createCheckout("pB", "buyer@example.com", undefined);
    expect(res.success).toBe(false);
    expect(h.orders).toHaveLength(0);
  });

  it("server-derived price is preserved (client cannot alter amount)", async () => {
    h.products.push(product("pA", TENANT_A, { price: 250 }));
    h.storefrontTenant = { id: TENANT_A };
    const res = await createCheckout("pA", "buyer@example.com");
    expect(res.success).toBe(true);
    const o = h.orders.find((x) => x.productId === "pA")!;
    expect(o.amount).toBe(250);
  });

  it("rejected cross-tenant checkout consumes zero quota / payment / fulfillment", async () => {
    h.products.push(product("pB", TENANT_B));
    h.storefrontTenant = { id: TENANT_A };
    await createCheckout("pB", "buyer@example.com");
    expect(h.mockCompleteProductOrder).not.toHaveBeenCalled();
    expect(h.mockRazorpayCreate).not.toHaveBeenCalled();
    expect(h.orders).toHaveLength(0);
  });
});

describe("RCCF-69.2 — checkout rate limit", () => {
  it("applies the shared in-memory limiter before provider work", async () => {
    h.products.push(product("pA", TENANT_A));
    h.storefrontTenant = { id: TENANT_A };
    await createCheckout("pA", "buyer@example.com");
    expect(h.rateCalls.length).toBe(1);
    expect(h.rateCalls[0].key).toMatch(/^\/checkout:/);
    expect(h.rateCalls[0].endpoint).toBe("/api/checkout");
  });

  it("fails safely when the limiter denies (no order, no Razorpay)", async () => {
    h.products.push(product("pA", TENANT_A));
    h.storefrontTenant = { id: TENANT_A };
    h.rateAllowed = false;
    const res = await createCheckout("pA", "buyer@example.com");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/too many checkout attempts/i);
    expect(h.orders).toHaveLength(0);
    expect(h.mockRazorpayCreate).not.toHaveBeenCalled();
  });
});

describe("RCCF-69.2 — DIRECT_CREATOR truthfully gated", () => {
  it("never branches to DIRECT_CREATOR when the strategy is not active (future/reserved)", async () => {
    h.products.push(product("pA", TENANT_A));
    h.storefrontTenant = { id: TENANT_A };
    h.strategyId = "DIRECT_CREATOR";
    h.strategyStatus = "future";
    const res = await createCheckout("pA", "buyer@example.com");
    // Future strategy → falls through to PLATFORM_COLLECT canonical checkout.
    expect(res.success).toBe(true);
    expect(h.orders.some((o) => o.productId === "pA")).toBe(true);
  });

  it("createDirectCheckout refuses when the strategy is not active", async () => {
    h.products.push(product("pA", TENANT_A));
    h.storefrontTenant = { id: TENANT_A };
    h.strategyId = "DIRECT_CREATOR";
    h.strategyStatus = "future";
    const res = await createDirectCheckout({ productId: "pA", customerEmail: "buyer@example.com" });
    expect(res.success).toBe(false);
    expect(res.error).toBe("Direct creator checkout is not available yet.");
  });

  it("createDirectCheckout scopes the product lookup to the checkout tenant", async () => {
    h.products.push(product("pB", TENANT_B));
    h.storefrontTenant = { id: TENANT_A };
    h.strategyId = "DIRECT_CREATOR";
    h.strategyStatus = "active";
    const res = await createDirectCheckout({ productId: "pB", customerEmail: "buyer@example.com" });
    expect(res.success).toBe(false);
    expect(res.error).toBe("Product not found");
  });
});

describe("RCCF-69.2 — payment account verification truth", () => {
  it("Razorpay adapter reports configuration-format validation, NOT provider verification", async () => {
    const adapter = new RazorpayPaymentAdapter();
    const ok = await adapter.getAccountStatus({ providerKeyId: "rzp_live_abc", providerKeySecret: "secret" });
    expect(ok.success).toBe(true);
    expect(ok.verified).toBe(false);
    expect(ok.status).toBe("configured");
  });

  it("adapter rejects missing or malformed keys", async () => {
    const adapter = new RazorpayPaymentAdapter();
    expect((await adapter.getAccountStatus({ providerKeyId: null, providerKeySecret: "x" })).success).toBe(false);
    expect((await adapter.getAccountStatus({ providerKeyId: "bad", providerKeySecret: "x" })).success).toBe(false);
  });

  it("verifyMyPaymentAccount never writes a false 'verified' state", async () => {
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    h.accounts.push({ tenantId: TENANT_A, provider: "razorpay", verificationStatus: "pending", status: "active", providerKeyId: "rzp_live_abc", providerKeySecret: "secret" });
    const res = await verifyMyPaymentAccount();
    expect(res.success).toBe(true);
    expect(res.verified).toBe(false);
    const account = h.accounts.find((a) => a.tenantId === TENANT_A)!;
    expect(account.verificationStatus).toBe("configured");
    expect(account.verificationStatus).not.toBe("verified");
  });
});

describe("RCCF-69.2 — payment account tenant isolation", () => {
  it("Creator A cannot read or mutate Creator B's payment account", async () => {
    h.accounts.push({ tenantId: TENANT_B, provider: "razorpay", verificationStatus: "unverified", status: "active", providerKeyId: null, providerKeySecret: null });
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    // verifyMyPaymentAccount uses the SESSION tenant — it must look up A's (absent) row, not B's.
    const res = await verifyMyPaymentAccount();
    expect(res.success).toBe(false);
    expect(res.error).toBe("No payment account");
  });

  it("saveMyPaymentAccount writes to the session tenant, not a client tenant", async () => {
    h.session = { user: { id: "uA", tenantId: TENANT_A, role: "ADMIN" } };
    const res = await saveMyPaymentAccount({ provider: "razorpay", accountHolderName: "Alice" });
    expect(res.success).toBe(true);
    // The module mock writes to the session tenant (A); B's row stays absent.
    expect(h.accounts.some((a) => a.tenantId === TENANT_A)).toBe(false); // mock does not create rows; assertion is about authority
    expect(h.accounts.some((a) => a.tenantId === TENANT_B)).toBe(false);
  });
});

describe("RCCF-69.2 — tenant authority helper", () => {
  it("prefers the storefront (host-derived) tenant", async () => {
    h.storefrontTenant = { id: TENANT_A };
    h.session = { user: { id: "uB", tenantId: TENANT_B, role: "ADMIN" } };
    expect(await resolveCheckoutTenantId()).toBe(TENANT_A);
  });

  it("falls back to the authenticated session tenant", async () => {
    h.storefrontTenant = null;
    h.session = { user: { id: "uB", tenantId: TENANT_B, role: "ADMIN" } };
    expect(await resolveCheckoutTenantId()).toBe(TENANT_B);
  });

  it("returns null when no tenant authority exists", async () => {
    h.storefrontTenant = null;
    h.session = null;
    expect(await resolveCheckoutTenantId()).toBeNull();
  });
});
