import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const h = vi.hoisted(() => ({
  mockPlansFindMany: vi.fn(),
  mockBillingPlanFindUnique: vi.fn(),
  mockProviderCreateCheckout: vi.fn(),
  mockCreateEvent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    billingPlan: {
      findMany: h.mockPlansFindMany,
      findUnique: h.mockBillingPlanFindUnique,
    },
    workspace: { findUnique: vi.fn(async () => null) },
    billingSubscription: { findUnique: vi.fn(async () => null) },
  },
}));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: {
    findPlanByCode: vi.fn(async (code: string) => {
      const map: Record<string, any> = {
        creator_grow: { code: "creator_grow", name: "Growth", family: "creator", price: 1099, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: { pricing: { price: 1099, annualPrice: 10990 } } },
      };
      return map[code] ?? null;
    }),
    findSubscriptionWithPlan: vi.fn(async () => null),
    isDuplicateEvent: vi.fn(async () => false),
    createEvent: h.mockCreateEvent,
    findSubscriptionByWorkspaceId: vi.fn(async () => null),
  },
}));

vi.mock("@/modules/billing/infrastructure/providers/razorpay", () => ({
  razorpayProvider: { createCheckout: h.mockProviderCreateCheckout },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn() } }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
vi.mock("@/lib/capabilities/plans", async () => {
  const actual = await vi.importActual<typeof import("@/lib/capabilities/plans")>("@/lib/capabilities/plans");
  return actual;
});
vi.mock("next-auth", () => ({ getServerSession: vi.fn(async () => ({ user: { role: "SUPER_ADMIN" } })) }));

beforeEach(() => {
  vi.clearAllMocks();
  h.mockPlansFindMany.mockResolvedValue([
    { code: "creator_launch", name: "Launch", family: "creator", price: 0, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: null },
    { code: "creator_grow", name: "Growth", family: "creator", price: 1099, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: { pricing: { price: 1099, annualPrice: 10990 } } },
    { code: "creator_scale", name: "Scale", family: "creator", price: 1999, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: null },
    { code: "creator_enterprise", name: "Enterprise", family: "creator", price: null, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: null },
  ]);
  h.mockProviderCreateCheckout.mockResolvedValue({ success: true, orderId: "order_test" });
  h.mockCreateEvent.mockResolvedValue({});
});

describe("RCCF-PRICING-AUTHORITY-02 — billing dashboard uses DB/runtime authority", () => {
  it("billingService.getPlans() reflects DB price 1099 not registry 999", async () => {
    const { billingService } = await import("@/modules/billing/application/service");
    const plans = await billingService.getPlans();
    const grow = plans.find((p) => p.code === "creator_grow")!;
    expect(grow.price).toBe(1099);
    expect(grow.price).not.toBe(999);
  });

  it("annual price comes from runtime pricing (10990) not registry fallback", async () => {
    const { getRuntimePlan } = await import("@/modules/pricing/application/runtime");
    const grow = await getRuntimePlan("creator_grow");
    expect(grow?.annualPrice).toBe(10990);
  });

  it("feature overrides still propagate via runtime (pricing change does not drop limits)", async () => {
    h.mockPlansFindMany.mockResolvedValue([
      { code: "creator_grow", name: "Growth", family: "creator", price: 1099, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: { pricing: { price: 1099 }, featureOverrides: { max_products: 42 } } },
    ]);
    const { getRuntimePlan } = await import("@/modules/pricing/application/runtime");
    const grow = await getRuntimePlan("creator_grow");
    expect(grow?.featureOverrides["max_products"]).toBe(42);
  });

  it("checkout uses DB price 1099 (same authority as marketing/billing)", async () => {
    const { billingService } = await import("@/modules/billing/application/service");
    const res = await billingService.createCheckout("ws-test", "creator_grow");
    expect(res.success).toBe(true);
    expect(h.mockProviderCreateCheckout).toHaveBeenCalledWith(expect.objectContaining({ price: 1099, planCode: "creator_grow" }));
  });

  it("marketing, billing dashboard and checkout all resolve from getRuntimePlansByFamily (single authority)", () => {
    const billingSrc = readFileSync(join(process.cwd(), "src/modules/billing/application/service.ts"), "utf8");
    expect(billingSrc).toContain("getRuntimePlansByFamily");
    expect(billingSrc).not.toMatch(/getPlansByFamily\(\s*["']creator["']\s*\)\s*;/);

    const marketingSrc = readFileSync(join(process.cwd(), "src/app/pricing/page.tsx"), "utf8");
    expect(marketingSrc).toContain("getPublicPricingData");
    const runtimeSrc = readFileSync(join(process.cwd(), "src/modules/pricing/application/runtime.ts"), "utf8");
    expect(runtimeSrc).toContain("prisma.billingPlan.findMany");
  });

  it("no duplicate pricing resolver is introduced in BillingService", () => {
    const svc = readFileSync(join(process.cwd(), "src/modules/billing/application/service.ts"), "utf8");
    // BillingService must reuse shared resolver, not duplicate findMany
    const occurrences = (svc.match(/prisma\.billingPlan\.findMany/g) || []).length;
    expect(occurrences).toBe(0);
  });
});
