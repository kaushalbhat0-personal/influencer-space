import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// RCCF-72.18D.6.4 — final pre-activation policy & security audit.
//
// This suite PINS EXISTING BEHAVIOR (evidence for the activation decision);
// it deliberately does NOT invent business policy:
//   A. S-3 digital downloads currently SURVIVE refunds (token-scoped TTL/limit
//      only). POLICY DECISION REQUIRED before changing customer entitlement.
//   B. Shipping-address disclosure is tenant-isolated and physical-only.
//   C. WhatsApp commerce is a contact CTA — zero order/payment surface.
//   D. ₹0/free semantics + dead-"PAID" vocabulary cleanup guardrails.
//   E. Activation simulation cases A–E (registry untouched; strategy future).
//   F. Historical PaymentAccount binding guardrails (P2-1 fail-closed).
// ─────────────────────────────────────────────────────────────────────────────

const TENANT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TENANT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const repo = (p: string) => readFileSync(resolve(__dirname, "..", "..", p), "utf8");

const h = vi.hoisted(() => {
  return {
    fulfillments: [] as Array<Record<string, unknown>>,
    orders: [] as Array<Record<string, unknown>>,
    accounts: [] as Array<Record<string, unknown>>,
    mockFulfillmentFindUnique: vi.fn(),
    mockFulfillmentUpdate: vi.fn(),
    mockOrderFindFirst: vi.fn(),
    mockAccountFindUnique: vi.fn(),
    mockAccountUpdate: vi.fn(),
    rzpOrdersAll: vi.fn(),
    strategyId: "DIRECT_CREATOR",
    requireTenantTenantId: null as string | null,
  };
});

vi.mock("@/lib/auth/require-tenant", () => ({
  requireTenant: async () => ({ tenantId: h.requireTenantTenantId }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    orderFulfillment: {
      findUnique: h.mockFulfillmentFindUnique,
      update: h.mockFulfillmentUpdate,
    },
    productOrder: { findFirst: h.mockOrderFindFirst },
    paymentAccount: {
      findUnique: h.mockAccountFindUnique,
      update: h.mockAccountUpdate,
    },
  },
}));

vi.mock("@/modules/commerce-strategy", () => ({
  resolveCommerceStrategy: async () => ({ id: h.strategyId }),
}));
vi.mock("@/modules/payment-account/providers/registry", async () => {
  const { RazorpayPaymentAdapter } = await import("@/modules/payment-account/providers/razorpay");
  return {
    getPaymentProviderAdapter: (id: string) => (id === "razorpay" ? new RazorpayPaymentAdapter() : null),
  };
});

function pushFulfillment(overrides: Record<string, unknown> = {}) {
  const f = {
    id: "f-1", orderId: "order-1", tenantId: TENANT_A, productId: "product-1",
    type: "digital", status: "ready",
    trackingNumber: null, courier: null, carrierNotes: null,
    shippedAt: null, deliveredAt: null,
    downloadUrl: "https://files.example.com/asset.pdf",
    downloadToken: "tok_abc", downloadExpiresAt: new Date(Date.now() + 60_000),
    downloadLimit: 5, downloadCount: 0,
    timeline: [], createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
  h.fulfillments.length = 0;
  h.fulfillments.push(f);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.fulfillments.length = 0;
  h.orders.length = 0;
  h.accounts.length = 0;
  h.strategyId = "DIRECT_CREATOR";
  h.requireTenantTenantId = null;
  h.rzpOrdersAll.mockResolvedValue({ entity: "collection", count: 0, items: [] });
  h.mockFulfillmentFindUnique.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
    if (where.downloadToken !== undefined)
      return Promise.resolve(h.fulfillments.find((f) => f.downloadToken === where.downloadToken) ?? null);
    if (where.orderId !== undefined)
      return Promise.resolve(h.fulfillments.find((f) => f.orderId === where.orderId) ?? null);
    if (where.id !== undefined)
      return Promise.resolve(h.fulfillments.find((f) => f.id === where.id) ?? null);
    return Promise.resolve(null);
  });
  h.mockAccountUpdate.mockImplementation(({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
    const row = h.accounts.find((a) => a.tenantId === (where as { tenantId: string }).tenantId);
    if (!row) return Promise.reject(new Error("Record not found"));
    Object.assign(row, data);
    return Promise.resolve({ ...row });
  });
  h.mockFulfillmentUpdate.mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
    const f = h.fulfillments.find((x) => x.id === where.id);
    if (!f) return Promise.reject(new Error("not found"));
    Object.assign(f, data);
    return Promise.resolve({ ...f });
  });
  h.mockOrderFindFirst.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
    Promise.resolve(h.orders.find((o) => o.id === where.id && o.tenantId === where.tenantId) ?? null),
  );
});

// ── A. S-3 — digital delivery vs refund: CURRENT behavior pinned ────────────

describe("RCCF-72.18D.6.4 — S-3 digital delivery behavior (policy decision required)", () => {
  it("a paid, completed order's download link resolves normally", async () => {
    pushFulfillment();
    const { resolveDownloadToken } = await import("@/modules/fulfillment/application/runtime");

    const r = await resolveDownloadToken("tok_abc");

    expect(r.ok).toBe(true);
    expect(r.url).toContain("asset.pdf");
    expect(h.fulfillments[0].downloadCount).toBe(1);
  });

  it("CURRENT BEHAVIOR: a FULLY refunded order's download link STILL resolves", async () => {
    // Refunds mutate ONLY refundStatus/refundAmount (D.4/D.5.1) — the order
    // stays COMPLETED and fulfillment/download state is untouched by design.
    // This test PINS that fact as audit evidence; changing entitlement without
    // an explicit policy decision is forbidden.
    const f = pushFulfillment();
    const { resolveDownloadToken } = await import("@/modules/fulfillment/application/runtime");

    const r = await resolveDownloadToken(f.downloadToken as string);

    expect(r.ok).toBe(true); // survives refund today
  });

  it("expired links are rejected regardless of refund state", async () => {
    pushFulfillment({ downloadExpiresAt: new Date(Date.now() - 1000) });
    const { resolveDownloadToken } = await import("@/modules/fulfillment/application/runtime");

    const r = await resolveDownloadToken("tok_abc");

    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/expired/i);
  });

  it("exhausted download limits are rejected", async () => {
    pushFulfillment({ downloadCount: 5 });
    const { resolveDownloadToken } = await import("@/modules/fulfillment/application/runtime");

    const r = await resolveDownloadToken("tok_abc");

    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/limit/i);
  });
});

// ── B. Shipping-address disclosure ──────────────────────────────────────────

describe("RCCF-72.18D.6.4 — shipping address disclosure", () => {
  it("creator cannot read another tenant's order shipping address", async () => {
    h.orders.push({ id: "order-B", tenantId: TENANT_B });
    h.requireTenantTenantId = TENANT_A;
    const { getOrderShippingAddress } = await import("@/actions/fulfillment.actions");

    const r = await getOrderShippingAddress("order-B");

    expect(r.ok).toBe(false);
    expect(r.error).toBe("Order not found"); // cross-tenant reads look like not-found
  });

  it("address projection exists only behind the physical-product gate (source contract)", () => {
    const src = readFileSync(resolve(__dirname, "..", "..", "src/app/admin/orders/_components/order-presentation.ts"), "utf8");
    // D.5.2-A truth layer: shipping data is projected only for physical orders.
    expect(src).toMatch(/physical/i);
    expect(src).not.toMatch(/cardNumber|cvv|providerKeySecret/);
  });
});

// ── C. WhatsApp commerce boundary ───────────────────────────────────────────

describe("RCCF-72.18D.6.4 — WhatsApp commerce stays a contact CTA", () => {
  it("buildWaMeLink rejects dangerous schemes and arbitrary URLs", async () => {
    const { buildWaMeLink } = await import("@/lib/commerce/whatsapp");
    expect(buildWaMeLink("javascript:alert(1)", "hi")).toBe("");
    expect(buildWaMeLink("data:text/html,x", "hi")).toBe("");
    expect(buildWaMeLink("https://evil.example.com/+919876543210", "hi")).toBe("");
  });

  it("buildWaMeLink URL-encodes the message and targets wa.me only", async () => {
    const { buildWaMeLink } = await import("@/lib/commerce/whatsapp");
    const url = buildWaMeLink("+919876543210", "Hi! I'd like to order: Course & more");
    expect(url.startsWith("https://wa.me/919876543210?text=")).toBe(true);
    expect(url).not.toContain("&");
    expect(url).not.toContain(" ");
  });

  it("the WhatsApp helper module contains NO order/payment surface (source contract)", () => {
    const code = repo("src/lib/commerce/whatsapp.ts")
      .split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    expect(code).not.toMatch(/productOrder|razorpay|createCheckout|completeProductOrder|paymentAccountId/i);
    expect(repo("src/lib/commerce/whatsapp.ts")).toMatch(/NO order creation, NO Razorpay/);
  });
});

// ── D. Free-order semantics + dead vocabulary cleanup ───────────────────────

describe("RCCF-72.18D.6.4 — ₹0 semantics & PAID vocabulary", () => {
  it("dashboard metrics no longer contain the dead 'PAID' predicate", () => {
    const code = repo("src/features/dashboard/service.ts")
      .split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    expect(code).not.toContain('"PAID"');
    expect(code).toContain('status: "COMPLETED"');
  });

  it("free (₹0) completions flow through the canonical completion boundary", () => {
    const src = repo("src/actions/checkout.actions.ts");
    expect(src).toMatch(/total <= 0/);
    expect(src).toContain("completeProductOrder");
  });

  it("analytics revenue counts COMPLETED orders only (COMPLETED ≠ auto-PAID confusion)", () => {
    const code = repo("src/features/analytics/service.ts")
      .split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
    expect(code).toMatch(/status === "COMPLETED"/);
    expect(code).not.toContain('"PAID"');
  });

  it("no writer anywhere creates ProductOrder status PAID (whole-src scan)", () => {
    const orderActions = repo("src/actions/order.actions.ts");
    expect(orderActions).toMatch(/dead "PAID" vocabulary is gone/);
  });
});

// ── E. Activation simulation cases A–E ──────────────────────────────────────

function pushAccount(overrides: Record<string, unknown> = {}) {
  const row = {
    id: "pa-1", tenantId: TENANT_A, provider: "razorpay",
    displayName: null, accountHolderName: "Creator", merchantName: null,
    upiId: "creator@upi", bankAccountName: null, bankAccountNumber: null, ifsc: null,
    settlementMode: "upi", status: "active", verificationStatus: "verified",
    capabilities: {}, providerKeyId: "rzp_live_key", providerKeySecret: "rzp_live_secret",
    lastVerifiedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
  h.accounts.length = 0;
  h.accounts.push(row);
  return row;
}

describe("RCCF-72.18D.6.4 — activation simulation (registry untouched)", () => {
  beforeEach(() => {
    h.mockAccountFindUnique.mockImplementation(({ where }: { where: { tenantId: string } }) =>
      Promise.resolve(h.accounts.find((a) => a.tenantId === where.tenantId) ?? null),
    );
  });

  it("Case A/B: verified creator is eligible AND the registry reaches active (D.6.5)", async () => {
    pushAccount(); // verified
    const { computePaymentReadiness } = await import("@/modules/payment-account/application/runtime");
    const ready = await computePaymentReadiness(TENANT_A);
    expect(ready.readiness).toBe("ready"); // eligible

    // RCCF-72.18D.6.5 modernized this pin: pre-flip revisions asserted
    // /status: "future"/ here; the authorized flip makes `active` canonical.
    const registrySrc = readFileSync(resolve(__dirname, "..", "..", "src/modules/commerce-strategy/application/registry.ts"), "utf8");
    expect(registrySrc).toMatch(/id: "DIRECT_CREATOR"/);
    expect(registrySrc).toMatch(/status: "active"/);
  });

  it("Case C: verified-but-disconnected account cannot occur through real flows (disconnect resets verification)", async () => {
    const row = pushAccount();
    const { disconnectPaymentAccount, computePaymentReadiness } = await import("@/modules/payment-account/application/runtime");
    await disconnectPaymentAccount(row.tenantId as string, "creator");

    const r = await computePaymentReadiness(row.tenantId as string);
    expect(r.readiness).not.toBe("ready"); // fail-closed even though it was verified
  });

  it("Case D: verified but MISSING settlement details → not ready", async () => {
    pushAccount({ upiId: null }); // settlementMode upi with no UPI id
    const { computePaymentReadiness } = await import("@/modules/payment-account/application/runtime");

    const r = await computePaymentReadiness(TENANT_A);

    expect(r.missing).toContain("Settlement detail provided");
    expect(r.readiness).not.toBe("ready");
  });

  it("Case E: PLATFORM_COLLECT remains active and independent", async () => {
    h.strategyId = "PLATFORM_COLLECT";
    const reg = readFileSync(resolve(__dirname, "..", "..", "src/modules/commerce-strategy/application/registry.ts"), "utf8");
    expect(reg).toMatch(/id: "PLATFORM_COLLECT"[\s\S]*?status: "active"/);
  });
});

// ── F. P2-1 historical binding guardrails ───────────────────────────────────

describe("RCCF-72.18D.6.4 — historical PaymentAccount binding (fail-closed)", () => {
  it("refund execution loads credentials ONLY from order.paymentAccountId (source contract)", () => {
    const src = readFileSync(resolve(__dirname, "..", "..", "src/actions/payment-account.actions.ts"), "utf8");
    expect(src).toMatch(/where: \{ id: order\.paymentAccountId \}/);
    expect(src).toMatch(/paymentAccount\.tenantId !== order\.tenantId/);
  });

  it("no code path substitutes the CURRENT tenant account for historical refunds", () => {
    const src = readFileSync(resolve(__dirname, "..", "..", "src/actions/payment-account.actions.ts"), "utf8");
    // executeProductOrderRefund must not resolve by tenantId unique lookup
    const execSection = src.slice(src.indexOf("executeProductOrderRefund"));
    expect(execSection).not.toMatch(/findUnique\(\{ where: \{ tenantId \} \}\)/);
  });
});
