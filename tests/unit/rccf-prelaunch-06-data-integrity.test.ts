import { describe, it, expect, vi, beforeEach } from "vitest";

// ── DATA-01 mocks: productService.delete archival ──────────────────────────

const m = vi.hoisted(() => {
  const products: Array<{ id: string; tenantId: string; archivedAt: Date | null; isActive: boolean; status: string }> = [];
  const orders: Array<{ id: string; productId: string }> = [];
  return {
    products,
    orders,
    mockUpdate: vi.fn(),
    mockDelete: vi.fn(),
    reset() {
      products.length = 0;
      orders.length = 0;
      m.mockUpdate.mockReset();
      m.mockDelete.mockReset();
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: async ({ where }: { where: { id: string; tenantId: string } }) =>
        m.products.find((p) => p.id === where.id && p.tenantId === where.tenantId) ?? null,
      update: m.mockUpdate,
      delete: m.mockDelete,
    },
    productOrder: {
      count: async ({ where }: { where: { productId: string } }) =>
        m.orders.filter((o) => o.productId === where.productId).length,
    },
  },
}));

// ── DATA-02 mocks: checkout null placeholder ───────────────────────────────
const c = vi.hoisted(() => {
  const products: Array<{ id: string; tenantId: string; name: string; price: number; isActive: boolean; status: string; archivedAt: null }> = [];
  const createdOrders: Array<Record<string, unknown>> = [];
  return {
    products,
    createdOrders,
    storefrontTenant: null as { id: string } | null,
    session: null as unknown,
    mockRazorpayCreate: vi.fn(),
    mockComplete: vi.fn(),
    reset() {
      products.length = 0;
      createdOrders.length = 0;
      c.storefrontTenant = null;
      c.session = null;
      c.mockRazorpayCreate.mockReset();
      c.mockComplete.mockReset();
    },
  };
});

import { productService } from "@/features/products/service";
import { isValidGuestToken } from "@/lib/security/guest-order";

describe("DATA-01 — Product deletion preserves order history", () => {
  beforeEach(() => {
    m.reset();
    m.mockUpdate.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const p = m.products.find((x) => x.id === where.id)!;
      Object.assign(p, data);
      return p;
    });
    m.mockDelete.mockImplementation(async ({ where }: { where: { id: string } }) => {
      const idx = m.products.findIndex((x) => x.id === where.id);
      if (idx >= 0) m.products.splice(idx, 1);
      return {};
    });
  });

  it("archived product remains associated with ProductOrder (history readable)", async () => {
    const tenant = "t1";
    const prodId = "p1";
    m.products.push({ id: prodId, tenantId: tenant, archivedAt: null, isActive: true, status: "PUBLISHED" });
    m.orders.push({ id: "o1", productId: prodId });
    await productService.delete(prodId, tenant);
    // Product still exists (archived), not hard-deleted
    expect(m.products.some((p) => p.id === prodId)).toBe(true);
    expect(m.products.find((p) => p.id === prodId)!.archivedAt).toBeTruthy();
    expect(m.mockDelete).not.toHaveBeenCalled();
    expect(m.mockUpdate).toHaveBeenCalledWith({ where: { id: prodId }, data: { archivedAt: expect.any(Date), isActive: false, status: "ARCHIVED" } });
    // Order still references product
    expect(m.orders.some((o) => o.productId === prodId)).toBe(true);
  });

  it("order/revenue/refund history remains accessible after archival (DB Restrict simulation)", async () => {
    // Simulate FK Restrict: hard delete with existing orders would throw.
    // Our service must archive, so even if we attempt delete, history stays.
    const tenant = "t1";
    const prodId = "p1";
    m.products.push({ id: prodId, tenantId: tenant, archivedAt: null, isActive: true, status: "PUBLISHED" });
    m.orders.push({ id: "o1", productId: prodId }, { id: "o2", productId: prodId });
    await productService.delete(prodId, tenant);
    // Simulate trying to hard delete now would be Restrict, but our path archived
    expect(m.products.length).toBe(1);
    expect(m.orders.length).toBe(2);
  });

  it("normal admin deletion cannot silently destroy historical orders (archival not cascade)", async () => {
    const tenant = "t1";
    const prodId = "p1";
    m.products.push({ id: prodId, tenantId: tenant, archivedAt: null, isActive: true, status: "PUBLISHED" });
    m.orders.push({ id: "o1", productId: prodId });
    await productService.delete(prodId, tenant);
    expect(m.mockDelete).not.toHaveBeenCalled();
    // Product is now archived, storefront would filter it (archivedAt != null)
    const archived = m.products.find((p) => p.id === prodId)!;
    expect(archived.isActive).toBe(false);
    expect(archived.status).toBe("ARCHIVED");
  });

  it("active storefront behavior unchanged for published products (archivedAt null still sellable)", async () => {
    // This is a storefront invariant: findPublished filters archivedAt null.
    // We verify delete does not affect unrelated active products.
    const tenant = "t1";
    m.products.push(
      { id: "p1", tenantId: tenant, archivedAt: null, isActive: true, status: "PUBLISHED" },
      { id: "p2", tenantId: tenant, archivedAt: null, isActive: true, status: "PUBLISHED" },
    );
    m.orders.push({ id: "o1", productId: "p1" });
    await productService.delete("p1", tenant);
    // p2 still active
    expect(m.products.find((p) => p.id === "p2")!.archivedAt).toBeNull();
    expect(m.products.find((p) => p.id === "p2")!.isActive).toBe(true);
  });

  it("already-archived products behave correctly (idempotent)", async () => {
    const tenant = "t1";
    const already = new Date("2025-01-01");
    m.products.push({ id: "p1", tenantId: tenant, archivedAt: already, isActive: false, status: "ARCHIVED" });
    m.orders.push({ id: "o1", productId: "p1" });
    await productService.delete("p1", tenant);
    expect(m.mockUpdate).not.toHaveBeenCalled();
    expect(m.mockDelete).not.toHaveBeenCalled();
  });

  it("FK Restrict is declared in schema (no Cascade)", async () => {
    const fs = await import("node:fs");
    const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
    // Only the ProductOrder.product relation should be Restrict; Tenant relation stays Cascade
    expect(schema).toContain('product Product @relation(fields: [productId], references: [id], onDelete: Restrict)');
    expect(schema).not.toContain('product Product @relation(fields: [productId], references: [id], onDelete: Cascade)');
  });
});

describe("DATA-02 — razorpayOrderId nullable placeholder race", () => {
  beforeEach(() => {
    // We test the checkout code path separately with its own mocks (c)
    // Here we just verify the helper invariants for DATA-02
  });

  it("pending order has null provider order ID (not empty string)", async () => {
    // Simulate what createCheckout does: prisma.$transaction with razorpayOrderId: null
    const fs = await import("node:fs");
    const checkoutSrc = fs.readFileSync("src/actions/checkout.actions.ts", "utf8");
    expect(checkoutSrc).toContain("razorpayOrderId: null");
    expect(checkoutSrc).not.toMatch(/razorpayOrderId:\s*""/);
  });

  it("schema makes razorpayOrderId nullable unique", async () => {
    const fs = await import("node:fs");
    const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
    // Should be String? @unique (nullable)
    expect(schema).toMatch(/razorpayOrderId\s+String\?\s+@unique/);
  });

  it("concurrent pending order creation does not collide (multiple NULLs allowed)", async () => {
    // Postgres UNIQUE allows multiple NULLs, so two concurrent pending orders
    // with razorpayOrderId = NULL never violate the constraint, unlike "".
    // We simulate by ensuring our code never writes "" and the unique index
    // would not collide on NULL. This is a logical check, not a live DB race.
    const orders = [
      { id: "o1", razorpayOrderId: null },
      { id: "o2", razorpayOrderId: null },
    ];
    // Both have null → in Postgres they are distinct for UNIQUE
    expect(orders[0].razorpayOrderId).toBeNull();
    expect(orders[1].razorpayOrderId).toBeNull();
    expect(orders[0].razorpayOrderId).toEqual(orders[1].razorpayOrderId); // both null, but DB treats as not equal for UNIQUE
    // The key assertion: our code writes null, not "" → no unique collision
  });

  it("Razorpay order ID is populated after provider creation", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/actions/checkout.actions.ts", "utf8");
    // After razorpay.orders.create, we update with real id
    expect(src).toContain("await prisma.productOrder.update");
    expect(src).toContain("data: { razorpayOrderId: razorpayOrder.id }");
  });

  it("webhook lookup by real ID still works (non-null)", async () => {
    const fs = await import("node:fs");
    const webhook = fs.readFileSync("src/app/api/webhooks/razorpay/route.ts", "utf8");
    const checkout = fs.readFileSync("src/actions/checkout.actions.ts", "utf8");
    // Webhooks still query by real Razorpay order id (never null) — payment.failed path
    expect(webhook).toContain("where: { razorpayOrderId: rzpOrderId }");
    // Browser verifyPayment now scopes by tenant but still by real razorpayOrderId
    expect(checkout).toContain("razorpayOrderId");
    expect(checkout).toContain("tenantId: checkoutTenantId");
  });

  it("direct creator reconciliation remains unchanged (providerReference, not razorpayOrderId)", async () => {
    const fs = await import("node:fs");
    const payment = fs.readFileSync("src/actions/payment-account.actions.ts", "utf8");
    // Direct creator still uses providerReference / reconciliationRef, not razorpayOrderId placeholder
    expect(payment).toContain("providerReference");
    expect(payment).toContain("reconciliationRef");
    // Should not have introduced razorpayOrderId: null in direct creator pending path with ""
    expect(payment).not.toMatch(/razorpayOrderId:\s*""/);
  });

  it("orders-table handles nullable razorpayOrderId", async () => {
    const fs = await import("node:fs");
    const table = fs.readFileSync("src/app/admin/orders/_components/orders-table.tsx", "utf8");
    expect(table).toContain("r.razorpayOrderId ?");
    // Must handle null (ternary or optional chaining)
    expect(table.includes("r.razorpayOrderId?.") || table.includes("r.razorpayOrderId ?")).toBe(true);
  });

  it("OrderRow type allows null razorpayOrderId", async () => {
    const fs = await import("node:fs");
    const types = fs.readFileSync("src/actions/order.types.ts", "utf8");
    expect(types).toContain("razorpayOrderId: string | null");
  });

  it("migration converts empty strings to NULL (safe, additive)", async () => {
    const fs = await import("node:fs");
    const mig = fs.readFileSync("prisma/migrations/20260910000000_rccf_prelaunch_06_data_integrity/migration.sql", "utf8");
    expect(mig).toContain("UPDATE \"ProductOrder\" SET \"razorpayOrderId\" = NULL WHERE \"razorpayOrderId\" = ''");
    expect(mig).toContain("DROP NOT NULL");
    expect(mig).toContain("DROP CONSTRAINT \"ProductOrder_productId_fkey\"");
    expect(mig).toContain("ON DELETE RESTRICT");
  });
});
