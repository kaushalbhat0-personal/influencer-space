/**
 * RCCF-72.18D.5.2-C — Creator Fulfillment Controls Hardening (server side)
 *
 * Coverage:
 *   1. Canonical state machine enforcement — EVERY legal transition derived
 *      from the repository's own strategy table is ALLOWED, EVERY illegal
 *      pair is DENIED (table-driven, generated from
 *      getFulfillmentStrategy("physical").transitions — never a hand-copied
 *      second machine).
 *   2. Concurrency guard — the write is conditioned on the validated status;
 *      a lost race returns a safe failure and performs NO further writes,
 *      NO events, NO audit entries.
 *   3. Tenant isolation — a fulfillment from another tenant is invisible to
 *      the mutation (scoped lookup, "Fulfillment not found").
 *   4. Tracking optionality — preserved exactly per existing architecture:
 *      shipping without tracking is ALLOWED; provided values are written.
 *   5. Timeline truth — transitions append a server-derived entry.
 *   6. Ledger safety — fulfillment mutations NEVER touch ProductOrder or any
 *      refund field (D.5.1 semantics untouched).
 *   7. Action-boundary role matrix re-pin for the C surface.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  // Real runtime's prisma surface
  fulFindFirst: vi.fn(),
  fulUpdateMany: vi.fn(),
  fulFindUnique: vi.fn(),
  productOrderUpdate: vi.fn(),
  productOrderUpdateMany: vi.fn(),
  // Mocked module surface for action-level tests
  updateFulfillmentModule: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    orderFulfillment: {
      findFirst: h.fulFindFirst,
      updateMany: h.fulUpdateMany,
      findUnique: h.fulFindUnique,
    },
    productOrder: {
      update: h.productOrderUpdate,
      updateMany: h.productOrderUpdateMany,
    },
  },
}));
vi.mock("next-auth", () => ({ getServerSession: h.getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/modules/event-runtime", () => ({
  runtimeEventBus: { publish: vi.fn().mockResolvedValue(undefined) },
}));
// Action boundary uses the public module API; the deep runtime import below
// stays REAL so the canonical machine is exercised un-mocked.
vi.mock("@/modules/fulfillment", () => ({
  updateFulfillment: h.updateFulfillmentModule,
  generateDownload: vi.fn().mockResolvedValue({ success: false }),
  getShippingAddress: vi.fn().mockResolvedValue(null),
  listFulfillments: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

import { updateFulfillment } from "@/modules/fulfillment/application/runtime";
import { updateFulfillmentStatus } from "@/actions/fulfillment.actions";
import { getFulfillmentStrategy, canTransition } from "@/modules/fulfillment/application/strategies";
import type { FulfillmentStatus } from "@/modules/fulfillment/domain/types";

const T0 = new Date("2026-08-01T00:00:00Z");

function makeRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ful-1",
    orderId: "ord-1",
    tenantId: "t-A",
    productId: "prod-1",
    type: "physical",
    status: "pending",
    trackingNumber: null,
    courier: null,
    carrierNotes: null,
    shippedAt: null,
    deliveredAt: null,
    downloadUrl: null,
    downloadToken: null,
    downloadExpiresAt: null,
    downloadLimit: 5,
    downloadCount: 0,
    timeline: [{ status: "pending", at: T0.toISOString() }],
    createdAt: T0,
    updatedAt: T0,
    ...over,
  };
}

function primeSuccessfulWrite(row = makeRow()) {
  h.fulFindFirst.mockResolvedValue(row);
  h.fulUpdateMany.mockResolvedValue({ count: 1 });
  h.fulFindUnique.mockResolvedValue({ ...row, status: "moved" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── 1. Canonical state machine — exhaustive table-driven ─────

const STRATEGY = getFulfillmentStrategy("physical");
const ALL_STATUSES = Object.keys(STRATEGY.transitions) as FulfillmentStatus[];
const LEGAL_PAIRS: Array<[FulfillmentStatus, FulfillmentStatus]> = ALL_STATUSES.flatMap((from) =>
  ((STRATEGY.transitions[from] ?? []) as FulfillmentStatus[]).map((to) => [from, to] as [FulfillmentStatus, FulfillmentStatus]),
);
const ILLEGAL_PAIRS: Array<[FulfillmentStatus, FulfillmentStatus]> = ALL_STATUSES.flatMap((from) =>
  ALL_STATUSES.filter((to) => to !== from && !canTransition(STRATEGY, from, to)).map((to) => [from, to] as [FulfillmentStatus, FulfillmentStatus]),
);

describe("RCCF-72.18D.5.2-C — canonical fulfillment state machine (server-authoritative)", () => {
  it.each(LEGAL_PAIRS)("ALLOWS %s → %s (legal per canonical table)", async (from, to) => {
    expect(canTransition(STRATEGY, from, to)).toBe(true);
    primeSuccessfulWrite(makeRow({ status: from }));
    const r = await updateFulfillment("t-A", "ful-1", { status: to }, "creator");
    expect(r.success).toBe(true);
    expect(h.fulUpdateMany.mock.calls[0][0].data.status).toBe(to);
  });

  it.each(ILLEGAL_PAIRS)("DENIES %s → %s (illegal per canonical table)", async (from, to) => {
    expect(canTransition(STRATEGY, from, to)).toBe(false);
    h.fulFindFirst.mockResolvedValue(makeRow({ status: from }));
    const r = await updateFulfillment("t-A", "ful-1", { status: to }, "creator");
    expect(r.success).toBe(false);
    expect(r.error).toContain("Cannot transition");
    expect(h.fulUpdateMany).not.toHaveBeenCalled();
  });

  // Explicit pins for the pairs the RCCF brief calls out by name.
  it.each([
    ["pending", "shipped", true],
    ["pending", "delivered", false],
    ["shipped", "delivered", true],
    ["delivered", "shipped", false],
    ["delivered", "pending", false],
  ] as Array<[FulfillmentStatus, FulfillmentStatus, boolean]>)("%s → %s legality = %s", (from, to, legal) => {
    expect(canTransition(STRATEGY, from, to)).toBe(legal);
  });

  it("derives the machine from the repository, not a copy (guardrail)", () => {
    // If the canonical table ever changes shape, this suite must fail loudly.
    expect(Object.keys(STRATEGY.transitions).sort()).toEqual(
      ["accepted", "cancelled", "completed", "confirmed", "delivered", "packed", "pending", "preparing", "ready", "returned", "shipped"].sort(),
    );
    expect(LEGAL_PAIRS.length).toBeGreaterThan(0);
    expect(LEGAL_PAIRS.length + ILLEGAL_PAIRS.length).toBe(ALL_STATUSES.length * (ALL_STATUSES.length - 1));
  });
});

// ── 2. Concurrency guard ─────────────────────────────────────

describe("RCCF-72.18D.5.2-C — mutation concurrency guard", () => {
  it("conditions the write on the exact status it validated", async () => {
    primeSuccessfulWrite(makeRow({ status: "pending" }));
    await updateFulfillment("t-A", "ful-1", { status: "shipped", trackingNumber: "TRK9" }, "creator");
    const call = h.fulUpdateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: "ful-1", tenantId: "t-A", status: "pending" });
    expect(call.data.status).toBe("shipped");
  });

  it("rejects a lost race with a safe error and no further writes/events", async () => {
    h.fulFindFirst.mockResolvedValue(makeRow({ status: "pending" }));
    h.fulUpdateMany.mockResolvedValue({ count: 0 }); // another request already moved the row
    const r = await updateFulfillment("t-A", "ful-1", { status: "shipped" }, "creator");
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/just updated elsewhere/i);
    expect(h.fulFindUnique).not.toHaveBeenCalled();
    expect(h.productOrderUpdate).not.toHaveBeenCalled();
  });

  it("simulated race: two transitions from the same stale read yield exactly one landed write", async () => {
    let stored = makeRow({ status: "pending" }); // shared "database" row
    h.fulFindFirst.mockImplementation(() => Promise.resolve(stored));
    h.fulUpdateMany.mockImplementation(({ where }: { where: { id: string; status: string } }) => {
      // Emulates the conditional UPDATE … WHERE id=? AND status=? predicate.
      if (stored.id === where.id && stored.status === where.status) {
        stored = { ...stored, status: "landed" };
        return Promise.resolve({ count: 1 });
      }
      return Promise.resolve({ count: 0 });
    });

    const [a, b] = await Promise.all([
      updateFulfillment("t-A", "ful-1", { status: "shipped" }, "creatorA"),
      updateFulfillment("t-A", "ful-1", { status: "cancelled" }, "creatorB"),
    ]);
    const results = [a, b];
    expect(results.filter((r) => r.success)).toHaveLength(1);
    expect(results.filter((r) => !r.success)).toHaveLength(1);
    expect((stored as { status: string }).status).toBe("landed"); // single consistent outcome
  });

  it("re-reads the persisted row so the returned view is server truth", async () => {
    const updated = makeRow({ status: "shipped", shippedAt: new Date() });
    primeSuccessfulWrite(makeRow({ status: "pending" }));
    h.fulFindUnique.mockResolvedValue(updated);
    const r = await updateFulfillment("t-A", "ful-1", { status: "shipped" }, "creator");
    expect(h.fulFindUnique).toHaveBeenCalledWith({ where: { id: "ful-1" } });
    expect(r.view?.status).toBe("shipped");
  });
});

// ── 3. Tenant isolation at the mutation ──────────────────────

describe("RCCF-72.18D.5.2-C — fulfillment mutation tenant isolation", () => {
  it("never lets an ADMIN mutate another tenant's fulfillment (indistinguishable not-found)", async () => {
    // The scoped lookup itself filters by tenant — a t-B fulfillment id does
    // not exist within t-A's visible rows.
    h.fulFindFirst.mockImplementation(({ where }: { where: { id: string; tenantId?: string } }) =>
      Promise.resolve(where.tenantId === "t-B" ? makeRow({ tenantId: "t-B" }) : null),
    );
    const r = await updateFulfillment("t-A", "ful-1", { status: "shipped" }, "attacker");
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/not found/i);
    expect(h.fulUpdateMany).not.toHaveBeenCalled();
  });

  it("scopes even the conditional write to the actor's tenant", async () => {
    primeSuccessfulWrite();
    await updateFulfillment("t-A", "ful-1", { status: "preparing" }, "creator");
    expect(h.fulUpdateMany.mock.calls[0][0].where.tenantId).toBe("t-A");
  });
});

// ── 4. Tracking optionality (existing architecture preserved) ─

describe("RCCF-72.18D.5.2-C — tracking remains optional", () => {
  it("allows a shipped transition WITHOUT tracking (no invented requirement)", async () => {
    primeSuccessfulWrite(makeRow({ status: "pending" }));
    const r = await updateFulfillment("t-A", "ful-1", { status: "shipped" }, "creator");
    expect(r.success).toBe(true);
    const data = h.fulUpdateMany.mock.calls[0][0].data;
    expect(data.status).toBe("shipped");
    expect(data.trackingNumber).toBeUndefined();
    expect(data.courier).toBeUndefined();
  });

  it("writes provided tracking/courier values verbatim", async () => {
    primeSuccessfulWrite(makeRow({ status: "pending" }));
    const r = await updateFulfillment("t-A", "ful-1", { status: "shipped", trackingNumber: "AWB-77", courier: "Delhivery" }, "creator");
    expect(r.success).toBe(true);
    const data = h.fulUpdateMany.mock.calls[0][0].data;
    expect(data.trackingNumber).toBe("AWB-77");
    expect(data.courier).toBe("Delhivery");
  });

  it("stamps shippedAt/deliveredAt once, server-side, only on first arrival", async () => {
    const first = makeRow({ status: "shipped", shippedAt: null });
    primeSuccessfulWrite(first);
    await updateFulfillment("t-A", "ful-1", { status: "shipped" }, "creator");
    expect(h.fulUpdateMany.mock.calls[0][0].data.shippedAt).toBeInstanceOf(Date);

    h.fulFindFirst.mockResolvedValue(makeRow({ status: "shipped", shippedAt: new Date("2026-08-02T00:00:00Z") }));
    await updateFulfillment("t-A", "ful-1", { status: "shipped" }, "creator");
    // Same-status re-submit is a no-transition: no overwrite of the original stamp.
    const secondCall = h.fulUpdateMany.mock.calls[1][0].data;
    expect(secondCall.shippedAt).toBeUndefined();
  });
});

// ── 5. Timeline + ledger boundaries ──────────────────────────

describe("RCCF-72.18D.5.2-C — timeline truth and refund-ledger safety", () => {
  it("appends a server-derived timeline entry attributed to the actor", async () => {
    primeSuccessfulWrite(makeRow({ status: "packed" }));
    await updateFulfillment("t-A", "ful-1", { status: "shipped" }, "creator@x.test");
    const timeline = h.fulUpdateMany.mock.calls[0][0].data.timeline;
    expect(timeline).toHaveLength(2);
    expect(timeline[1]).toMatchObject({ status: "shipped", by: "creator@x.test" });
  });

  it("NEVER touches ProductOrder or refund fields from the fulfillment path", async () => {
    primeSuccessfulWrite(makeRow({ status: "pending" }));
    await updateFulfillment("t-A", "ful-1", { status: "shipped", trackingNumber: "T" }, "creator");
    expect(h.productOrderUpdate).not.toHaveBeenCalled();
    expect(h.productOrderUpdateMany).not.toHaveBeenCalled();
    const data = JSON.stringify(h.fulUpdateMany.mock.calls[0][0].data);
    expect(data).not.toContain("refundAmount");
    expect(data).not.toContain("refundStatus");
    expect(data).not.toContain("paymentAccountId");
  });
});

// ── 6. Action boundary re-pin (C consumes the D.5.2-A guard) ──

describe("RCCF-72.18D.5.2-C — drawer mutation action boundary", () => {
  function sessionAs(role: string | null, tenantId = "t-A") {
    h.getSession.mockResolvedValue(
      role ? { user: { id: "u1", role, tenantId, email: `${role.toLowerCase()}@x.test` } } : null,
    );
  }

  it.each([
    ["anonymous", null],
    ["READ_ONLY", "READ_ONLY"],
    ["SUPPORT", "SUPPORT"],
    ["AGENCY_STAFF", "AGENCY_STAFF"],
    ["AGENCY_ADMIN", "AGENCY_ADMIN"],
  ])("drawer mutation denied for %s before any fulfillment work", async (_label, role) => {
    sessionAs(role);
    const r = await updateFulfillmentStatus("ful-1", { status: "shipped" });
    expect(r.success).toBe(false);
    expect(h.updateFulfillmentModule).not.toHaveBeenCalled();
  });

  it.each([
    ["ADMIN own tenant", "ADMIN", "t-A"],
    ["SUPER_ADMIN", "SUPER_ADMIN", "t-super"],
  ])("drawer mutation allowed for %s", async (_label, role, tenantId) => {
    sessionAs(role, tenantId);
    h.updateFulfillmentModule.mockResolvedValue({ success: true });
    const r = await updateFulfillmentStatus("ful-1", { status: "shipped" });
    expect(r.success).toBe(true);
    expect(h.updateFulfillmentModule).toHaveBeenCalledWith(tenantId, "ful-1", { status: "shipped" }, expect.any(String));
  });

  it("propagates safe server rejection text (stale/illegal) to the UI consumer", async () => {
    sessionAs("ADMIN");
    h.updateFulfillmentModule.mockResolvedValue({
      success: false,
      error: "This fulfillment was just updated elsewhere. The latest state is shown.",
    });
    const r = await updateFulfillmentStatus("ful-1", { status: "delivered" });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/just updated elsewhere/i);
    expect(r.error).not.toMatch(/prisma|P\d{4}|stack/i);
  });
});
