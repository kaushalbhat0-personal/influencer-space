/**
 * RCCF-72.18D.5.2-D — Refund Initiation UI (server projection + parsing)
 *
 * Coverage:
 *   1. refund.eligible derivation — mirrors the ACTUAL D.3 preconditions
 *      (DIRECT_CREATOR strategy, historical payment binding, captured payment,
 *      COMPLETED order, NONE/PARTIAL/FAILED refund state, remaining > 0).
 *      Render-hint only: D.3/D.4 remain authoritative.
 *   2. Tenant isolation through the existing D.5.2-A action (foreign tenant
 *      stays indistinguishable NOT_FOUND).
 *   3. Strict rupee→paise parsing on the canonical toMinorUnits conversion —
 *      rejects empty/non-numeric/negative/fractional-paise/zero/exceeding.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  productOrderFindFirst: vi.fn(),
  getShippingAddress: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productOrder: {
      findFirst: h.productOrderFindFirst,
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    },
    product: { findMany: vi.fn().mockResolvedValue([]) },
    orderFulfillment: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  },
}));
vi.mock("next-auth", () => ({ getServerSession: h.getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/require-tenant", () => ({ requireTenant: vi.fn().mockResolvedValue({ tenantId: "t-A" }) }));
vi.mock("@/modules/fulfillment", () => ({
  getShippingAddress: h.getShippingAddress,
}));

import { getCreatorOrderDetail } from "@/actions/order.actions";
import { parseRefundAmountInput, getRefundErrorMessage } from "@/app/admin/orders/_components/order-presentation";

interface OrderRow extends Record<string, unknown> {
  id: string;
  tenantId: string;
}

function sessionAs(role: string | null, tenantId = "t-A") {
  h.getSession.mockResolvedValue(
    role ? { user: { id: "u1", role, tenantId, email: `${role.toLowerCase()}@x.test` } } : null,
  );
}

function seedOrder(over: Partial<OrderRow> = {}): OrderRow {
  return {
    id: "ord-1",
    tenantId: "t-A",
    productId: "prod-1",
    amount: 999,
    status: "COMPLETED",
    commerceStrategy: "DIRECT_CREATOR",
    provider: "razorpay",
    paymentAccountId: "pa_1",
    refundStatus: "NONE",
    refundAmount: null,
    refundId: null,
    refundedAt: null,
    razorpayOrderId: "order_X1",
    razorpayPaymentId: "pay_X1",
    fanEmail: "buyer@example.com",
    createdAt: new Date("2026-07-30T00:00:00Z"),
    updatedAt: new Date("2026-07-30T00:00:00Z"),
    product: { name: "Bass Preset Pack", type: "physical", commerceMode: "ONLINE" },
    fulfillment: null,
    ...over,
  };
}

function refundProjection() {
  const r = getCreatorOrderDetail("ord-1");
  return r.then((res) => {
    if (!res.ok) throw new Error(`expected ok, got ${JSON.stringify(res)}`);
    return res.order.refund;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.productOrderFindFirst.mockImplementation(({ where }: { where: { id: string; tenantId?: string } }) => {
    // Emulates Prisma tenant scoping against the single seeded row below.
    const row = currentRow;
    if (!row || row.id !== where.id) return Promise.resolve(null);
    if (where.tenantId && row.tenantId !== where.tenantId) return Promise.resolve(null);
    return Promise.resolve(row);
  });
  h.getShippingAddress.mockResolvedValue(null);
});

let currentRow: OrderRow | null = null;

// ── 1. Eligibility derivation ────────────────────────────────

describe("RCCF-72.18D.5.2-D — server-derived refund eligibility", () => {
  it.each([
    ["NONE + full headroom", {}],
    ["PARTIAL + remaining headroom", { refundStatus: "PARTIAL", refundAmount: 2500 }],
    ["FAILED + remaining headroom (retry)", { refundStatus: "FAILED", refundAmount: 1000 }],
  ])("%s → eligible", async (_label, over) => {
    sessionAs("ADMIN");
    currentRow = seedOrder(over);
    await expect(refundProjection()).resolves.toMatchObject({ eligible: true });
  });

  it.each([
    ["PLATFORM_COLLECT strategy", { commerceStrategy: "PLATFORM_COLLECT" }],
    ["missing payment account binding", { paymentAccountId: null }],
    ["no captured payment", { razorpayPaymentId: null }],
    ["order not COMPLETED", { status: "PENDING", razorpayPaymentId: null }],
    ["refund already REFUNDED", { refundStatus: "REFUNDED", refundAmount: 99900 }],
    ["refund PENDING (in flight)", { refundStatus: "PENDING" }],
    ["nothing remains refundable", { refundStatus: "PARTIAL", refundAmount: 99900 }],
  ])("%s → not eligible", async (_label, over) => {
    sessionAs("ADMIN");
    currentRow = seedOrder(over);
    await expect(refundProjection()).resolves.toMatchObject({ eligible: false });
  });

  it("exposes NO secret or identifier through the refund projection", async () => {
    sessionAs("ADMIN");
    currentRow = seedOrder({});
    const refund = await refundProjection();
    expect(Object.keys(refund).sort()).toEqual(
      ["eligible", "providerRefundId", "refundedAt", "refundedPaise", "remainingRefundablePaise", "status"].sort(),
    );
    const json = JSON.stringify(refund);
    expect(json.toLowerCase()).not.toContain("paymentaccountid");
    expect(json.toLowerCase()).not.toContain("providerkey");
    expect(json.toLowerCase()).not.toContain("secret");
    expect(json.toLowerCase()).not.toContain('"tenantid"');
  });

  it("keeps D.5.1 math intact: remaining = captured − actual refunded", async () => {
    sessionAs("ADMIN");
    currentRow = seedOrder({ amount: 100, refundStatus: "PARTIAL", refundAmount: 2500 });
    await expect(refundProjection()).resolves.toMatchObject({
      status: "PARTIAL",
      refundedPaise: 2500,
      remainingRefundablePaise: 7500,
      eligible: true,
    });
  });
});

// ── 2. Tenant isolation (unchanged D.5.2-A boundary) ─────────

describe("RCCF-72.18D.5.2-D — refund path tenant isolation", () => {
  it("foreign-tenant order stays indistinguishable NOT_FOUND for ADMIN", async () => {
    sessionAs("ADMIN", "t-A");
    currentRow = seedOrder({ id: "ord-B", tenantId: "t-B" });
    const r = await getCreatorOrderDetail("ord-B");
    expect(r).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });
});

// ── 3. Amount parsing (canonical minor-unit conversion) ──────

describe("RCCF-72.18D.5.2-D — strict refund amount parsing (rupees → paise)", () => {
  it.each([
    ["499.50", 49950],
    ["499.5", 49950],
    ["1000", 100000],
    ["₹1,000", 100000],
    ["  99 ₹ ", 9900],
    ["0.07", 7],
    ["999", 99900],
  ])("%s → %s paise", (raw, expected) => {
    expect(parseRefundAmountInput(raw, 999900)).toEqual({ ok: true, paise: expected });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["abc", "invalid-format"],
    ["NaN", "invalid-format"],
    ["Infinity", "invalid-format"],
    ["-5", "invalid-format"],
    ["1..2", "invalid-format"],
    ["499.50€", "invalid-format"],
    ["10.555", "fractional-paise"],
    ["0.001", "fractional-paise"],
    ["0", "non-positive"],
    ["0.00", "non-positive"],
    ["2000", "exceeds-remaining"], // remaining = 999.00
  ] as Array<[string, string]>)("%s → rejected (%s)", (raw, reason) => {
    expect(parseRefundAmountInput(raw, 99900)).toMatchObject({ ok: false, reason });
  });

  it("accepts the exact remaining amount", () => {
    expect(parseRefundAmountInput("999", 99900)).toEqual({ ok: true, paise: 99900 });
  });

  it("never produces fractional paise", () => {
    for (const raw of ["1.01", "1.99", "0.05", "12345.67"]) {
      const r = parseRefundAmountInput(raw, 10_000_000);
      expect(r.ok).toBe(true);
      expect(Number.isInteger((r as { paise: number }).paise)).toBe(true);
    }
  });
});

// ── 4. Error mapping ─────────────────────────────────────────

describe("RCCF-72.18D.5.2-D — safe error mapping", () => {
  it("maps every documented D.3/D.4 code to a safe message", () => {
    const codes = [
      "REFUND_IN_PROGRESS", "AMOUNT_EXCEEDS_REMAINING", "INVALID_STRATEGY",
      "MISSING_PAYMENT_ACCOUNT", "INVALID_PAYMENT_ACCOUNT", "INVALID_AMOUNT",
      "CONCURRENT_MODIFICATION", "NO_CAPTURED_PAYMENT", "INVALID_ORDER_STATUS",
      "INVALID_REFUND_STATE", "PROVIDER_ERROR", "INVALID_REQUEST",
      "PROVIDER_NOT_SUPPORTED", "UNAUTHORIZED_PROVIDER", "NOT_FOUND",
      "FORBIDDEN", "UNAUTHORIZED",
    ];
    for (const code of codes) {
      const msg = getRefundErrorMessage(code);
      expect(msg.length).toBeGreaterThan(0);
      expect(msg).not.toMatch(/prisma|sql|razorpay|stack|exception/i);
    }
  });

  it("degrades unknown codes and raw errors to the generic safe message", () => {
    expect(getRefundErrorMessage("SOMETHING_NEW")).toBe("Something went wrong. Please try again.");
    expect(getRefundErrorMessage(undefined)).toBe("Something went wrong. Please try again.");
    expect(getRefundErrorMessage("P2025 connection refused")).toBe("Something went wrong. Please try again.");
  });
});
