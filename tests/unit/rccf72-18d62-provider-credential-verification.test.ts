import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// RCCF-72.18D.6.2 — DIRECT_CREATOR provider credential verification &
// production-safe activation gate.
//
// Real code under test: RazorpayPaymentAdapter.getAccountStatus (real probe
// logic; razorpay SDK stubbed at the module boundary — NO network),
// verifyPaymentAccount/savePaymentAccount/disconnectPaymentAccount/
// computePaymentReadiness (real application runtime; prisma stubbed),
// verifyMyPaymentAccount (real server action; session stubbed).
//
// Matrix:
//   A. Adapter failure classification — verified / credential_failed(401,403,
//      missing,malformed-kid) / transient(429,500,network-timeout) /
//      unknown(malformed body).
//   B. Lifecycle — configured→verified persists evidence (+lastVerifiedAt);
//      permanent rejection → failed; TRANSIENT outage writes NOTHING (never
//      destroys a valid verified); decrypt failure mutates nothing;
//      credential replacement invalidates to pending; disconnect removes
//      readiness; stale-result concurrency guard on updatedAt.
//   C. Activation safety (per-tenant, fail-closed) — only `verified` satisfies
//      the DIRECT_CREATOR verification requirement; configured/pending/failed/
//      unverified/no-account stay blocked; PLATFORM_COLLECT untouched; a
//      foreign tenant's verified account cannot satisfy readiness.
//   D. Security & authorization — anonymous/agency/support/read-only denied;
//      SUPER_ADMIN has no implicit tenant (documented boundary); zero secret
//      material in results, logs, events or errors.
// ─────────────────────────────────────────────────────────────────────────────

const TENANT = (n: number) => `dddddddd-dddd-4ddd-8ddd-${String(n).padStart(12, "0")}`;

const h = vi.hoisted(() => {
  return {
    accounts: [] as Array<Record<string, unknown>>,
    rzpOrdersAll: vi.fn(),
    mockAccountFindUnique: vi.fn(),
    mockAccountUpdateMany: vi.fn(),
    mockAccountUpdate: vi.fn(),
    mockAccountCreate: vi.fn(),
    mockOrderUpdate: vi.fn(),
    mockDecrypt: vi.fn((v: unknown) => v),
    mockLogAction: vi.fn().mockResolvedValue(undefined),
    mockEventPublish: vi.fn().mockResolvedValue(undefined),
    mockCaptureError: vi.fn(),
    strategy: { id: "DIRECT_CREATOR" },
    session: null as { user?: { id?: string; tenantId?: string; role?: string } } | null,
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
    productOrder: { update: h.mockOrderUpdate },
  },
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: (v: string) => `enc(${v})`,
  decrypt: h.mockDecrypt,
}));

vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: h.mockCaptureError }));
vi.mock("@/modules/event-runtime", () => ({
  runtimeEventBus: { publish: h.mockEventPublish },
}));
vi.mock("@/modules/commerce-strategy", () => ({
  resolveCommerceStrategy: async () => ({ id: h.strategy.id }),
}));
vi.mock("@/modules/payment-account/providers/registry", async () => {
  const { RazorpayPaymentAdapter } = await import("@/modules/payment-account/providers/razorpay");
  return {
    getPaymentProviderAdapter: (id: string) => (id === "razorpay" ? new RazorpayPaymentAdapter() : null),
  };
});
vi.mock("next-auth", () => ({ getServerSession: async () => h.session }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  verifyPaymentAccount,
  savePaymentAccount,
  disconnectPaymentAccount,
  computePaymentReadiness,
} from "@/modules/payment-account/application/runtime";
import { verifyMyPaymentAccount } from "@/actions/payment-account.actions";
import { RazorpayPaymentAdapter } from "@/modules/payment-account/providers/razorpay";

function pushAccount(overrides: Record<string, unknown> = {}) {
  const row = {
    id: `pa-${h.accounts.length + 1}`,
    tenantId: TENANT(1),
    provider: "razorpay",
    displayName: null,
    accountHolderName: "Creator One",
    merchantName: null,
    upiId: "creator@upi",
    bankAccountName: null,
    bankAccountNumber: null,
    ifsc: null,
    settlementMode: "upi",
    status: "active",
    verificationStatus: "configured",
    capabilities: {},
    providerKeyId: "rzp_live_key",
    providerKeySecret: "rzp_live_secret",
    lastVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  h.accounts.length = 0;
  h.accounts.push(row);
  return row;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.accounts.length = 0;
  h.strategy = { id: "DIRECT_CREATOR" };
  h.session = null;
  h.mockDecrypt.mockImplementation((v: unknown) => v);
  h.mockAccountFindUnique.mockImplementation(({ where }: { where: { tenantId: string } }) =>
    Promise.resolve(h.accounts.find((a) => a.tenantId === where.tenantId) ?? null),
  );
  // Emulates the optimistic-concurrency predicate: only applies when updatedAt
  // matches the row the caller read.
  h.mockAccountUpdateMany.mockImplementation(({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
    const row = h.accounts.find((a) => a.tenantId === where.tenantId);
    if (!row) return Promise.resolve({ count: 0 });
    if ("updatedAt" in where && where.updatedAt !== row.updatedAt) return Promise.resolve({ count: 0 });
    if (where.status !== undefined) {
      const not = (where.status as { not?: string }).not;
      if (not !== undefined && row.status === not) return Promise.resolve({ count: 0 });
    }
    Object.assign(row, data);
    return Promise.resolve({ count: 1 });
  });
  h.mockAccountCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: `pa-new-${h.accounts.length + 1}`, ...data }),
  );
  h.mockAccountUpdate.mockImplementation(({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
    const row = h.accounts.find((a) => a.tenantId === (where as { tenantId: string }).tenantId);
    if (!row) return Promise.reject(new Error("Record not found"));
    Object.assign(row, data);
    return Promise.resolve({ ...row });
  });
  h.rzpOrdersAll.mockResolvedValue({ entity: "collection", count: 0, items: [] });
});

// ── A. Adapter failure-classification matrix ────────────────────────────────

describe("RCCF-72.18D.6.2 — Razorpay adapter verification matrix", () => {
  const adapter = new RazorpayPaymentAdapter();

  it("valid credentials → VERIFIED (single authenticated read-only call)", async () => {
    const r = await adapter.getAccountStatus({ providerKeyId: "rzp_live_k", providerKeySecret: "s" });
    expect(r.classification).toBe("verified");
    expect(r.verified).toBe(true);
    expect(h.rzpOrdersAll).toHaveBeenCalledTimes(1);
    expect(h.rzpOrdersAll).toHaveBeenCalledWith({ count: 1 });
  });

  it.each([
    ["invalid key id (401)", { statusCode: 401 }],
    ["wrong/revoked pair (401)", { statusCode: 401 }],
    ["disabled/rejected (403)", { statusCode: 403 }],
  ])("%s → PERMANENT credential_failed", async (_label, err) => {
    h.rzpOrdersAll.mockRejectedValue(err);
    const r = await adapter.getAccountStatus({ providerKeyId: "rzp_live_k", providerKeySecret: "bad" });
    expect(r.classification).toBe("credential_failed");
    expect(r.verified).toBe(false);
  });

  it.each([
    ["rate limited (429)", { statusCode: 429 }],
    ["provider 500", { statusCode: 500 }],
    ["provider 503", { statusCode: 503 }],
    ["network timeout", new Error("network timeout while calling provider")],
    ["connection reset", new Error("ECONNRESET")],
  ])("%s → TRANSIENT (never a credential verdict)", async (_label, err) => {
    h.rzpOrdersAll.mockRejectedValue(err);
    const r = await adapter.getAccountStatus({ providerKeyId: "rzp_live_k", providerKeySecret: "s" });
    expect(r.classification).toBe("transient");
    expect(r.verified).toBe(false);
  });

  it("malformed 200 response → UNKNOWN (proves nothing)", async () => {
    h.rzpOrdersAll.mockResolvedValue({ totally: "unexpected" });
    const r = await adapter.getAccountStatus({ providerKeyId: "rzp_live_k", providerKeySecret: "s" });
    expect(r.classification).toBe("unknown");
  });

  it("missing/malformed local keys → credential_failed WITHOUT any provider call", async () => {
    expect((await adapter.getAccountStatus({ providerKeyId: null, providerKeySecret: null })).classification).toBe("credential_failed");
    expect((await adapter.getAccountStatus({ providerKeyId: "oops", providerKeySecret: "s" })).classification).toBe("credential_failed");
    expect(h.rzpOrdersAll).not.toHaveBeenCalled();
  });
});

// ── B. Verification lifecycle (application runtime) ─────────────────────────

describe("RCCF-72.18D.6.2 — verification lifecycle", () => {
  it("successful probe persists `verified` + lastVerifiedAt with the concurrency guard", async () => {
    const row = pushAccount({ verificationStatus: "pending" });
    const res = await verifyPaymentAccount(row.tenantId as string, "creator");

    expect(res.success).toBe(true);
    expect(res.verified).toBe(true);
    expect(h.mockAccountUpdateMany).toHaveBeenCalledTimes(1);
    const args = h.mockAccountUpdateMany.mock.calls[0][0] as { where: Record<string, unknown>; data: Record<string, unknown> };
    expect(args.where.updatedAt).toBe(row.updatedAt); // version guard present
    expect(args.data.verificationStatus).toBe("verified");
    expect(args.data.lastVerifiedAt).toBeInstanceOf(Date);
    expect(args.data.status).toBe("active");
  });

  it("permanent credential rejection persists `failed`", async () => {
    const row = pushAccount({ verificationStatus: "pending" });
    h.rzpOrdersAll.mockRejectedValue({ statusCode: 401 });

    const res = await verifyPaymentAccount(row.tenantId as string, "creator");

    expect(res.success).toBe(false);
    expect(res.error).toContain("rejected");
    const data = h.mockAccountUpdateMany.mock.calls[0][0].data as Record<string, unknown>;
    expect(data.verificationStatus).toBe("failed");
  });

  it("TRANSIENT outage writes NOTHING and preserves a previously verified state", async () => {
    const row = pushAccount({ verificationStatus: "verified", lastVerifiedAt: new Date() });
    h.rzpOrdersAll.mockRejectedValue({ statusCode: 500 });

    const res = await verifyPaymentAccount(row.tenantId as string, "creator");

    expect(res.success).toBe(false);
    expect(res.error).toContain("temporarily unavailable");
    expect(h.mockAccountUpdateMany).not.toHaveBeenCalled();
    expect(row.verificationStatus).toBe("verified"); // NOT destroyed
  });

  it("unknown provider answer writes NOTHING and captures diagnostics", async () => {
    const row = pushAccount();
    h.rzpOrdersAll.mockResolvedValue({ garbage: true });

    const res = await verifyPaymentAccount(row.tenantId as string, "creator");

    expect(res.success).toBe(false);
    expect(h.mockAccountUpdateMany).not.toHaveBeenCalled();
    expect(h.mockCaptureError).toHaveBeenCalled();
  });

  it("decrypt failure is OUR storage problem — mutates nothing, leaks nothing", async () => {
    const row = pushAccount({ verificationStatus: "pending" });
    h.mockDecrypt.mockImplementation(() => { throw new Error("decipher error: bad auth tag"); });

    const res = await verifyPaymentAccount(row.tenantId as string, "creator");

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/re-save/i);
    expect(h.mockAccountUpdateMany).not.toHaveBeenCalled();
    expect(h.rzpOrdersAll).not.toHaveBeenCalled();
    // The raw internal error text must never reach the client result.
    expect(JSON.stringify(res)).not.toContain("auth tag");
  });

  it("STALE result cannot attach when credentials rotated during the probe", async () => {
    const row = pushAccount({ verificationStatus: "pending" });
    // Simulate a concurrent key save moving updatedAt AFTER the runtime read.
    h.rzpOrdersAll.mockImplementation(async () => {
      row.updatedAt = new Date(Date.now() + 5_000);
      return { entity: "collection", count: 0, items: [] };
    });

    const res = await verifyPaymentAccount(row.tenantId as string, "creator");

    expect(res.success).toBe(false);
    expect(res.error).toContain("changed during verification");
    expect(row.verificationStatus).toBe("pending"); // rotation invalidated it; stale proof discarded
  });

  it("a DISCONNECTED account is never resurrected to verified", async () => {
    const row = pushAccount({ status: "disconnected", verificationStatus: "unverified" });

    const res = await verifyPaymentAccount(row.tenantId as string, "creator");

    expect(res.success).toBe(false);
    expect(row.status).toBe("disconnected");
    expect(row.verificationStatus).toBe("unverified");
  });

  it("saving NEW keys invalidates a previous verification (re-verify required)", async () => {
    const row = pushAccount({ verificationStatus: "verified", lastVerifiedAt: new Date() });

    const res = await savePaymentAccount(
      row.tenantId as string,
      { providerKeyId: "rzp_live_new", providerKeySecret: "brand-new-secret" },
      "creator",
    );

    expect(res.success).toBe(true);
    // D.6.2 lifecycle: credential replacement ALWAYS demotes to pending —
    // the old `verified` proof must never survive a key rotation.
    expect(row.verificationStatus).toBe("pending");
    // Historical orders are untouched by an account save (D.2 binding intact).
    expect(h.mockOrderUpdate).not.toHaveBeenCalled();
  });

  it("disconnect removes readiness state (status disconnected, verification unverified)", async () => {
    const row = pushAccount({ verificationStatus: "verified" });

    const res = await disconnectPaymentAccount(row.tenantId as string, "creator");

    expect(res.success).toBe(true);
    expect(row.status).toBe("disconnected");
    expect(row.verificationStatus).toBe("unverified");
  });
});

// ── C. Activation safety — per-tenant, fail-closed readiness ────────────────

describe("RCCF-72.18D.6.2 — activation gate (readiness)", () => {
  async function readyFor(tenantId: string) {
    return computePaymentReadiness(tenantId);
  }

  it("VERIFIED account satisfies every requirement → readiness ready", async () => {
    pushAccount({ tenantId: TENANT(11), verificationStatus: "verified", lastVerifiedAt: new Date() });
    const r = await readyFor(TENANT(11));
    expect(r.readiness).toBe("ready");
    expect(r.missing).toHaveLength(0);
  });

  it.each(["configured", "pending", "failed", "unverified"])(
    "account with verificationStatus=%s stays BLOCKED (fail-closed)",
    async (state) => {
      pushAccount({ tenantId: TENANT(20), verificationStatus: state });
      const r = await readyFor(TENANT(20));
      expect(r.missing).toContain("Provider credentials verified");
      expect(r.readiness).not.toBe("ready");
    },
  );

  it("NO PaymentAccount → blocked", async () => {
    h.strategy = { id: "DIRECT_CREATOR" };
    const r = await readyFor(TENANT(30));
    expect(r.readiness).not.toBe("ready");
  });

  it("PLATFORM_COLLECT readiness is UNTOUCHED (ready regardless of creator account)", async () => {
    h.strategy = { id: "PLATFORM_COLLECT" };
    const r = await readyFor(TENANT(31));
    expect(r.readiness).toBe("ready");
    h.strategy = { id: "DIRECT_CREATOR" };
  });

  it("another tenant's VERIFIED account cannot satisfy this tenant's readiness", async () => {
    pushAccount({ tenantId: TENANT(41), verificationStatus: "verified" }); // B verified
    pushAccount({ tenantId: TENANT(42), verificationStatus: "configured" }); // A configured-only
    const a = await readyFor(TENANT(42));
    expect(a.missing).toContain("Provider credentials verified");
    expect(a.readiness).not.toBe("ready");
  });
});

// ── D. Security & authorization ─────────────────────────────────────────────

describe("RCCF-72.18D.6.2 — security & authorization", () => {
  it("anonymous user is denied", async () => {
    h.session = null;
    const res = await verifyMyPaymentAccount();
    expect(res.success).toBe(false);
    expect(res.error).toBe("Unauthorized");
  });

  it.each([
    ["AGENCY_ADMIN", "AGENCY_ADMIN"],
    ["AGENCY_STAFF", "AGENCY_STAFF"],
    ["SUPPORT", "SUPPORT"],
    ["READ_ONLY", "READ_ONLY"],
  ])("%s role is denied", async (_label, role) => {
    h.session = { user: { id: "u", tenantId: TENANT(50), role } };
    const res = await verifyMyPaymentAccount();
    expect(res.success).toBe(false);
    expect(res.error).toBe("Unauthorized");
  });

  it("SUPER_ADMIN without a tenant context is denied (ownership boundary unchanged)", async () => {
    h.session = { user: { id: "sa", role: "SUPER_ADMIN" } };
    const res = await verifyMyPaymentAccount();
    expect(res.success).toBe(false);
    expect(res.error).toBe("Unauthorized");
  });

  it("creator A can NEVER verify creator B's account", async () => {
    h.session = { user: { id: "uA", tenantId: TENANT(60), role: "ADMIN" } };
    pushAccount({ tenantId: TENANT(61), verificationStatus: "pending" }); // B's row

    const res = await verifyMyPaymentAccount();

    expect(res.success).toBe(false);
    expect(res.error).toBe("No payment account"); // looked up OWN (absent) row only
    expect(h.rzpOrdersAll).not.toHaveBeenCalled();
  });

  it("no secret material ever appears in results, audit payloads, events or errors", async () => {
    const row = pushAccount({ verificationStatus: "pending" });
    h.session = { user: { id: "u", tenantId: TENANT(1), role: "ADMIN" } };

    const res = await verifyMyPaymentAccount();

    expect(res.success).toBe(true);
    const surfaces = [
      JSON.stringify(res),
      JSON.stringify(h.mockLogAction.mock.calls),
      JSON.stringify(h.mockEventPublish.mock.calls),
      JSON.stringify(h.mockCaptureError.mock.calls),
    ];
    for (const s of surfaces) {
      expect(s).not.toContain("rzp_live_secret");
      expect(s).not.toContain("enc(rzp_live_secret)");
      expect(s).not.toContain("rzp_live_key");
    }
    void row;
  });
});

// ── E. Performance shape ────────────────────────────────────────────────────

describe("RCCF-72.18D.6.2 — measurement", () => {
  it("one verification = exactly ONE provider call + reads bounded to account+readiness + 1 guarded write", async () => {
    const row = pushAccount({ verificationStatus: "pending" });

    await verifyPaymentAccount(row.tenantId as string, "creator");

    expect(h.rzpOrdersAll).toHaveBeenCalledTimes(1);
    // RCCF-72.18D.7.5: a successful verification now ALSO returns the canonical
    // readiness snapshot (computePaymentReadiness re-reads the row — still one
    // provider call, still exactly ONE guarded write; the extra read is an
    // indexed single-row fetch, request-cached, never a provider call).
    expect(h.mockAccountFindUnique).toHaveBeenCalledTimes(2);
    expect(h.mockAccountUpdateMany).toHaveBeenCalledTimes(1);
    expect(h.mockOrderUpdate).not.toHaveBeenCalled(); // historical orders untouched
  });
});
