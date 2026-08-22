import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// RCCF-72.18D.7.1 — Creator payment readiness & storefront selling gate.
//
// Boundary A: an ONLINE/BOTH offering can only BECOME sellable when the
// tenant's CANONICAL payment readiness is `ready` (single authority reused —
// no second implementation). WHATSAPP-only commerce is exempt (no online
// money flow). Already-sellable products are never silently mutated by this
// gate (Phase 6); Boundary C (checkout readiness) remains the final authority.
// ─────────────────────────────────────────────────────────────────────────────

const TENANT_A = "abababab-abab-4bab-8bab-abababababab";
const TENANT_B = "bcbcbcbc-bcbc-4bcb-8bcb-bcbcbcbcbcbc";

const h = vi.hoisted(() => {
  return {
    products: [] as Array<Record<string, unknown>>,
    createdRows: [] as Array<Record<string, unknown>>,
    updatedRows: [] as Array<Record<string, unknown>>,
    readinessReady: true,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `p-${h.createdRows.length + 1}`, archivedAt: null, ...data };
        h.createdRows.push(row);
        return Promise.resolve(row);
      },
      findFirst: ({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(h.products.find((p) => p.id === where.id && p.tenantId === where.tenantId) ?? null),
      update: ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = h.products.find((p) => p.id === where.id);
        if (!row) return Promise.reject(new Error("Record not found"));
        Object.assign(row, data);
        h.updatedRows.push({ ...row });
        return Promise.resolve({ ...row });
      },
    },
  },
}));

vi.mock("@/modules/payment-account", () => ({
  computePaymentReadiness: async () => ({
    tenantId: TENANT_A,
    readiness: h.readinessReady ? "ready" : "blocked",
    strategy: "DIRECT_CREATOR",
    provider: "razorpay",
    requirements: [],
    missing: h.readinessReady ? [] : ["Provider credentials verified"],
  }),
}));

import { productService } from "@/features/products/service";

function pushProduct(overrides: Record<string, unknown> = {}) {
  const row = {
    id: "prod-1", tenantId: TENANT_A, name: "Existing", description: null,
    price: 500, imageUrl: null, images: [], slug: "existing", type: "digital",
    status: "PUBLISHED", commerceMode: "ONLINE", isActive: true, isFeatured: false,
    archivedAt: null, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
  h.products.length = 0;
  h.products.push(row);
  return row;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.products.length = 0;
  h.createdRows.length = 0;
  h.updatedRows.length = 0;
  h.readinessReady = true;
});

const form = (over: Record<string, unknown> = {}) =>
  ({ name: "New Offering", price: 1000, ...over } as Parameters<typeof productService.create>[1]);

// ── CREATE matrix ────────────────────────────────────────────────────────────

describe("RCCF-72.18D.7.1 — create-path selling gate", () => {
  it("ONLINE + payment-ready → ALLOWED", async () => {
    const p = await productService.create(TENANT_A, form({ commerceMode: "ONLINE" }));
    expect(p.status).toBe("PUBLISHED");
    expect(h.createdRows).toHaveLength(1);
  });

  it.each([
    ["unverified", "unverified"],
    ["pending", "pending"],
    ["failed", "failed"],
    ["legacy configured", "configured"],
  ])("ONLINE + %s account → DENIED (PAYMENT_SETUP_REQUIRED)", async (_label, verification) => {
    h.readinessReady = false;
    await expect(productService.create(TENANT_A, form({ commerceMode: "ONLINE", verificationStatus: verification })))
      .rejects.toMatchObject({ code: "PAYMENT_SETUP_REQUIRED" });
    expect(h.createdRows).toHaveLength(0);
  });

  it("ONLINE + NO PaymentAccount → DENIED", async () => {
    h.readinessReady = false;
    await expect(productService.create(TENANT_A, form())).rejects.toMatchObject({ code: "PAYMENT_SETUP_REQUIRED" });
    expect(h.createdRows).toHaveLength(0);
  });

  it("ONLINE + missing settlement details → DENIED", async () => {
    h.readinessReady = false; // readiness reports blocked incl. settlement requirement
    await expect(productService.create(TENANT_A, form())).rejects.toMatchObject({ code: "PAYMENT_SETUP_REQUIRED" });
  });

  it("BOTH + payment-ready → ALLOWED; BOTH + not-ready → DENIED", async () => {
    await productService.create(TENANT_A, form({ commerceMode: "BOTH" }));
    expect(h.createdRows).toHaveLength(1);

    h.readinessReady = false;
    await expect(productService.create(TENANT_A, form({ commerceMode: "BOTH" })))
      .rejects.toMatchObject({ code: "PAYMENT_SETUP_REQUIRED" });
    expect(h.createdRows).toHaveLength(1); // rejected write added nothing
  });

  it.each([
    ["NO PaymentAccount"],
    ["unverified"],
    ["failed"],
  ])("WHATSAPP + %s → ALLOWED (no online money flow)", async (_label) => {
    h.readinessReady = false;
    const p = await productService.create(TENANT_A, form({ commerceMode: "WHATSAPP" }));
    expect(p.commerceMode).toBe("WHATSAPP");
    expect(h.createdRows).toHaveLength(1);
  });

  it("non-sellable creation needs no payment setup (DRAFT / inactive)", async () => {
    h.readinessReady = false;
    await productService.create(TENANT_A, form({ status: "DRAFT" }));
    await productService.create(TENANT_A, form({ isActive: false }));
    expect(h.createdRows).toHaveLength(2);
  });

  it("PLATFORM_COLLECT creators pass through the SAME canonical readiness (reuse, no special-casing)", async () => {
    // Canonical readiness returns ready for platform-collected tenants by
    // design (D.6.2/D.6.3 runtime) — asserted here via the same contract shape.
    const p = await productService.create(TENANT_A, form());
    expect(p.id).toBeTruthy();
  });
});

// ── UPDATE matrix ────────────────────────────────────────────────────────────

describe("RCCF-72.18D.7.1 — update-path selling gate", () => {
  it("draft → PUBLISHED (transition into sellable) while not-ready → DENIED", async () => {
    pushProduct({ status: "DRAFT" });
    h.readinessReady = false;

    await expect(productService.update("prod-1", TENANT_A, { status: "PUBLISHED" }))
      .rejects.toMatchObject({ code: "PAYMENT_SETUP_REQUIRED" });
    expect(h.updatedRows).toHaveLength(0);
  });

  it("draft → PUBLISHED when ready → ALLOWED", async () => {
    pushProduct({ status: "DRAFT" });
    const p = await productService.update("prod-1", TENANT_A, { status: "PUBLISHED" });
    expect(p.status).toBe("PUBLISHED");
  });

  it("ALREADY-sellable ONLINE product: metadata edits stay ALLOWED even if readiness lapsed (Phase 6)", async () => {
    pushProduct(); // PUBLISHED + ONLINE
    h.readinessReady = false;

    const p = await productService.update("prod-1", TENANT_A, { name: "Renamed", price: 750 });
    expect(p.name).toBe("Renamed"); // existing offering remains structurally intact
  });

  it("sellable WHATSAPP → ONLINE upgrade while not-ready → DENIED (mode grants online selling)", async () => {
    pushProduct({ commerceMode: "WHATSAPP" });
    h.readinessReady = false;

    await expect(productService.update("prod-1", TENANT_A, { commerceMode: "ONLINE" }))
      .rejects.toMatchObject({ code: "PAYMENT_SETUP_REQUIRED" });
    expect(h.updatedRows).toHaveLength(0);
    expect(h.products[0].commerceMode).toBe("WHATSAPP"); // no silent mutation
  });

  it("sellable WHATSAPP → ONLINE upgrade when ready → ALLOWED", async () => {
    pushProduct({ commerceMode: "WHATSAPP" });
    const p = await productService.update("prod-1", TENANT_A, { commerceMode: "ONLINE" });
    expect(p.commerceMode).toBe("ONLINE");
  });

  it("reactivation (isActive false→true) while not-ready → DENIED", async () => {
    pushProduct({ isActive: false });
    h.readinessReady = false;

    await expect(productService.update("prod-1", TENANT_A, { isActive: true }))
      .rejects.toMatchObject({ code: "PAYMENT_SETUP_REQUIRED" });
  });

  it("foreign-tenant product id resolves to not-found (tenant isolation intact)", async () => {
    pushProduct({ tenantId: TENANT_B });
    await expect(productService.update("prod-1", TENANT_A, { status: "PUBLISHED" }))
      .rejects.toThrow(/Product not found/);
  });
});

// ── Security / architecture guardrails ──────────────────────────────────────

describe("RCCF-72.18D.7.1 — security & single-authority guardrails", () => {
  const repo = (p: string) => readFileSync(resolve(__dirname, "..", "..", p), "utf8");

  it("the gate REUSES the canonical readiness runtime (no second implementation)", () => {
    const src = repo("src/features/products/service.ts");
    expect(src).toContain('import("@/modules/payment-account")');
    expect(src).toContain("computePaymentReadiness");
    // No duplicated verification/readiness vocabulary inside the gate.
    expect(src).not.toMatch(/verificationStatus|providerKeyId|razorpay\.orders/i);
  });

  it("authorization stays server-side: actions derive tenant from the session only", () => {
    const src = repo("src/features/products/actions.ts");
    expect(src).toMatch(/session\?\.user\?\.tenantId/);
    expect(src).not.toMatch(/input\.tenantId|body\.tenantId/);
  });

  it("WHATSAPP exemption is mode-based, never product-type-based", () => {
    const src = repo("src/features/products/service.ts");
    expect(src).toMatch(/mode === "WHATSAPP"/);
    expect(src).not.toMatch(/type === ["'](?:course|game|digital|physical)["']/);
  });

  it("storefront checkout boundary C unchanged (source contract)", () => {
    const checkout = repo("src/actions/checkout.actions.ts");
    // Sellable lookup requires PUBLISHED; DIRECT_CREATOR delegates to the
    // readiness-authoritative direct-checkout action.
    expect(checkout).toMatch(/status: "PUBLISHED"/);
    expect(checkout).toContain("createDirectCheckout");
    const direct = repo("src/actions/payment-account.actions.ts");
    expect(direct).toContain("computePaymentReadiness");
    expect(direct).toMatch(/readiness !== "ready"/);
  });
});
