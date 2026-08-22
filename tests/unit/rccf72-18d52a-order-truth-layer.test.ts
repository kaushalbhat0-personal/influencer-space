/**
 * RCCF-72.18D.5.2-A — Creator Order Operations Truth Layer
 *
 * P0 coverage:
 *   1. getCreatorOrderDetail authorization matrix (8 roles) + projection
 *      correctness (refund math, timeline, physical-only address, credential
 *      hygiene, ≤2 queries, lazy single-order load)
 *   2. Server-paginated getOrdersPage (>200 orders, truthful totals, clamps,
 *      tenant scoping) + fetchOrders compatibility
 *   3. S-7 fix: fulfillment search inside the WHERE clause, filtered total,
 *      match beyond the first page reachable via offset
 *   4. S-8/O-6 fix: fetchCustomers groupBy equivalence vs legacy JS
 *      aggregation; fetchAnalytics count-based bounded queries with exact
 *      metric equivalence after PAID vocabulary removal
 *   5. Fulfillment mutation-boundary role hardening (ADMIN/SUPER_ADMIN allow,
 *      agency/support/view-only/anonymous deny)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  requireTenant: vi.fn(),
  productOrderFindMany: vi.fn(),
  productOrderCount: vi.fn(),
  productOrderFindFirst: vi.fn(),
  productOrderGroupBy: vi.fn(),
  productOrderAggregate: vi.fn(),
  productFindMany: vi.fn(),
  orderFulfillmentFindMany: vi.fn(),
  orderFulfillmentCount: vi.fn(),
  getShippingAddress: vi.fn(),
  updateFulfillment: vi.fn(),
  generateDownload: vi.fn(),
  listFulfillments: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productOrder: {
      findMany: h.productOrderFindMany,
      count: h.productOrderCount,
      findFirst: h.productOrderFindFirst,
      groupBy: h.productOrderGroupBy,
      aggregate: h.productOrderAggregate,
    },
    product: { findMany: h.productFindMany },
    orderFulfillment: { findMany: h.orderFulfillmentFindMany, count: h.orderFulfillmentCount },
  },
}));
vi.mock("next-auth", () => ({ getServerSession: h.getSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/require-tenant", () => ({ requireTenant: h.requireTenant }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/modules/event-runtime", () => ({
  runtimeEventBus: { publish: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("@/modules/fulfillment", () => ({
  getShippingAddress: h.getShippingAddress,
  updateFulfillment: h.updateFulfillment,
  generateDownload: h.generateDownload,
  listFulfillments: h.listFulfillments,
}));

import { getCreatorOrderDetail, getOrdersPage, fetchOrders, fetchCustomers, fetchAnalytics } from "@/actions/order.actions";
import { getOrderShippingAddress, updateFulfillmentStatus, generateDownloadLink } from "@/actions/fulfillment.actions";
import { listFulfillments } from "@/modules/fulfillment/application/runtime";

// ── fixtures ─────────────────────────────────────────────────

type OrderRow = Record<string, unknown> & {
  id: string;
  tenantId: string;
  product: { name: string; type: string; commerceMode: string };
};

let ordersDb: Map<string, OrderRow>;

function makeFulfillment(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ful-1",
    orderId: "ord-1",
    tenantId: "t-A",
    productId: "prod-1",
    type: "physical",
    status: "shipped",
    trackingNumber: "TRK123",
    courier: "BlueDart",
    carrierNotes: null,
    shippedAt: new Date("2026-08-01T10:00:00Z"),
    deliveredAt: null,
    downloadUrl: null,
    downloadToken: null,
    downloadExpiresAt: null,
    downloadLimit: 5,
    downloadCount: 0,
    timeline: [
      { status: "pending", at: "2026-07-30T00:00:00.000Z" },
      { status: "shipped", at: "2026-08-01T10:00:00.000Z", by: "creator" },
    ],
    createdAt: new Date("2026-07-30T00:00:00Z"),
    updatedAt: new Date("2026-08-01T10:00:00Z"),
    ...over,
  };
}

function seedOrder(over: Partial<OrderRow> = {}): OrderRow {
  const row: OrderRow = {
    id: "ord-1",
    tenantId: "t-A",
    productId: "prod-1",
    amount: 49.9,
    status: "COMPLETED",
    razorpayOrderId: "order_X1",
    razorpayPaymentId: "pay_X1",
    fanEmail: "buyer@example.com",
    commerceStrategy: "PLATFORM_COLLECT",
    paymentAccountId: "pa_1",
    refundStatus: "NONE",
    refundAmount: null,
    refundId: null,
    refundedAt: null,
    createdAt: new Date("2026-07-30T00:00:00Z"),
    updatedAt: new Date("2026-07-30T00:00:00Z"),
    product: { name: "Bass Preset Pack", type: "physical", commerceMode: "ONLINE" },
    fulfillment: null,
    shippingAddress: {},
    ...over,
  };
  ordersDb.set(row.id, row);
  return row;
}

/** Emulates Prisma findFirst tenant scoping against the seeded map. */
function emulateFindFirst() {
  h.productOrderFindFirst.mockImplementation(({ where }: { where: { id: string; tenantId?: string } }) => {
    const row = ordersDb.get(where.id);
    if (!row) return Promise.resolve(null);
    if (where.tenantId && row.tenantId !== where.tenantId) return Promise.resolve(null);
    return Promise.resolve(row);
  });
}

function sessionAs(role: string | null, tenantId = "t-A") {
  h.getSession.mockResolvedValue(
    role ? { user: { id: "u1", role, tenantId, email: `${(role ?? "anon").toLowerCase()}@x.test` } } : null,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ordersDb = new Map();
});

// ── 1. getCreatorOrderDetail — authorization matrix ──────────

describe("RCCF-72.18D.5.2-A — getCreatorOrderDetail authorization matrix", () => {
  it.each([
    ["anonymous", null, "t-B", "UNAUTHORIZED"],
    ["AGENCY_ADMIN", "AGENCY_ADMIN", "t-A", "UNAUTHORIZED"],
    ["AGENCY_STAFF", "AGENCY_STAFF", "t-A", "UNAUTHORIZED"],
    ["SUPPORT", "SUPPORT", "t-A", "UNAUTHORIZED"],
    ["READ_ONLY", "READ_ONLY", "t-A", "UNAUTHORIZED"],
  ])("denies %s", async (_label, role, tenantId, expectedCode) => {
    sessionAs(role, tenantId);
    seedOrder({});
    const r = await getCreatorOrderDetail("ord-1");
    expect(r.ok).toBe(false);
    expect((r as { code?: string }).code).toBe(expectedCode);
  });

  it("denies an ADMIN reading another creator's order (NOT_FOUND — indistinguishable)", async () => {
    sessionAs("ADMIN", "t-A");
    seedOrder({ id: "ord-B", tenantId: "t-B" });
    emulateFindFirst();
    const r = await getCreatorOrderDetail("ord-B");
    expect(r).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(h.getShippingAddress).not.toHaveBeenCalled();
  });

  it("allows an ADMIN reading their own tenant order", async () => {
    sessionAs("ADMIN", "t-A");
    seedOrder({});
    emulateFindFirst();
    const r = await getCreatorOrderDetail("ord-1");
    expect(r.ok).toBe(true);
  });

  it("allows SUPER_ADMIN cross-tenant intentionally (D.3/D.4 semantics)", async () => {
    sessionAs("SUPER_ADMIN", "t-super");
    seedOrder({ id: "ord-B", tenantId: "t-B" });
    emulateFindFirst();
    const r = await getCreatorOrderDetail("ord-B");
    expect(r.ok).toBe(true);
    // SUPER_ADMIN lookup must not carry a tenantId scope.
    expect(h.productOrderFindFirst.mock.calls[0][0].where.tenantId).toBeUndefined();
  });
});

// ── 2. getCreatorOrderDetail — projection truth ──────────────

describe("RCCF-72.18D.5.2-A — order detail projection", () => {
  it("projects physical order truth: refund math, fulfillment, timeline, address", async () => {
    sessionAs("ADMIN", "t-A");
    seedOrder({
      amount: 100,
      refundStatus: "PARTIAL",
      refundAmount: 2500,
      refundId: "rfnd_1",
      refundedAt: new Date("2026-08-02T00:00:00Z"),
    });
    (ordersDb.get("ord-1") as unknown as { fulfillment: unknown }).fulfillment = makeFulfillment();
    emulateFindFirst();
    h.getShippingAddress.mockResolvedValue({ id: "addr-1", name: "Buyer", line1: "12 Road", city: "Mumbai", pin: "400001" });

    const r = await getCreatorOrderDetail("ord-1");
    expect(r.ok).toBe(true);
    const o = (r as { ok: true; order: Record<string, unknown> }).order;

    expect(o.originalCapturedPaise).toBe(10000);
    // RCCF-72.18D.5.2-D: the refund projection now also carries a
    // server-derived creator-direct eligibility hint (false here — this
    // seeded order is PLATFORM_COLLECT).
    expect(o.refund).toEqual({
      status: "PARTIAL",
      refundedPaise: 2500,
      remainingRefundablePaise: 7500,
      providerRefundId: "rfnd_1",
      refundedAt: "2026-08-02T00:00:00.000Z",
      eligible: false,
    });
    expect(o.fulfillment).toMatchObject({ type: "physical", status: "shipped", trackingNumber: "TRK123", courier: "BlueDart" });
    expect((o.fulfillment as { timeline: unknown[] }).timeline).toHaveLength(2);
    expect(o.shippingAddress).toMatchObject({ id: "addr-1", city: "Mumbai" });

    // Exactly two queries: order(+product+fulfillment) then the address.
    expect(h.productOrderFindFirst).toHaveBeenCalledTimes(1);
    expect(h.getShippingAddress).toHaveBeenCalledTimes(1);

    // Credential hygiene + tenancy minimization.
    const json = JSON.stringify(o);
    expect(json.toLowerCase()).not.toContain("secret");
    expect(json.toLowerCase()).not.toContain("credential");
    expect(o).not.toHaveProperty("tenantId");
    expect(o).not.toHaveProperty("paymentAccountId");
  });

  it("never exposes the shipping address for non-physical products", async () => {
    sessionAs("ADMIN", "t-A");
    seedOrder({ product: { name: "Sample Pack", type: "digital", commerceMode: "ONLINE" } });
    emulateFindFirst();

    const r = await getCreatorOrderDetail("ord-1");
    expect(r.ok).toBe(true);
    expect((r as { order: { shippingAddress: unknown } }).order.shippingAddress).toBeNull();
    // The canonical address reader was never even queried for digital goods.
    expect(h.getShippingAddress).not.toHaveBeenCalled();
  });

  it("keeps the address accessible after delivery and after a full refund", async () => {
    sessionAs("ADMIN", "t-A");
    seedOrder({
      refundStatus: "REFUNDED",
      refundAmount: 4990,
      refundId: "rfnd_full",
      refundedAt: new Date("2026-08-03T00:00:00Z"),
    });
    (ordersDb.get("ord-1") as unknown as { fulfillment: unknown }).fulfillment = makeFulfillment({
      status: "delivered",
      deliveredAt: new Date("2026-08-02T09:00:00Z"),
    });
    emulateFindFirst();
    h.getShippingAddress.mockResolvedValue({ id: "addr-1", name: "Buyer" });

    const r = await getCreatorOrderDetail("ord-1");
    const o = (r as { order: Record<string, unknown> }).order;
    expect(o.shippingAddress).toMatchObject({ id: "addr-1" });
    expect(o.refund).toMatchObject({ status: "REFUNDED", refundedPaise: 4990, remainingRefundablePaise: 0 });
  });

  it("handles missing fulfillment (pre-completion) without inventing state", async () => {
    sessionAs("ADMIN", "t-A");
    seedOrder({ status: "PENDING", razorpayPaymentId: null });
    emulateFindFirst();

    const r = await getCreatorOrderDetail("ord-1");
    const o = (r as { order: Record<string, unknown> }).order;
    expect(o.fulfillment).toBeNull();
    // Physical product without a fulfillment record yet — the address reader
    // still runs (address may exist pre-shipment); none stored here → null.
    h.getShippingAddress.mockResolvedValue(null);
    const r2 = await getCreatorOrderDetail("ord-1");
    expect((r2 as { order: { shippingAddress: unknown } }).order.shippingAddress).toBeNull();
    expect(h.getShippingAddress).toHaveBeenCalledTimes(2);
  });
});

// ── 3. Shipping-address action gate (existing contract) ──────

describe("RCCF-72.18D.5.2-A — getOrderShippingAddress access boundary", () => {
  it("denies anonymous callers", async () => {
    h.requireTenant.mockRejectedValue(new Error("Unauthorized"));
    const r = await getOrderShippingAddress("ord-1");
    expect(r).toMatchObject({ ok: false, error: "Unauthorized" });
  });

  it("denies foreign-tenant order ids (scoped lookup)", async () => {
    h.requireTenant.mockResolvedValue({ tenantId: "t-A" });
    h.productOrderFindFirst.mockResolvedValue(null);
    const r = await getOrderShippingAddress("ord-other");
    expect(r).toMatchObject({ ok: false, error: "Order not found" });
    expect(h.productOrderFindFirst.mock.calls[0][0]).toEqual({ where: { id: "ord-other", tenantId: "t-A" }, select: { id: true } });
    expect(h.getShippingAddress).not.toHaveBeenCalled();
  });

  it("returns the address for an own-tenant order", async () => {
    h.requireTenant.mockResolvedValue({ tenantId: "t-A" });
    h.productOrderFindFirst.mockResolvedValue({ id: "ord-1" });
    h.getShippingAddress.mockResolvedValue({ id: "addr-1", pin: "400001" });
    const r = await getOrderShippingAddress("ord-1");
    expect(r).toMatchObject({ ok: true });
    expect((r as { address?: { pin?: string } }).address?.pin).toBe("400001");
  });
});

// ── 4. Fulfillment mutation role hardening ───────────────────

describe("RCCF-72.18D.5.2-A — fulfillment mutation role boundary", () => {
  it.each([
    ["ADMIN", "ADMIN", true],
    ["SUPER_ADMIN", "SUPER_ADMIN", true],
    ["AGENCY_ADMIN", "AGENCY_ADMIN", false],
    ["AGENCY_STAFF", "AGENCY_STAFF", false],
    ["SUPPORT", "SUPPORT", false],
    ["READ_ONLY", "READ_ONLY", false],
    ["anonymous", null, false],
  ])("%s → %s for status mutation", async (_label, role, allowed) => {
    sessionAs(role);
    h.updateFulfillment.mockResolvedValue({ success: true, view: {} });
    const r = await updateFulfillmentStatus("ful-1", { status: "packed" });
    if (allowed) {
      expect(r.success).toBe(true);
      expect(h.updateFulfillment).toHaveBeenCalledWith("t-A", "ful-1", { status: "packed" }, expect.any(String));
    } else {
      expect(r.success).toBe(false);
      expect(r.error).toBe("Unauthorized");
      expect(h.updateFulfillment).not.toHaveBeenCalled();
    }
  });

  it("blocks download-link generation for denied roles before any token work", async () => {
    sessionAs("AGENCY_ADMIN");
    const r = await generateDownloadLink("ful-1");
    expect(r.success).toBe(false);
    expect(h.generateDownload).not.toHaveBeenCalled();
  });

  it("propagates server-side transition rejections to ADMIN callers", async () => {
    sessionAs("ADMIN");
    h.updateFulfillment.mockResolvedValue({ success: false, error: "Cannot transition Delivered → Shipped" });
    const r = await updateFulfillmentStatus("ful-1", { status: "shipped" });
    expect(r.success).toBe(false);
    expect(r.error).toContain("Cannot transition");
  });
});

// ── 5. Server-paginated orders ───────────────────────────────

describe("RCCF-72.18D.5.2-A — getOrdersPage server pagination", () => {
  function emulatePaginatedOrders(count: number) {
    const all = Array.from({ length: count }, (_, i) => ({
      id: `ord-${String(i).padStart(4, "0")}`,
      amount: 10,
      status: i % 2 === 0 ? "COMPLETED" : "PENDING",
      fanEmail: `b${i}@x.test`,
      razorpayOrderId: `ro_${i}`,
      createdAt: new Date(2026, 0, 1, 0, 0, 0, count - i),
      product: { name: `P${i}` },
    }));
    h.productOrderFindMany.mockImplementation(({ skip = 0, take = 25 }: { skip?: number; take?: number }) =>
      Promise.resolve(all.slice(skip, skip + take)),
    );
    h.productOrderCount.mockResolvedValue(count);
    return all;
  }

  it("denies anonymous callers", async () => {
    h.getSession.mockResolvedValue(null);
    const r = await getOrdersPage({ page: 1 });
    expect(r.ok).toBe(false);
    expect(h.productOrderFindMany).not.toHaveBeenCalled();
  });

  it("serves distinct pages beyond the legacy 200-row cap with a truthful total", async () => {
    h.getSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", tenantId: "t-A" } });
    const all = emulatePaginatedOrders(205);

    const p1 = await getOrdersPage({ page: 1, pageSize: 100 });
    const p2 = await getOrdersPage({ page: 2, pageSize: 100 });
    const p3 = await getOrdersPage({ page: 3, pageSize: 100 });

    expect(p1.total).toBe(205);
    expect(p1.items).toHaveLength(100);
    expect(p2.items).toHaveLength(100);
    expect(p3.items).toHaveLength(5);
    expect(p1.items![0].id).not.toBe(p2.items![0].id);
    expect(p2.items!.map((i) => i.id)).toEqual(all.slice(100, 200).map((r) => r.id));
    expect(p3.items!.map((i) => i.id)).toEqual(all.slice(200).map((r) => r.id));
    expect(p2.page).toBe(2);
    // Rows 201+ are reachable — the old take:200 cap hid these forever.
    expect(p3.items!.some((i) => Number(i.id.slice(4)) >= 200)).toBe(true);
  });

  it("clamps pageSize to the safety ceiling and floors the page index", async () => {
    h.getSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", tenantId: "t-A" } });
    emulatePaginatedOrders(300);
    const r = await getOrdersPage({ page: -3, pageSize: 5000 });
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(100);
    expect(h.productOrderFindMany.mock.calls[0][0].take).toBe(100);
    expect(h.productOrderFindMany.mock.calls[0][0].skip).toBe(0);
  });

  it("scopes every query to the SESSION tenant regardless of client input", async () => {
    h.getSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", tenantId: "t-real" } });
    emulatePaginatedOrders(3);
    await fetchOrders("t-forged-client-value");
    expect(h.productOrderFindMany.mock.calls[0][0].where).toEqual({ tenantId: "t-real" });
    expect(h.productOrderCount.mock.calls[0][0]).toEqual({ where: { tenantId: "t-real" } });
  });

  it("preserves the legacy fetchOrders array contract", async () => {
    h.getSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", tenantId: "t-A" } });
    emulatePaginatedOrders(7);
    const rows = await fetchOrders("ignored");
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(7);
    expect(rows[0]).toHaveProperty("productName", "P0"); // newest first (fixture: i=0 is newest)
    expect(rows[0]).toHaveProperty("createdAt");
  });
});

// ── 6. S-7 — fulfillment search before pagination ────────────

describe("RCCF-72.18D.5.2-A — listFulfillments search-in-WHERE (S-7)", () => {
  it("pushes search into the WHERE clause for BOTH findMany and count", async () => {
    h.orderFulfillmentFindMany.mockResolvedValue([]);
    h.orderFulfillmentCount.mockResolvedValue(0);

    await listFulfillments("t-A", { search: "needle", limit: 100 });

    const [findArgs] = h.orderFulfillmentFindMany.mock.calls[0];
    const [countArgs] = h.orderFulfillmentCount.mock.calls[0];
    const expectedSearch = {
      order: {
        is: {
          OR: [
            { fanEmail: { contains: "needle", mode: "insensitive" } },
            { product: { is: { name: { contains: "needle", mode: "insensitive" } } } },
          ],
        },
      },
    };
    expect(findArgs.where).toEqual({ tenantId: "t-A", ...expectedSearch });
    expect(findArgs.take).toBe(100);
    // Count MUST receive the identical filtered predicate so totals are truthful.
    expect(countArgs.where).toEqual({ tenantId: "t-A", ...expectedSearch });
  });

  it("finds a match beyond the first 100 rows via offset (regression for the JS-filter bug)", async () => {
    // Emulate the DATABASE: 120 fulfillments match "needle"; the caller pages
    // with limit 100. The old implementation took 100 rows then JS-filtered,
    // so this item was invisible; the WHERE-based version reaches it.
    const matching = Array.from({ length: 120 }, (_, i) => ({
      id: `ful-${i}`,
      orderId: `o-${i}`,
      tenantId: "t-A",
      productId: "p",
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
      timeline: [],
      createdAt: new Date(2026, 0, 1),
      updatedAt: new Date(2026, 0, 1),
      order: { fanEmail: `needle${i}@x.test`, amount: 5, product: { name: "Other" } },
    }));
    h.orderFulfillmentFindMany.mockImplementation(({ skip = 0, take = 50 }: { skip?: number; take?: number }) =>
      Promise.resolve(matching.slice(skip, skip + take)),
    );
    h.orderFulfillmentCount.mockResolvedValue(120);

    const page2 = await listFulfillments("t-A", { search: "needle", limit: 100, offset: 100 });
    expect(page2.total).toBe(120); // truthful filtered total
    expect(page2.items).toHaveLength(20);
    expect(page2.items[0].customer).toBe("needle100@x.test");
  });

  it("leaves the unsearched path byte-identical to the previous behavior", async () => {
    h.orderFulfillmentFindMany.mockResolvedValue([]);
    h.orderFulfillmentCount.mockResolvedValue(0);
    await listFulfillments("t-A", { status: "pending", limit: 100 });
    expect(h.orderFulfillmentFindMany.mock.calls[0][0].where).toEqual({ tenantId: "t-A", status: "pending" });
    expect(h.orderFulfillmentFindMany.mock.calls[0][0].where.order).toBeUndefined();
  });
});

// ── 7. S-8/O-6 — customer aggregation equivalence ────────────

describe("RCCF-72.18D.5.2-A — fetchCustomers groupBy equivalence", () => {
  /** Representative fixture: multi-order buyers, a stale buyer, guests excluded, mixed statuses. */
  const fixture = [
    { fanEmail: "a@x.test", amount: 499, status: "COMPLETED", createdAt: new Date("2026-01-05") },
    { fanEmail: "a@x.test", amount: 199, status: "PENDING", createdAt: new Date("2026-02-10") },
    { fanEmail: "a@x.test", amount: 50, status: "REFUNDED", createdAt: new Date("2026-03-01") },
    { fanEmail: "b@x.test", amount: 999, status: "COMPLETED", createdAt: new Date("2026-01-20") },
    { fanEmail: null, amount: 42, status: "COMPLETED", createdAt: new Date("2026-02-02") },
  ];

  function emulateGroupBy(rows: typeof fixture) {
    h.productOrderGroupBy.mockImplementation(async ({ by, where, _sum, _count, _max }) => {
      expect(by).toEqual(["fanEmail"]);
      expect(where).toEqual({ tenantId: "t-A", fanEmail: { not: null } });
      expect(_sum).toEqual({ amount: true });
      expect(_count).toEqual({ _all: true });
      expect(_max).toEqual({ createdAt: true });
      const map = new Map<string, { sum: number; n: number; max: Date }>();
      for (const r of rows) {
        if (!r.fanEmail) continue; // fanEmail not-null predicate
        const g = map.get(r.fanEmail) ?? { sum: 0, n: 0, max: new Date(0) };
        g.sum += r.amount;
        g.n += 1;
        if (r.createdAt > g.max) g.max = r.createdAt;
        map.set(r.fanEmail, g);
      }
      return Array.from(map.entries()).map(([fanEmail, g]) => ({
        fanEmail,
        _sum: { amount: g.sum },
        _count: { _all: g.n },
        _max: { createdAt: g.max },
      }));
    });
  }

  /** Verbatim port of the LEGACY implementation being replaced. */
  function legacyFetchCustomers(tenantRows: typeof fixture) {
    const ordered = [...tenantRows].sort((x, y) => (x.createdAt < y.createdAt ? 1 : x.createdAt > y.createdAt ? -1 : 0));
    const customerMap = new Map<string, { totalSpent: number; orderCount: number; lastOrder: Date }>();
    for (const o of ordered) {
      if (!o.fanEmail) continue;
      const existing = customerMap.get(o.fanEmail);
      if (existing) {
        existing.totalSpent += o.amount;
        existing.orderCount += 1;
        if (o.createdAt > existing.lastOrder) existing.lastOrder = o.createdAt;
      } else {
        customerMap.set(o.fanEmail, { totalSpent: o.amount, orderCount: 1, lastOrder: o.createdAt });
      }
    }
    return Array.from(customerMap.entries()).map(([email, d]) => ({
      email,
      totalSpent: d.totalSpent,
      orderCount: d.orderCount,
      lastOrder: d.lastOrder.toISOString(),
    }));
  }

  it("produces logically identical customer metrics to the legacy JS aggregation", async () => {
    h.getSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", tenantId: "t-A" } });
    emulateGroupBy(fixture);

    const fresh = await fetchCustomers("ignored");
    const legacy = legacyFetchCustomers(fixture);

    // Same customers, same totals/counts/lastOrder, same recency ordering.
    expect(fresh).toEqual(legacy);
    // Spot-check the semantic anchors explicitly.
    const a = fresh.find((c) => c.email === "a@x.test");
    expect(a).toEqual({ email: "a@x.test", totalSpent: 748, orderCount: 3, lastOrder: "2026-03-01T00:00:00.000Z" });
    expect(fresh.map((c) => c.email)).toEqual(["a@x.test", "b@x.test"]);
    // Guests (null email) never appear.
    expect(fresh.some((c) => !c.email)).toBe(false);
  });

  it("denies anonymous callers before any aggregation runs", async () => {
    h.getSession.mockResolvedValue(null);
    await expect(fetchCustomers("ignored")).rejects.toThrow("Unauthorized");
    expect(h.productOrderGroupBy).not.toHaveBeenCalled();
  });
});

// ── 8. Analytics bounds + PAID-vocabulary removal ────────────

describe("RCCF-72.18D.5.2-A — fetchAnalytics bounded queries + canonical vocabulary", () => {
  it("replaces the unbounded order scans with indexed COUNT/aggregate projections", async () => {
    h.getSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", tenantId: "t-A" } });
    h.productOrderCount.mockImplementation(({ where }: { where?: { status?: string } }) =>
      Promise.resolve(where?.status === "COMPLETED" ? 12 : 30),
    );
    h.productOrderAggregate.mockResolvedValue({ _sum: { amount: 4321 } });
    h.productFindMany.mockResolvedValue([
      { name: "A", isActive: true },
      { name: "B", isActive: false },
      { name: "C", isActive: true },
    ]);

    const r = await fetchAnalytics("ignored");

    expect(r.totalOrders).toBe(30);
    expect(r.completedOrders).toBe(12);
    expect(r.totalRevenue).toBe(4321);
    expect(r.activeProducts).toBe(2);
    expect(r.topProducts).toEqual(["A", "B", "C"]);

    // No unbounded scans remain.
    expect(h.productOrderFindMany).not.toHaveBeenCalled();
    // COMPLETED is queried directly — dead PAID vocabulary gone.
    const completedCall = h.productOrderCount.mock.calls.find(([a]) => (a as { where?: { status?: string } }).where?.status === "COMPLETED");
    expect(completedCall).toBeTruthy();
    expect(JSON.stringify(h.productOrderCount.mock.calls)).not.toContain('"PAID"');
  });

  it("is metric-equivalent to the legacy PAID||COMPLETED semantics (PAID was unwritable)", async () => {
    h.getSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN", tenantId: "t-A" } });
    // Legacy: completed = rows.filter(status==="PAID" || status==="COMPLETED").length.
    // Since nothing ever writes PAID to ProductOrder, every legacy-counted
    // order is COMPLETED — the COUNT(where COMPLETED) is provably identical.
    h.productOrderCount.mockImplementation(({ where }: { where?: { status?: string } }) =>
      Promise.resolve(where?.status === "COMPLETED" ? 7 : 9),
    );
    h.productOrderAggregate.mockResolvedValue({ _sum: { amount: 100 } });
    h.productFindMany.mockResolvedValue([]);

    const r = await fetchAnalytics("ignored");
    const legacyCompleted = 7; // all PAID||COMPLETED rows were COMPLETED by definition
    expect(r.completedOrders).toBe(legacyCompleted);
  });
});
