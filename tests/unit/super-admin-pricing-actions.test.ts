import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockUpsert: vi.fn(),
  mockVersionCreate: vi.fn(),
  mockResetCache: vi.fn(),
  mockLogAction: vi.fn(),
  mockFindUnique: vi.fn(),
  mockPlansCreate: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    billingPlan: { upsert: h.mockUpsert, findUnique: h.mockFindUnique },
    planPricingVersion: { create: h.mockVersionCreate },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/modules/billing/infrastructure/catalog-seed", () => ({ seedBillingCatalog: vi.fn() }));
vi.mock("@/modules/billing/application/runtime-config-loader", () => ({ resetRuntimeConfigLoaderCache: h.mockResetCache }));
vi.mock("razorpay", () => ({
  __esModule: true,
  default: class {
    plans = { create: h.mockPlansCreate };
  },
}));

import { savePlanConfig } from "@/actions/super-admin-pricing.actions";
import type { PlanEditorInput } from "@/actions/super-admin-pricing.actions";

const input: PlanEditorInput = {
  code: "creator_grow",
  name: "Creator Growth",
  family: "creator",
  description: "Growth plan",
  targetAudience: null,
  monthlyPrice: 999,
  annualPrice: 9990,
  trialDays: 15,
  gracePeriodDays: 7,
  badge: null,
  ctaLabel: "Upgrade",
  ctaType: "checkout",
  comparisonOrder: 2,
  hidden: false,
  enterprise: false,
  popular: false,
  bestValue: false,
  recommended: false,
  colorAccent: null,
  highlights: [],
  capabilities: ["premium_themes"],
  featureOverrides: { max_products: 20 },
  scheduled: [],
  changeNote: "test",
};

beforeEach(() => {
  vi.clearAllMocks();
  h.mockGetServerSession.mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "sa1", name: "Admin", email: "a@b.c" } });
  h.mockUpsert.mockResolvedValue({ id: "plan-1" });
  h.mockVersionCreate.mockResolvedValue({ id: "v-1" });
  h.mockLogAction.mockResolvedValue(undefined);
  h.mockFindUnique.mockResolvedValue({ price: 699, runtimeConfig: null });
  h.mockPlansCreate.mockResolvedValue({ id: "plan_prov_1" });
});

describe("savePlanConfig — RCCF-35 enforcement propagation", () => {
  it("flushes the cached runtime feature overrides after persisting", async () => {
    const res = await savePlanConfig(input);

    expect(res).toEqual({ success: true, planId: "plan-1" });
    expect(h.mockUpsert).toHaveBeenCalled();
    expect(h.mockResetCache).toHaveBeenCalledTimes(1);
  });

  it("persists the edited limit into runtimeConfig.featureOverrides", async () => {
    await savePlanConfig(input);

    const [args] = h.mockUpsert.mock.calls[0] as [{ update: { runtimeConfig: { featureOverrides: Record<string, unknown>; pricing: { price: number } } } }];
    expect(args.update.runtimeConfig.featureOverrides.max_products).toBe(20);
    expect(args.update.runtimeConfig.pricing.price).toBe(999);
  });

  it("rejects non-super-admins without touching the DB or cache", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { role: "CREATOR", id: "c1" } });

    const res = await savePlanConfig(input);

    expect(res.success).toBe(false);
    expect(h.mockUpsert).not.toHaveBeenCalled();
    expect(h.mockResetCache).not.toHaveBeenCalled();
  });
});

describe("savePlanConfig — RCCF-36 Razorpay plan provisioning + publishing policy", () => {
  it("provisions a NEW Razorpay plan when the price changed and stores its id", async () => {
    h.mockFindUnique.mockResolvedValue({ price: 699, runtimeConfig: null });

    const res = await savePlanConfig(input);

    expect(res.success).toBe(true);
    expect(h.mockPlansCreate).toHaveBeenCalledTimes(1);
    const [args] = h.mockUpsert.mock.calls[0] as [{ update: { runtimeConfig: { pricing: { price: number; razorpayPlanId?: string } } } }];
    expect(args.update.runtimeConfig.pricing.razorpayPlanId).toBe("plan_prov_1");
  });

  it("does NOT create a new Razorpay plan when the price is unchanged", async () => {
    h.mockFindUnique.mockResolvedValue({ price: 999, runtimeConfig: null });

    await savePlanConfig(input);

    expect(h.mockPlansCreate).not.toHaveBeenCalled();
  });

  it("surfaces a warning (non-fatal) when Razorpay provisioning fails", async () => {
    h.mockFindUnique.mockResolvedValue({ price: 699, runtimeConfig: null });
    h.mockPlansCreate.mockRejectedValue(new Error("razorpay down"));

    const res = await savePlanConfig(input);

    expect(res.success).toBe(true);
    expect(res.warning).toContain("Razorpay plan provisioning failed");
  });

  it("persists the publish policy into runtimeConfig.publishing", async () => {
    h.mockFindUnique.mockResolvedValue({ price: 999, runtimeConfig: null });

    await savePlanConfig({ ...input, publishing: { mode: "monthly", limit: 25 } });

    const [args] = h.mockUpsert.mock.calls[0] as [{ update: { runtimeConfig: { publishing: { mode: string; limit: number } } } }];
    expect(args.update.runtimeConfig.publishing).toEqual({ mode: "monthly", limit: 25 });
  });

  it("rejects an invalid publish policy (negative limit)", async () => {
    const res = await savePlanConfig({ ...input, publishing: { mode: "lifetime", limit: -1 } });

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/non-negative integer/i);
    expect(h.mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects an invalid publish mode", async () => {
    const res = await savePlanConfig({ ...input, publishing: { mode: "weekly" as never, limit: 5 } });

    expect(res.success).toBe(false);
    expect(h.mockUpsert).not.toHaveBeenCalled();
  });
});
