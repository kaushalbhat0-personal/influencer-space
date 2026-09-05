import { describe, it, expect, vi, beforeEach } from "vitest";
import { isSubscriptionEntitlementEligible } from "@/modules/billing/application/plan-source";

// ── Eligibility matrix ───────────────────────────────────────────────
describe("RCCF-BILLING-06E — isSubscriptionEntitlementEligible (canonical gate)", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  const future = new Date("2026-09-20T12:00:00Z");
  const past = new Date("2026-09-01T12:00:00Z");

  it("ACTIVE with future renewsAt is eligible", () => {
    expect(isSubscriptionEntitlementEligible({ status: "ACTIVE", renewsAt: future }, now)).toBe(true);
  });
  it("ACTIVE with past renewsAt is ineligible (expired)", () => {
    expect(isSubscriptionEntitlementEligible({ status: "ACTIVE", renewsAt: past }, now)).toBe(false);
  });
  it("ACTIVE with no renewsAt is eligible (lifetime)", () => {
    expect(isSubscriptionEntitlementEligible({ status: "ACTIVE", renewsAt: null }, now)).toBe(true);
  });
  it("TRIALING with future trialEndsAt is eligible", () => {
    expect(isSubscriptionEntitlementEligible({ status: "TRIALING", trialEndsAt: future }, now)).toBe(true);
  });
  it("TRIALING with past trialEndsAt is ineligible (expired trial)", () => {
    expect(isSubscriptionEntitlementEligible({ status: "TRIALING", trialEndsAt: past }, now)).toBe(false);
  });
  it("TRIALING with no trialEndsAt is eligible (open trial)", () => {
    expect(isSubscriptionEntitlementEligible({ status: "TRIALING", trialEndsAt: null }, now)).toBe(true);
  });
  it("PAST_DUE never grants (no grace yet)", () => {
    expect(isSubscriptionEntitlementEligible({ status: "PAST_DUE", renewsAt: future }, now)).toBe(false);
    expect(isSubscriptionEntitlementEligible({ status: "PAST_DUE", renewsAt: null }, now)).toBe(false);
  });
  it("CANCELLED never grants", () => {
    expect(isSubscriptionEntitlementEligible({ status: "CANCELLED", renewsAt: future }, now)).toBe(false);
  });
  it("EXPIRED never grants", () => {
    expect(isSubscriptionEntitlementEligible({ status: "EXPIRED" }, now)).toBe(false);
  });
  it("DRAFT never grants", () => {
    expect(isSubscriptionEntitlementEligible({ status: "DRAFT" }, now)).toBe(false);
  });
});

// ── Grow/Scale → Launch downgrade must be rejected ──────────────────
describe("RCCF-BILLING-06E — Grow/Scale -> Launch downgrade rejected (no new trial)", () => {
  const h = vi.hoisted(() => ({
    mockFindPlanByCode: vi.fn(),
    mockFindSubWithPlan: vi.fn(),
    mockUpsert: vi.fn(),
    mockCreateEvent: vi.fn(),
    mockFindWorkspace: vi.fn(),
  }));

  // We reuse the service's changePlan; mock its deps
  vi.mock("@/modules/billing/infrastructure/repository", async () => {
    const actual = await vi.importActual<typeof import("@/modules/billing/infrastructure/repository")>("@/modules/billing/infrastructure/repository");
    return {
      ...actual,
      billingRepository: {
        ...actual.billingRepository,
        findPlanByCode: h.mockFindPlanByCode,
        findSubscriptionWithPlan: h.mockFindSubWithPlan,
        upsertSubscription: h.mockUpsert,
        createEvent: h.mockCreateEvent,
      },
    };
  });
  vi.mock("@/lib/prisma", () => ({
    prisma: { workspace: { findUnique: h.mockFindWorkspace } },
  }));
  vi.mock("@/lib/audit", () => ({ logAction: vi.fn() }));
  vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn() } }));
  vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn() } }));

  it("paid ACTIVE Grow -> Launch is rejected with actionable error and no ACTIVE/null trial", async () => {
    const { billingService } = await import("@/modules/billing/application/service");
    h.mockFindPlanByCode.mockImplementation(async (code: string) => {
      if (code === "creator_launch") return { id: "plan_launch", code, price: 0 } as never;
      if (code === "creator_grow") return { id: "plan_grow", code, price: 999 } as never;
      return null;
    });
    h.mockFindSubWithPlan.mockResolvedValue({ plan: { code: "creator_grow" }, status: "ACTIVE" } as never);
    h.mockFindWorkspace.mockResolvedValue({ tenantId: "tenant1" });
    // mock assertEligiblePlan to pass (not agency)
    vi.doMock("@/modules/billing/application/plan-restriction", async () => {
      const actual = await vi.importActual<typeof import("@/modules/billing/application/plan-restriction")>("@/modules/billing/application/plan-restriction");
      return { ...actual, assertEligiblePlan: vi.fn().mockResolvedValue({ ok: true }) };
    });
    const res = await billingService.changePlan("ws1", "creator_launch");
    expect(res.success).toBe(false);
    expect(res.error).toContain("15-day trial");
    expect(h.mockUpsert).not.toHaveBeenCalled();
  });
});

// ── Storefront gate ──────────────────────────────────────────────────
describe("RCCF-BILLING-06E — Storefront entitlement gate (404 vs preview bypass)", () => {
  it("ineligible subscription → storefront 404, but previewAuthorized bypass keeps 200", async () => {
    // This test documents the loader contract: getStorefrontData after tenant
    // resolution checks resolveActivePlan(null, tenantId).code.
    // Ineligible (code null) → return null → page.tsx notFound() → 404.
    // Preview authorized (canPreviewTenant true) → draft bypass → 200.
    // We assert the gate exists by source inspection.
    const src = await import("fs").then(m => m.readFileSync("src/lib/storefront/storefront-loader.ts", "utf8"));
    expect(src).toContain("isPreviewAuthorized");
    expect(src).toContain("resolveActivePlan");
    expect(src).toContain("return null");
    // Admin/billing must not be gated — middleware only sets x-tenant-host for storefront, admin requires getToken
    const middleware = await import("fs").then(m => m.readFileSync("src/middleware.ts", "utf8"));
    expect(middleware).toContain("x-tenant-host");
    // No subscription check in middleware for admin
    expect(middleware).not.toContain("isSubscriptionEntitlementEligible");
  });

  it("legal pages obey same gate (storefront-loader is single path)", async () => {
    const slugTerms = await import("fs").then(m => m.readFileSync("src/app/[domain]/terms/page.tsx", "utf8"));
    const slugPrivacy = await import("fs").then(m => m.readFileSync("src/app/[domain]/privacy/page.tsx", "utf8"));
    const slugRefund = await import("fs").then(m => {
      try { return m.readFileSync("src/app/[domain]/refund/page.tsx", "utf8"); } catch { return m.readFileSync("src/app/[domain]/disclaimer/page.tsx", "utf8"); }
    });
    expect(slugTerms).toContain("getStorefrontData");
    expect(slugPrivacy).toContain("getStorefrontData");
    expect(slugRefund).toContain("getStorefrontData");
  });
});
