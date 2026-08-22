import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// RCCF-72.18D.6.3 — production configuration, operational readiness & creator
// migration gate.
//
//   A. Registry truth        — DIRECT_CREATOR stays "future"; PLATFORM_COLLECT
//                              stays "active" (real registry, no mocks).
//   B. Migration matrix      — legacy `configured` creators and every other
//                              non-verified state are DENIED readiness; only
//                              provider-`verified` passes (real runtime).
//   C. ACTIVATION SIMULATION — with a fully-verified account and strategy still
//                              `future`: readiness reports eligible BUT
//                              createDirectCheckout refuses. With fixtures
//                              simulating the future D.6.5 flip (`active`),
//                              the SAME verified-ready state flows through —
//                              proving the boundary becomes operational on
//                              flip without bypassing readiness. No registry
//                              source change anywhere.
//   D. Configuration surface — .env.example documents every payment variable;
//                              webhook route keeps its fail-closed contract.
// ─────────────────────────────────────────────────────────────────────────────

const TENANT = (n: number) => `eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12, "0")}`;

const h = vi.hoisted(() => {
  return {
    accounts: [] as Array<Record<string, unknown>>,
    rzpOrdersAll: vi.fn(),
    mockAccountFindUnique: vi.fn(),
    mockAccountUpdateMany: vi.fn(),
    mockAccountUpdate: vi.fn(),
    mockAccountCreate: vi.fn(),
    mockDecrypt: vi.fn((v: unknown) => v),
    mockLogAction: vi.fn().mockResolvedValue(undefined),
    mockEventPublish: vi.fn().mockResolvedValue(undefined),
    mockCaptureError: vi.fn(),
    strategyId: "DIRECT_CREATOR",
    strategyStatus: "future",
    // action-simulation controls
    session: null as { user?: { id?: string; tenantId?: string; role?: string } } | null,
    actionStrategy: { id: "DIRECT_CREATOR", definition: { status: "future" } },
    actionReadiness: null as Record<string, unknown> | null,
    mockActionAdapterCreate: vi.fn(),
  };
});

vi.mock("razorpay", () => ({
  default: class {
    orders = { all: h.rzpOrdersAll };
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentAccount: {
      findUnique: h.mockAccountFindUnique,
      updateMany: h.mockAccountUpdateMany,
      update: h.mockAccountUpdate,
      create: h.mockAccountCreate,
    },
    product: {
      findFirst: vi.fn().mockResolvedValue({
        id: "product-sim", tenantId: "eeeeeeee-eeee-4eee-8eee-000000000001", price: 1000, name: "Sim Product",
        isActive: true, status: "PUBLISHED", archivedAt: null,
      }),
    },
    productOrder: { create: vi.fn().mockResolvedValue({ id: "sim-order" }) },
  },
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: (v: string) => v,
  decrypt: h.mockDecrypt,
}));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: h.mockCaptureError }));
vi.mock("@/modules/event-runtime", () => ({
  runtimeEventBus: { publish: h.mockEventPublish },
}));

// Real application runtime under test (readiness + verification lifecycle).
vi.mock("@/modules/commerce-strategy", () => ({
  resolveCommerceStrategy: async () => ({
    id: h.strategyId,
    definition: { id: h.strategyId, status: h.strategyStatus },
  }),
}));
vi.mock("@/modules/payment-account/providers/registry", async () => {
  const { RazorpayPaymentAdapter } = await import("@/modules/payment-account/providers/razorpay");
  return {
    getPaymentProviderAdapter: (id: string) => (id === "razorpay" ? new RazorpayPaymentAdapter() : null),
  };
});

// Server-action layer under test (activation boundary).
vi.mock("next-auth", () => ({ getServerSession: async () => h.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/actions/checkout.actions", () => ({
  resolveCheckoutTenantId: vi.fn().mockResolvedValue(TENANT(1)),
}));
vi.mock("@/modules/payment-account", () => ({
  getPaymentAccount: vi.fn().mockResolvedValue(null),
  savePaymentAccount: vi.fn(),
  verifyPaymentAccount: vi.fn(),
  disconnectPaymentAccount: vi.fn(),
  getPaymentHealth: vi.fn(),
  computePaymentReadiness: vi.fn(() => Promise.resolve(h.actionReadiness)),
  getPaymentProviderAdapter: vi.fn().mockReturnValue({
    id: "razorpay",
    createCheckout: h.mockActionAdapterCreate,
  }),
}));

import {
  computePaymentReadiness,
} from "@/modules/payment-account/application/runtime";
import { createDirectCheckout } from "@/actions/payment-account.actions";
import { COMMERCE_STRATEGY_REGISTRY, COMMERCE_STRATEGY_BY_ID } from "@/modules/commerce-strategy/application/registry";

function pushAccount(overrides: Record<string, unknown> = {}) {
  const row = {
    id: `pa-${h.accounts.length + 1}`,
    tenantId: TENANT(1),
    provider: "razorpay",
    displayName: null, accountHolderName: "Creator One", merchantName: null,
    upiId: "creator@upi", bankAccountName: null, bankAccountNumber: null, ifsc: null,
    settlementMode: "upi", status: "active", verificationStatus: "configured",
    capabilities: {}, providerKeyId: "rzp_live_key", providerKeySecret: "rzp_live_secret",
    lastVerifiedAt: null, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
  h.accounts.length = 0;
  h.accounts.push(row);
  return row;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.accounts.length = 0;
  h.strategyId = "DIRECT_CREATOR";
  h.strategyStatus = "future";
  h.session = null;
  h.actionStrategy = { id: "DIRECT_CREATOR", definition: { status: "future" } };
  h.rzpOrdersAll.mockResolvedValue({ entity: "collection", count: 0, items: [] });
  h.mockActionAdapterCreate.mockReset();
  h.mockActionAdapterCreate.mockResolvedValue({
    success: true,
    checkoutUrl: "https://rzp.io/i/sim-flip",
    providerReference: "plink_sim_flip",
  });
  h.mockAccountFindUnique.mockImplementation(({ where }: { where: { tenantId: string } }) =>
    Promise.resolve(h.accounts.find((a) => a.tenantId === where.tenantId) ?? null),
  );
  h.mockAccountUpdateMany.mockImplementation(({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
    const row = h.accounts.find((a) => a.tenantId === where.tenantId);
    if (!row) return Promise.resolve({ count: 0 });
    if ("updatedAt" in where && where.updatedAt !== row.updatedAt) return Promise.resolve({ count: 0 });
    Object.assign(row, data);
    return Promise.resolve({ count: 1 });
  });
  h.mockAccountUpdate.mockImplementation(({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
    const row = h.accounts.find((a) => a.tenantId === (where as { tenantId: string }).tenantId);
    if (!row) return Promise.reject(new Error("Record not found"));
    Object.assign(row, data);
    return Promise.resolve({ ...row });
  });
  h.mockAccountCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: "pa-new", ...data }),
  );
});

// ── A. Registry truth (canonical activation state) ──────────────────────────

describe("RCCF-72.18D.6.3 — registry truth", () => {
  it("DIRECT_CREATOR reaches its authorized activated state (D.6.5 flip)", () => {
    // RCCF-72.18D.6.5 modernized this guardrail: `future` gated pre-activation
    // (proven by earlier revisions of this suite); the authorized D.6.5 flip
    // makes `active` the canonical expectation. PLATFORM_COLLECT unchanged.
    expect(COMMERCE_STRATEGY_BY_ID["DIRECT_CREATOR"].status).toBe("active");
    expect(COMMERCE_STRATEGY_REGISTRY.find((s) => s.id === "DIRECT_CREATOR")?.status).toBe("active");
  });

  it("PLATFORM_COLLECT remains `active` (untouched)", () => {
    expect(COMMERCE_STRATEGY_BY_ID["PLATFORM_COLLECT"].status).toBe("active");
  });
});

// ── B. Existing-creator migration matrix (real runtime readiness) ───────────

describe("RCCF-72.18D.6.3 — existing-creator migration matrix", () => {
  it.each([
    ["no account", null],
    ["unverified", "unverified"],
    ["pending", "pending"],
    ["legacy configured (pre-D.6.2 data)", "configured"],
    ["failed", "failed"],
  ])("%s → DENY", async (_label, state) => {
    if (state === null) {
      h.accounts.length = 0;
    } else {
      pushAccount({ tenantId: TENANT(2), verificationStatus: state as string });
    }
    const r = await computePaymentReadiness(TENANT(2));
    expect(r.readiness).not.toBe("ready");
    expect(r.missing).toContain("Provider credentials verified");
  });

  it("verified + all other prerequisites → ALLOW (eligible)", async () => {
    pushAccount({ tenantId: TENANT(3), verificationStatus: "verified", lastVerifiedAt: new Date() });
    const r = await computePaymentReadiness(TENANT(3));
    expect(r.readiness).toBe("ready");
    expect(r.missing).toHaveLength(0);
  });

  it("legacy configured creator migrates safely: explicit verify → verified", async () => {
    const row = pushAccount({ tenantId: TENANT(4), verificationStatus: "configured" });

    const { verifyPaymentAccount } = await import("@/modules/payment-account/application/runtime");
    const res = await verifyPaymentAccount(row.tenantId as string, "creator");

    expect(res.success).toBe(true);
    expect(res.verified).toBe(true);
    expect(row.verificationStatus).toBe("verified");
    const r = await computePaymentReadiness(row.tenantId as string);
    expect(r.readiness).toBe("ready");
  });

  it("credential rotation after verification → pending → DENY until re-verified", async () => {
    const row = pushAccount({ tenantId: TENANT(5), verificationStatus: "verified", lastVerifiedAt: new Date() });

    const { savePaymentAccount } = await import("@/modules/payment-account/application/runtime");
    await savePaymentAccount(row.tenantId as string, { providerKeyId: "rzp_live_rotated", providerKeySecret: "rotated-secret" }, "creator");

    expect(row.verificationStatus).toBe("pending");
    const r = await computePaymentReadiness(row.tenantId as string);
    expect(r.readiness).not.toBe("ready");
  });

  it("disconnect → non-ready", async () => {
    const row = pushAccount({ tenantId: TENANT(6), verificationStatus: "verified" });

    const { disconnectPaymentAccount } = await import("@/modules/payment-account/application/runtime");
    await disconnectPaymentAccount(row.tenantId as string, "creator");

    const r = await computePaymentReadiness(row.tenantId as string);
    expect(r.readiness).not.toBe("ready");
  });
});

// ── C. Activation simulation WITHOUT activation ─────────────────────────────

describe("RCCF-72.18D.6.3 — activation boundary simulation (fixtures only)", () => {
  it("fully VERIFIED creator + strategy `future`: readiness ELIGIBLE but checkout REFUSES", async () => {
    pushAccount({ tenantId: TENANT(1), verificationStatus: "verified", lastVerifiedAt: new Date() });

    // Eligibility (per-tenant readiness) says ready…
    const readiness = await computePaymentReadiness(TENANT(1));
    expect(readiness.readiness).toBe("ready");

    // …action-layer fixture mirrors that full eligibility…
    h.session = { user: { id: "u1", tenantId: TENANT(1), role: "ADMIN" } };
    h.actionReadiness = {
      tenantId: TENANT(1), readiness: "ready", strategy: "DIRECT_CREATOR",
      provider: "razorpay", requirements: [], missing: [],
    };

    // …but the actual checkout boundary is closed by the registry status.
    const res = await createDirectCheckout({ productId: "product-sim", customerEmail: "buyer@example.com" });
    expect(res.success).toBe(false);
    expect(res.checkoutUrl).toBeUndefined();
    expect(res.error).toContain("not available yet");
  });

  it("SIMULATED D.6.5 flip (fixture only): the same verified-ready state becomes operational", async () => {
    pushAccount({ tenantId: TENANT(1), verificationStatus: "verified", lastVerifiedAt: new Date() });

    // Fixture simulation of what D.6.5 will authorize at the STRATEGY layer.
    // The registry SOURCE is never modified (asserted in section A).
    h.strategyStatus = "active";
    h.actionReadiness = {
      tenantId: TENANT(1), readiness: "ready", strategy: "DIRECT_CREATOR",
      provider: "razorpay", requirements: [], missing: [],
    };

    const res = await createDirectCheckout({ productId: "product-sim", customerEmail: "buyer@example.com" });

    expect(res.success).toBe(true);
    expect(res.checkoutUrl).toBeTruthy();
  });

  it("SIMULATED flip with UNVERIFIED creator: still refuses (readiness cannot be bypassed by status alone)", async () => {
    pushAccount({ tenantId: TENANT(1), verificationStatus: "configured" }); // legacy, unverified

    h.strategyStatus = "active"; // simulated flip
    h.actionReadiness = {
      tenantId: TENANT(1), readiness: "blocked", strategy: "DIRECT_CREATOR",
      provider: "razorpay",
      requirements: [{ key: "verification", label: "Provider credentials verified", met: false, severity: "required" }],
      missing: ["Provider credentials verified"],
    };

    const res = await createDirectCheckout({ productId: "product-sim", customerEmail: "buyer@example.com" });

    expect(res.success).toBe(false);
    expect(res.error).toContain("not ready");
  });

  it("PLATFORM_COLLECT readiness behaves exactly as before (ready regardless of creator account)", async () => {
    h.strategyId = "PLATFORM_COLLECT";
    h.accounts.length = 0; // no creator account at all
    const r = await computePaymentReadiness(TENANT(7));
    expect(r.readiness).toBe("ready"); // platform flow never depends on creator verification
  });
});

// ── D. Configuration surface & webhook operational contract ─────────────────

describe("RCCF-72.18D.6.3 — configuration surface (source-token guardrails)", () => {
  const repoRoot = resolve(__dirname, "..", "..");
  const readRepo = (p: string) => readFileSync(resolve(repoRoot, p), "utf8");

  it(".env.example documents EVERY required payment variable (placeholders only)", () => {
    const env = readRepo(".env.example");
    expect(env).toContain("RAZORPAY_KEY_ID=");
    expect(env).toContain("RAZORPAY_KEY_SECRET=");
    expect(env).toContain("NEXT_PUBLIC_RAZORPAY_KEY_ID=");
    expect(env).toContain("RAZORPAY_WEBHOOK_SECRET=");
    expect(env).toContain("TOKEN_ENCRYPTION_KEY=");
    // No real credentials ever enter the template (placeholders are x-masks;
    // real Razorpay keys contain digits).
    expect(env).not.toMatch(/rzp_live_[a-zA-Z0-9]*[0-9]/);
    expect(env).not.toMatch(/whsec_[a-zA-Z0-9]*[0-9]/);
  });

  it("webhook route keeps the fail-closed operational contract", () => {
    const route = readRepo("src/app/api/webhooks/razorpay/route.ts");
    expect(route).toContain("RAZORPAY_WEBHOOK_SECRET");
    expect(route).toContain('status: 500'); // missing secret fails closed
    expect(route).toContain("timingSafeEqual");
    expect(route).toContain('"payment.captured"');
    expect(route).toContain('"payment.failed"');
    expect(route).toContain('"refund.processed"');
    expect(route).toContain('"refund.failed"');
  });

  it("no code path writes the legacy `configured` verification state anymore", () => {
    const runtime = readRepo("src/modules/payment-account/application/runtime.ts");
    expect(runtime).not.toMatch(/verificationStatus:\s*"configured"/);
    // The canonical write targets remain explicit.
    expect(runtime).toMatch(/verificationStatus:\s*"verified"/);
    expect(runtime).toMatch(/verificationStatus:\s*"failed"/);
  });
});
