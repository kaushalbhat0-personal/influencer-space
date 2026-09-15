import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const h = vi.hoisted(() => ({
  mockPlansCreate: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpsert: vi.fn(),
  mockSubscriptionsCreate: vi.fn(),
  mockOrdersCreate: vi.fn(),
  mockGetServerSession: vi.fn(),
}));

vi.mock("razorpay", () => ({
  __esModule: true,
  default: class {
    plans = { create: h.mockPlansCreate };
    subscriptions = { create: h.mockSubscriptionsCreate };
    orders = { create: h.mockOrdersCreate };
  },
}));

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    billingPlan: { findUnique: h.mockFindUnique, upsert: h.mockUpsert, findMany: vi.fn(async () => []) },
    planPricingVersion: { create: vi.fn(async () => ({ id: "v" })) },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
vi.mock("@/modules/billing/application/runtime-config-loader", () => ({ resetRuntimeConfigLoaderCache: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn() } }));

describe("RCCF-15B — runtime config typed monthly + yearly plan IDs", () => {
  it("PlanRuntimeConfig.pricing has typed razorpayPlanId and razorpayYearlyPlanId", () => {
    const src = readFileSync(join(process.cwd(), "src/modules/pricing/application/runtime.ts"), "utf8");
    expect(src).toContain("razorpayPlanId?: string | null");
    expect(src).toContain("razorpayYearlyPlanId?: string | null");
    expect(src).not.toContain("(rc.pricing as unknown).razorpayYearlyPlanId");
    expect(src).toContain("razorpayYearlyPlanId: p?.razorpayYearlyPlanId ?? null");
  });

  it("getRuntimePlan exposes both IDs", async () => {
    const { mergeRuntimePlan } = await import("@/modules/pricing/application/runtime");
    const { getCommercePlan } = await import("@/config/commerce/plans");
    const defaults = getCommercePlan("creator_grow")!;
    const merged = mergeRuntimePlan(defaults, { pricing: { price: 999, annualPrice: 9990, razorpayPlanId: "plan_monthly_999", razorpayYearlyPlanId: "plan_yearly_9990" } });
    expect(merged.razorpayPlanId).toBe("plan_monthly_999");
    expect(merged.razorpayYearlyPlanId).toBe("plan_yearly_9990");
  });
});

describe("RCCF-15B — provider monthly vs yearly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.mockSubscriptionsCreate.mockResolvedValue({ id: "sub_x" });
    h.mockOrdersCreate.mockResolvedValue({ id: "order_x" });
  });

  it("monthly uses monthly planId total_count 12", async () => {
    const { razorpayProvider } = await import("@/modules/billing/infrastructure/providers/razorpay");
    await razorpayProvider.createCheckout({ planCode: "creator_grow", accountId: "ws-1", currency: "INR", price: 999, razorpayPlanId: "plan_monthly_999", cycle: "monthly" });
    expect(h.mockSubscriptionsCreate).toHaveBeenCalledWith(expect.objectContaining({ plan_id: "plan_monthly_999", total_count: 12 }));
  });

  it("yearly uses yearly planId total_count 1 and does NOT use monthly plan", async () => {
    const { razorpayProvider } = await import("@/modules/billing/infrastructure/providers/razorpay");
    await razorpayProvider.createCheckout({ planCode: "creator_grow", accountId: "ws-1", currency: "INR", price: 9990, razorpayPlanId: "plan_yearly_9990", cycle: "yearly" });
    expect(h.mockSubscriptionsCreate).toHaveBeenCalledWith(expect.objectContaining({ plan_id: "plan_yearly_9990", total_count: 1 }));
    expect(h.mockSubscriptionsCreate).not.toHaveBeenCalledWith(expect.objectContaining({ plan_id: "plan_monthly_999" }));
  });

  it("yearly without yearly plan falls back to ORDER at annual amount, not monthly plan", async () => {
    const { razorpayProvider } = await import("@/modules/billing/infrastructure/providers/razorpay");
    // razorpayPlanId null (yearly not provisioned) -> should be ORDER, not subscription with monthly plan
    await razorpayProvider.createCheckout({ planCode: "creator_grow", accountId: "ws-1", currency: "INR", price: 9990, razorpayPlanId: null, cycle: "yearly" });
    expect(h.mockSubscriptionsCreate).not.toHaveBeenCalled();
    expect(h.mockOrdersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 999000 }));
  });

  it("smokeTest always bypasses both plan IDs to ORDER 100", async () => {
    const { razorpayProvider } = await import("@/modules/billing/infrastructure/providers/razorpay");
    await razorpayProvider.createCheckout({ planCode: "creator_grow", accountId: "ws-1", currency: "INR", price: 1, razorpayPlanId: "plan_monthly_999", smokeTest: true, cycle: "monthly" });
    expect(h.mockSubscriptionsCreate).not.toHaveBeenCalled();
    expect(h.mockOrdersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 100 }));
    vi.clearAllMocks();
    h.mockOrdersCreate.mockResolvedValue({ id: "order_y" });
    await razorpayProvider.createCheckout({ planCode: "creator_grow", accountId: "ws-1", currency: "INR", price: 1, razorpayPlanId: "plan_yearly_9990", smokeTest: true, cycle: "yearly" });
    expect(h.mockSubscriptionsCreate).not.toHaveBeenCalled();
    expect(h.mockOrdersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 100 }));
  });

  it("legacy 699 plan can never be selected", async () => {
    const { razorpayProvider } = await import("@/modules/billing/infrastructure/providers/razorpay");
    await razorpayProvider.createCheckout({ planCode: "creator_grow", accountId: "ws-1", currency: "INR", price: 999, razorpayPlanId: "plan_TLTGQBU1EXkseF", cycle: "monthly" });
    expect(h.mockSubscriptionsCreate).not.toHaveBeenCalled();
    expect(h.mockOrdersCreate).toHaveBeenCalled();
  });
});

describe("RCCF-15B — Pricing Center provisions monthly+yearly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.mockGetServerSession.mockResolvedValue({ user: { role: "SUPER_ADMIN", email: "sa@test" } });
    h.mockFindUnique.mockResolvedValue(null);
    h.mockUpsert.mockResolvedValue({ id: "plan-row" });
    h.mockPlansCreate.mockImplementation(async (args: any) => {
      if (args.period === "monthly") return { id: "plan_monthly_999" };
      if (args.period === "yearly") return { id: "plan_yearly_9990" };
      return { id: "plan_x" };
    });
  });

  it("monthly 999 + annual 9990 creates both plans and persists both IDs", async () => {
    const { savePlanConfig } = await import("@/actions/super-admin-pricing.actions");
    // need to set live auth for test
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_dummy";
    const res = await savePlanConfig({
      code: "creator_grow",
      name: "Growth",
      family: "creator",
      description: "d",
      targetAudience: null,
      monthlyPrice: 999,
      annualPrice: 9990,
      trialDays: null,
      gracePeriodDays: 0,
      badge: null,
      ctaLabel: "Upgrade",
      ctaType: "checkout",
      comparisonOrder: 2,
      hidden: false,
      enterprise: false,
      popular: true,
      bestValue: false,
      recommended: true,
      colorAccent: null,
      highlights: [],
      capabilities: [],
      featureOverrides: {},
      scheduled: [],
      changeNote: "provision both",
    });
    expect(res.success).toBe(true);
    expect(h.mockPlansCreate).toHaveBeenCalledTimes(2);
    const calls = h.mockPlansCreate.mock.calls.map((c: any) => c[0]);
    expect(calls.find((c: any) => c.period === "monthly")?.item.amount).toBe(99900);
    expect(calls.find((c: any) => c.period === "yearly")?.item.amount).toBe(999000);
    const upsertArg = h.mockUpsert.mock.calls[0][0];
    const rc = upsertArg.update.runtimeConfig;
    expect(rc.pricing.razorpayPlanId).toBe("plan_monthly_999");
    expect(rc.pricing.razorpayYearlyPlanId).toBe("plan_yearly_9990");
  });

  it("partial failure: monthly succeeds yearly fails -> no fake yearly ID persisted", async () => {
    h.mockPlansCreate.mockImplementation(async (args: any) => {
      if (args.period === "monthly") return { id: "plan_monthly_999" };
      throw new Error("yearly provider error");
    });
    const { savePlanConfig } = await import("@/actions/super-admin-pricing.actions");
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_dummy";
    const res = await savePlanConfig({
      code: "creator_grow",
      name: "Growth",
      family: "creator",
      description: "d",
      targetAudience: null,
      monthlyPrice: 999,
      annualPrice: 9990,
      trialDays: null,
      gracePeriodDays: 0,
      badge: null,
      ctaLabel: "Upgrade",
      ctaType: "checkout",
      comparisonOrder: 2,
      hidden: false,
      enterprise: false,
      popular: true,
      bestValue: false,
      recommended: true,
      colorAccent: null,
      highlights: [],
      capabilities: [],
      featureOverrides: {},
      scheduled: [],
      changeNote: "partial",
    });
    expect(res.success).toBe(true);
    expect(res.warning).toMatch(/yearly/);
    const rc = h.mockUpsert.mock.calls[0][0].update.runtimeConfig;
    expect(rc.pricing.razorpayPlanId).toBe("plan_monthly_999");
    expect(rc.pricing.razorpayYearlyPlanId).toBeNull();
  });

  it("duplicate save without price change does not create new plans", async () => {
    h.mockFindUnique.mockResolvedValue({ price: 999, runtimeConfig: { pricing: { price: 999, annualPrice: 9990, razorpayPlanId: "plan_monthly_999", razorpayYearlyPlanId: "plan_yearly_9990" } } });
    const { savePlanConfig } = await import("@/actions/super-admin-pricing.actions");
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_dummy";
    const res = await savePlanConfig({
      code: "creator_grow",
      name: "Growth",
      family: "creator",
      description: "d",
      targetAudience: null,
      monthlyPrice: 999,
      annualPrice: 9990,
      trialDays: null,
      gracePeriodDays: 0,
      badge: null,
      ctaLabel: "Upgrade",
      ctaType: "checkout",
      comparisonOrder: 2,
      hidden: false,
      enterprise: false,
      popular: true,
      bestValue: false,
      recommended: true,
      colorAccent: null,
      highlights: [],
      capabilities: [],
      featureOverrides: {},
      scheduled: [],
      changeNote: "no change",
    });
    expect(h.mockPlansCreate).not.toHaveBeenCalled();
    const rc = h.mockUpsert.mock.calls[0][0].update.runtimeConfig;
    expect(rc.pricing.razorpayPlanId).toBe("plan_monthly_999");
    expect(rc.pricing.razorpayYearlyPlanId).toBe("plan_yearly_9990");
  });
});
