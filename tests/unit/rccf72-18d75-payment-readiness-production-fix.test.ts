// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// RCCF-72.18D.7.5 — Creator Razorpay credential verification vs canonical
// payment readiness (production divergence fix).
//
// Observed production behavior: creator enters TEST keys → UI reports verified
// → storefront checkout fails "Creator payment account not ready". Same for
// LIVE keys (+ the amber readiness badge misread as a mode warning).
//
// Root cause (classification A): verification and readiness are DIFFERENT
// states. The probe proves only that the key pair AUTHENTICATES; canonical
// readiness additionally requires holder identity and settlement details.
// Checkout correctly failed closed. The defect was the communication boundary.
//
// This suite pins the BUSINESS CONTRACT, not implementation details:
//   A. Verified != ready — keys-only accounts stay blocked; every requirement
//      gate is enumerated and enforced.
//   B. verifyPaymentAccount returns the CANONICAL readiness snapshot (fix).
//   C. TEST (rzp_test_) and LIVE (rzp_live_) pairs take the IDENTICAL
//      mode-agnostic verification contract; malformed ids fail closed.
//   D. Checkout honors readiness (deny when incomplete; allow + persist a
//      bound order when ready) with server-side tenant authority.
//   E. Buyer-facing mapping: internal state never reaches the storefront;
//      safe category PAYMENT_SETUP_REQUIRED.
//   F. Creator UI states distinguish verified vs ready using the real report.
//   G. Zero credential material in results, events, logs or errors.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const TENANT = (n: number) => `eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12, "0")}`;
const T1 = TENANT(1);
const T2 = TENANT(2);

const h = vi.hoisted(() => {
  return {
    accounts: [] as Array<Record<string, unknown>>,
    products: [] as Array<Record<string, unknown>>,
    ordersCreated: [] as Array<Record<string, unknown>>,
    rzpOrdersAll: vi.fn(),
    adapterCreateCheckout: vi.fn(),
    mockLogAction: vi.fn().mockResolvedValue(undefined),
    mockEventPublish: vi.fn().mockResolvedValue(undefined),
    mockCaptureError: vi.fn(),
    strategyId: "DIRECT_CREATOR",
    strategyStatus: "active",
    checkoutTenantId: null as string | null,
    session: null as { user?: { tenantId?: string; role?: string } } | null,
  };
});

const accountRow = (tenantId: string, overrides: Record<string, unknown> = {}) => ({
  id: `pa-${tenantId.slice(-4)}`,
  tenantId,
  provider: "razorpay",
  displayName: null,
  accountHolderName: null,
  merchantName: null,
  upiId: null,
  bankAccountName: null,
  bankAccountNumber: null,
  ifsc: null,
  settlementMode: "upi",
  status: "active",
  verificationStatus: "unverified",
  capabilities: {},
  providerKeyId: "enc(rzp_test_keyid)",
  providerKeySecret: "enc(super-secret-value)",
  lastVerifiedAt: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

vi.mock("razorpay", () => ({
  default: class {
    orders = { all: h.rzpOrdersAll };
    paymentLink = { create: h.adapterCreateCheckout };
  },
}));

vi.mock("@/lib/razorpay", () => ({ getRazorpayInstance: vi.fn(() => null) }));
vi.mock("next/headers", () => ({ headers: vi.fn(() => { throw new Error("no request scope"); }) }));
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 10, resetMs: 60_000 })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentAccount: {
      findUnique: vi.fn(({ where }: { where: { tenantId?: string } }) =>
        Promise.resolve(h.accounts.find((a) => a.tenantId === where.tenantId) ?? null)),
      updateMany: vi.fn(({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const row = h.accounts.find((a) => a.tenantId === where.tenantId);
        if (!row) return Promise.resolve({ count: 0 });
        if ("updatedAt" in where && where.updatedAt !== row.updatedAt) return Promise.resolve({ count: 0 });
        const not = (where.status as { not?: string } | undefined)?.not;
        if (not !== undefined && row.status === not) return Promise.resolve({ count: 0 });
        Object.assign(row, data);
        return Promise.resolve({ count: 1 });
      }),
      update: vi.fn(({ where, data }: { where: { tenantId: string }; data: Record<string, unknown> }) => {
        const row = h.accounts.find((a) => a.tenantId === where.tenantId);
        if (!row) return Promise.reject(new Error("not found"));
        Object.assign(row, data);
        return Promise.resolve({ ...row });
      }),
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `pa-new-${h.accounts.length + 1}`, ...data };
        h.accounts.push(row);
        return Promise.resolve(row);
      }),
      count: vi.fn(async () => h.accounts.length),
      groupBy: vi.fn(async () => []),
    },
    product: {
      findFirst: vi.fn(({ where }: { where: { id: string; tenantId: string } }) =>
        Promise.resolve(h.products.find((p) => p.id === where.id && p.tenantId === where.tenantId) ?? null)),
    },
    productOrder: {
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => {
        h.ordersCreated.push(data);
        return Promise.resolve({ id: `order-${h.ordersCreated.length}`, ...data });
      }),
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
    },
    billingEvent: { findUnique: vi.fn(async () => null), upsert: vi.fn(async () => ({})) },
    orderFulfillment: { updateMany: vi.fn(async () => ({})) },
    setting: { findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []) },
    workspace: { findUnique: vi.fn(async () => null) },
    tenant: { findFirst: vi.fn(async () => null), findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: (v: string) => `enc(${v})`,
  decrypt: (v: string) => (v.startsWith("enc(") ? v.slice(4, -1) : v),
}));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: h.mockCaptureError }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-auth", () => ({ getServerSession: async () => h.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/event-runtime", () => ({ runtimeEventBus: { publish: h.mockEventPublish } }));
vi.mock("@/modules/commerce-strategy", () => ({
  resolveCommerceStrategy: vi.fn(async () => ({
    id: h.strategyId,
    source: "tenant",
    definition: { id: h.strategyId, label: h.strategyId, status: h.strategyStatus },
    readiness: "ready",
    reason: null,
  })),
}));
vi.mock("@/modules/payment-account/providers/registry", async () => {
  const { RazorpayPaymentAdapter } = await import("@/modules/payment-account/providers/razorpay");
  return {
    getPaymentProviderAdapter: (id: string) => (id === "razorpay" ? new RazorpayPaymentAdapter() : null),
  };
});
// The public barrel is re-exported from the REAL application runtime so the
// checkout action exercises the genuine readiness engine against stubbed prisma.
vi.mock("@/modules/payment-account", async () => {
  const runtime = await import("@/modules/payment-account/application/runtime");
  const registry = await import("@/modules/payment-account/providers/registry");
  return {
    getPaymentAccount: runtime.getPaymentAccount,
    savePaymentAccount: runtime.savePaymentAccount,
    verifyPaymentAccount: runtime.verifyPaymentAccount,
    disconnectPaymentAccount: runtime.disconnectPaymentAccount,
    computePaymentReadiness: runtime.computePaymentReadiness,
    getPaymentHealth: runtime.getPaymentHealth,
    getPaymentProviderAdapter: registry.getPaymentProviderAdapter,
  };
});
// Storefront tenant authority is server-resolved — the client can never inject
// it. (The actual checkout.actions module is deliberately NOT evaluated here:
// parts of its dependency graph assume a Next request context.)
vi.mock("@/actions/checkout.actions", () => ({
  resolveCheckoutTenantId: vi.fn(async () => h.checkoutTenantId),
}));

import {
  computePaymentReadiness,
  verifyPaymentAccount,
} from "@/modules/payment-account/application/runtime";
import type { PaymentReadinessReport } from "@/modules/payment-account/domain/types";
import { RazorpayPaymentAdapter } from "@/modules/payment-account/providers/razorpay";
import { createDirectCheckout } from "@/actions/payment-account.actions";
import { createElement } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(() => cleanup());

beforeEach(() => {
  vi.clearAllMocks();
  h.accounts.length = 0;
  h.products.length = 0;
  h.ordersCreated.length = 0;
  h.rzpOrdersAll.mockReset().mockResolvedValue({ entity: "collection", count: 0, items: [] });
  // Razorpay paymentLink.create shape (the adapter reads id + short_url).
  h.adapterCreateCheckout.mockReset().mockResolvedValue({ id: "plink_1", short_url: "https://rzp.io/i/plink_1" });
  h.strategyId = "DIRECT_CREATOR";
  h.strategyStatus = "active";
  h.checkoutTenantId = T1;
  h.session = null;
});

/** Production defect shape: creator saved keys and verified them — nothing else. */
function pushKeysOnlyVerified(tenantId = T1) {
  const row = accountRow(tenantId, {
    verificationStatus: "verified",
    lastVerifiedAt: new Date(),
    providerKeyId: "enc(rzp_test_keyid)",
  });
  h.accounts.push(row);
  return row;
}

// ── A. Canonical readiness truth matrix ──────────────────────────────────────

describe("D.7.5 · canonical readiness — verified credentials are NOT sufficient", () => {
  it("Case 1 — verified keys-only account is NOT ready (identity + settlement missing)", async () => {
    pushKeysOnlyVerified();
    const r = await computePaymentReadiness(T1);
    expect(r.readiness).not.toBe("ready");
    expect(r.missing).toContain("Account holder identified");
    expect(r.missing).toContain("Settlement detail provided");
    const verification = r.requirements.find((q) => q.key === "verification");
    expect(verification?.met).toBe(true); // credentials ARE verified…
    expect(r.missing.length).toBeGreaterThan(0); // …and the account is STILL not ready
  });

  it("Case 1b — verified + holder but no settlement detail stays blocked from checkout", async () => {
    h.accounts.push(accountRow(T1, {
      verificationStatus: "verified",
      accountHolderName: "Creator One",
      settlementMode: "upi",
      upiId: null,
    }));
    const r = await computePaymentReadiness(T1);
    expect(r.readiness).toBe("warning");
    expect(r.missing).toEqual(["Settlement detail provided"]);
  });

  it("Case 2 — verified + holder + UPI settlement → READY", async () => {
    h.accounts.push(accountRow(T1, {
      verificationStatus: "verified",
      accountHolderName: "Creator One",
      upiId: "creator@upi",
    }));
    const r = await computePaymentReadiness(T1);
    expect(r.readiness).toBe("ready");
    expect(r.missing).toEqual([]);
  });

  it("Case 2b — bank settlement needs name + number + IFSC together", async () => {
    h.accounts.push(accountRow(T1, {
      verificationStatus: "verified",
      accountHolderName: "Creator One",
      settlementMode: "bank",
      bankAccountName: "Creator One",
      bankAccountNumber: "enc(1234)",
      ifsc: null, // missing IFSC keeps it incomplete
    }));
    const r = await computePaymentReadiness(T1);
    expect(r.readiness).toBe("warning");
    expect(r.missing).toContain("Settlement detail provided");

    Object.assign(h.accounts[0], { ifsc: "HDFC0001234" });
    const done = await computePaymentReadiness(T1);
    expect(done.readiness).toBe("ready");
  });

  it("Case 3 — unverified/pending/configured/failed credentials are never ready (fail-closed)", async () => {
    for (const vs of ["unverified", "pending", "configured", "failed"]) {
      h.accounts.length = 0;
      h.accounts.push(accountRow(T1, {
        verificationStatus: vs,
        accountHolderName: "Creator One",
        upiId: "creator@upi",
      }));
      const r = await computePaymentReadiness(T1);
      expect(r.readiness, `verificationStatus=${vs}`).not.toBe("ready");
      expect(r.missing).toContain("Provider credentials verified");
    }
  });

  it("Case 4 — readiness is per-server-tenant: another tenant's complete account never leaks in", async () => {
    h.accounts.push(
      accountRow(T1, { verificationStatus: "verified", accountHolderName: "Creator One", upiId: "creator@upi" }), // complete
      accountRow(T2, { verificationStatus: "pending" }), // incomplete
    );
    const t1 = await computePaymentReadiness(T1);
    const t2 = await computePaymentReadiness(T2);
    expect(t1.tenantId).toBe(T1);
    expect(t1.readiness).toBe("ready");
    expect(t2.tenantId).toBe(T2);
    expect(t2.readiness).not.toBe("ready"); // T1's completeness cannot satisfy T2
  });

  it("severity bands survive: at most 2 missing = warning, more = blocked", async () => {
    // 2 missing (identity + settlement) → warning
    h.accounts.push(accountRow(T1, { verificationStatus: "verified" }));
    const twoMissing = await computePaymentReadiness(T1);
    expect(twoMissing.missing.length).toBe(2);
    expect(twoMissing.readiness).toBe("warning");

    // 3+ missing (identity + settlement + verification) → blocked
    h.accounts.length = 0;
    h.accounts.push(accountRow(T1, { verificationStatus: "failed", status: "pending" }));
    const manyMissing = await computePaymentReadiness(T1);
    expect(manyMissing.missing.length).toBe(3);
    expect(manyMissing.readiness).toBe("blocked");
  });

  it("PLATFORM_COLLECT regression — platform strategy stays ready without a creator account", async () => {
    h.strategyId = "PLATFORM_COLLECT";
    const r = await computePaymentReadiness(T1); // no account row at all
    expect(r.readiness).toBe("ready");
    expect(r.strategy).toBe("PLATFORM_COLLECT");
  });
});

// ── B. The fix: verification carries the canonical readiness snapshot ────────

describe("D.7.5 · verifyPaymentAccount returns verified + canonical readiness", () => {
  it("successful probe answers verified=true AND the readiness report in ONE response", async () => {
    const row = pushKeysOnlyVerified();
    row.verificationStatus = "pending"; // pre-verify state
    const res = await verifyPaymentAccount(T1, "creator");

    expect(res.success).toBe(true);
    expect(res.verified).toBe(true);
    const report = (res as { readiness?: PaymentReadinessReport }).readiness;
    expect(report).toBeDefined();
    expect(report?.requirements.find((q) => q.key === "verification")?.met).toBe(true);
    expect(report?.readiness).not.toBe("ready"); // the production divergence, made visible
    expect(report?.missing).toContain("Account holder identified");
    expect(report?.missing).toContain("Settlement detail provided");

    const canonical = await computePaymentReadiness(T1);
    expect(report?.readiness).toBe(canonical.readiness);
    expect(report?.missing).toEqual(canonical.missing);
  });

  it("complete account verifies to readiness=ready in the same response", async () => {
    h.accounts.push(accountRow(T1, {
      verificationStatus: "pending",
      accountHolderName: "Creator One",
      upiId: "creator@upi",
    }));
    const res = await verifyPaymentAccount(T1, "creator");
    expect(res.success).toBe(true);
    expect((res as { readiness?: PaymentReadinessReport }).readiness?.readiness).toBe("ready");
  });

  it("failed verification carries no readiness payload (nothing to celebrate)", async () => {
    h.accounts.push(accountRow(T1));
    h.rzpOrdersAll.mockRejectedValue({ statusCode: 401 });
    const res = await verifyPaymentAccount(T1, "creator");
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
    expect((res as { readiness?: unknown }).readiness).toBeUndefined();
  });
});

// ── C. TEST/LIVE mode contract (mode-agnostic, presence-checked) ─────────────

describe("D.7.5 · TEST vs LIVE credential modes", () => {
  const adapter = new RazorpayPaymentAdapter();

  it("Case 5 — rzp_test_* pairs verify through the SAME authenticated-read probe", async () => {
    const r = await adapter.getAccountStatus({ providerKeyId: "rzp_test_k1", providerKeySecret: "s" });
    expect(r.classification).toBe("verified");
    expect(h.rzpOrdersAll).toHaveBeenCalledTimes(1);
  });

  it("Case 6 — rzp_live_* pairs take the identical path (no mode branching)", async () => {
    const r = await adapter.getAccountStatus({ providerKeyId: "rzp_live_k1", providerKeySecret: "s" });
    expect(r.classification).toBe("verified");
    expect(h.rzpOrdersAll).toHaveBeenCalledTimes(1);
  });

  it("non-Razorpay key ids fail closed WITHOUT a provider call (either mode)", async () => {
    for (const kid of ["sk_test_xyz", "live_key", ""]) {
      const r = await adapter.getAccountStatus({ providerKeyId: kid, providerKeySecret: "s" });
      expect(r.classification).toBe("credential_failed");
    }
    expect(h.rzpOrdersAll).not.toHaveBeenCalled();
  });
});

// ── D. Checkout boundary honors readiness ────────────────────────────────────

describe("D.7.5 · checkout respects canonical readiness (fail-closed)", () => {
  const product = { id: "prod-1", tenantId: T1, price: 499, isActive: true, status: "PUBLISHED", archivedAt: null, name: "Sticker Pack" };

  beforeEach(() => {
    h.products.length = 0;
    h.products.push(product);
  });

  it("Case 1 — verified-but-incomplete creator: checkout DENIED, zero side effects", async () => {
    pushKeysOnlyVerified();
    const r = await createDirectCheckout({ productId: "prod-1", customerEmail: "fan@example.com" });
    expect(r.success).toBe(false);
    expect(r.error).toBe("Creator payment account not ready");
    expect(h.adapterCreateCheckout).not.toHaveBeenCalled();
    expect(h.ordersCreated).toHaveLength(0);
  });

  it("Case 2 — fully ready creator: checkout ALLOWED and the order binds the historical account", async () => {
    h.accounts.push(accountRow(T1, {
      verificationStatus: "verified",
      accountHolderName: "Creator One",
      upiId: "creator@upi",
    }));
    const r = await createDirectCheckout({ productId: "prod-1", customerEmail: "fan@example.com" });
    expect(r.success).toBe(true);
    expect(r.checkoutUrl).toBe("https://rzp.io/i/plink_1");
    expect(h.adapterCreateCheckout).toHaveBeenCalledTimes(1);
    expect(h.ordersCreated).toHaveLength(1);
    expect(h.ordersCreated[0].commerceStrategy).toBe("DIRECT_CREATOR");
    expect(h.ordersCreated[0].paymentAccountId).toBe(h.accounts[0].id);
    expect(h.ordersCreated[0].tenantId).toBe(T1);
  });

  it("Case 3 — unverified creator: checkout DENIED", async () => {
    h.accounts.push(accountRow(T1, {
      verificationStatus: "unverified",
      accountHolderName: "Creator One",
      upiId: "creator@upi",
    }));
    const r = await createDirectCheckout({ productId: "prod-1" });
    expect(r.success).toBe(false);
    expect(r.error).toBe("Creator payment account not ready");
    expect(h.adapterCreateCheckout).not.toHaveBeenCalled();
  });

  it("Case 4 — checkout tenant is SERVER-authoritative: a cross-tenant product cannot be purchased", async () => {
    h.checkoutTenantId = T2; // storefront host resolved T2
    h.accounts.push(accountRow(T1, { verificationStatus: "verified", accountHolderName: "Creator One", upiId: "creator@upi" }));
    const r = await createDirectCheckout({ productId: "prod-1", customerEmail: "fan@example.com" }); // prod-1 belongs to T1
    expect(r.success).toBe(false);
    expect(r.error).toBe("Product not found");
    expect(h.adapterCreateCheckout).not.toHaveBeenCalled();
    expect(h.ordersCreated).toHaveLength(0);
  });

  it("defense-in-depth holds: a non-active DIRECT_CREATOR registration is refused before readiness", async () => {
    h.strategyStatus = "future";
    h.accounts.push(accountRow(T1, { verificationStatus: "verified", accountHolderName: "Creator One", upiId: "creator@upi" }));
    const r = await createDirectCheckout({ productId: "prod-1" });
    expect(r.success).toBe(false);
    expect(r.error).toBe("Direct creator checkout is not available yet.");
    expect(h.adapterCreateCheckout).not.toHaveBeenCalled();
  });
});

// ── E. Buyer-facing mapping (storefront never sees internal account state) ───

describe("D.7.5 · buyer-safe checkout failure category", () => {
  it("the DIRECT branch maps the readiness denial to PAYMENT_SETUP_REQUIRED with safe copy", () => {
    const src = readFileSync(join(ROOT, "src/actions/checkout.actions.ts"), "utf8");
    // Stable machine category + buyer-safe copy exist…
    expect(src).toContain('code: "PAYMENT_SETUP_REQUIRED"');
    expect(src).toContain("Payments for this store aren't available yet. Please contact the seller.");
    // …triggered by the canonical internal denial (fail-closed unchanged)…
    expect(src).toContain('direct.error === "Creator payment account not ready"');
    // …and CheckoutResult exposes the optional code for safe UI mapping.
    expect(src).toContain("code?: string");
    // The canonical readiness gate itself lives untouched in the direct action.
    const directAction = readFileSync(join(ROOT, "src/actions/payment-account.actions.ts"), "utf8");
    expect(directAction).toContain('readiness.strategy !== "DIRECT_CREATOR" || readiness.readiness !== "ready"');
    expect(directAction).toContain('error: "Creator payment account not ready"');
  });
});

// ── F. Creator UI states distinguish verified from ready ─────────────────────
// These render the REAL client component against the REAL server action and
// the REAL readiness runtime (prisma stubbed at the boundary) — the exact
// production stack, minus the network. createElement keeps the .ts suite
// JSX-free while still rendering through React's real renderer.

function serializeForUi() {
  const row = h.accounts.find((a) => a.tenantId === T1)!;
  return {
    id: row.id as string,
    tenantId: row.tenantId as string,
    provider: "razorpay" as const,
    displayName: null,
    accountHolderName: row.accountHolderName as string | null,
    merchantName: null,
    upiId: row.upiId as string | null,
    bankAccountName: null,
    hasBankAccountNumber: false,
    ifsc: null,
    settlementMode: "upi" as const,
    status: row.status as "active",
    verificationStatus: row.verificationStatus as "pending",
    capabilities: {},
    hasProviderKeys: true,
    lastVerifiedAt: null,
    createdAt: "",
    updatedAt: "",
  };
}

async function renderPaymentsClient() {
  const mod = await import("@/app/admin/payments/_components/payments-client");
  render(createElement(mod.PaymentsClient, { account: serializeForUi(), readiness: null }));
}

describe("D.7.5 · creator UI verification-vs-readiness contract", () => {
  it("incomplete account: verified message names the EXACT missing requirements (never 'ready')", async () => {
    // Production defect shape: keys saved + provider probe succeeds, but the
    // creator never completed identity/settlement.
    h.accounts.push(accountRow(T1, { verificationStatus: "pending" }));
    h.session = { user: { tenantId: T1, role: "CREATOR" } };

    await renderPaymentsClient();
    fireEvent.click(screen.getByText("Verify"));
    await screen.findByText(
      /Provider credentials verified\. Storefront payments stay unavailable until you complete: Account holder identified, Settlement detail provided\./,
    );
    expect(document.body.textContent).not.toContain("ready to accept storefront payments");
  });

  it("complete account: verified message states readiness explicitly", async () => {
    h.accounts.push(accountRow(T1, {
      verificationStatus: "pending",
      accountHolderName: "Creator One",
      upiId: "creator@upi",
    }));
    h.session = { user: { tenantId: T1, role: "CREATOR" } };

    await renderPaymentsClient();
    fireEvent.click(screen.getByText("Verify"));
    await screen.findByText(/ready to accept storefront payments/);
  });
});

// ── G. Security & hygiene ────────────────────────────────────────────────────

describe("D.7.5 · security and hygiene", () => {
  it("verification flow leaks no key ids/secrets into results, events, logs or captured errors", async () => {
    pushKeysOnlyVerified();
    const res = await verifyPaymentAccount(T1, "creator");
    const blobs = [
      JSON.stringify(res),
      JSON.stringify(h.mockEventPublish.mock.calls),
      JSON.stringify(h.mockLogAction.mock.calls),
      JSON.stringify(h.mockCaptureError.mock.calls),
    ].join("\n");
    expect(blobs).not.toContain("rzp_test_keyid");
    expect(blobs).not.toContain("super-secret-value");
    expect(blobs).not.toContain("providerKeySecret");
  });

  it("server actions deny anonymous callers (no session means no tenant means Unauthorized)", async () => {
    const actions = await import("@/actions/payment-account.actions");
    h.session = null;
    const mine = await actions.getMyPaymentAccount();
    expect(mine.ok).toBe(false);
    expect(mine.error).toBe("Unauthorized");
  });

  it("readiness labels stay stable — the UI contract depends on them", async () => {
    pushKeysOnlyVerified();
    const r = await computePaymentReadiness(T1);
    expect(r.missing).toEqual(["Account holder identified", "Settlement detail provided"]);
  });
});
