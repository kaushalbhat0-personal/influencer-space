/**
 * RCCF-MKT-06.1 — Creator Scale live plan provisioning regression guards.
 *
 * Pins the persistence contract discovered during live provisioning:
 *   - an unchanged-price Pricing Center save must PRESERVE the existing
 *     DB-authoritative razorpayPlanId (it used to silently detach it);
 *   - a successful price-change reprovision must overwrite it;
 *   - a FAILED reprovision must retain the previous working contract;
 *   - the MKT-06 fail-closed LIVE guard remains armed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockUpsert: vi.fn(),
  mockVersionCreate: vi.fn(),
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
vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/modules/billing/application/runtime-config-loader", () => ({
  resetRuntimeConfigLoaderCache: vi.fn(),
}));
vi.mock("razorpay", () => ({
  __esModule: true,
  default: class {
    plans = { create: h.mockPlansCreate };
  },
}));

import { savePlanConfig } from "@/actions/super-admin-pricing.actions";
import type { PlanEditorInput } from "@/actions/super-admin-pricing.actions";

function scaleInput(overrides: Partial<PlanEditorInput> = {}): PlanEditorInput {
  return {
    code: "creator_scale",
    name: "Creator Scale",
    family: "creator",
    description: "Scale",
    targetAudience: null,
    monthlyPrice: 1999,
    annualPrice: 19990,
    trialDays: null,
    gracePeriodDays: 0,
    badge: "Best Value",
    ctaLabel: "Upgrade to Scale",
    ctaType: "checkout",
    comparisonOrder: 3,
    hidden: false,
    enterprise: false,
    popular: false,
    bestValue: true,
    recommended: false,
    colorAccent: null,
    highlights: [],
    capabilities: ["premium_themes"],
    featureOverrides: {},
    scheduled: [],
    ...overrides,
  };
}

const LIVE_KEY = () => {
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_live_unitTestKey";
  process.env.RAZORPAY_LIVE_PROVISIONING_AUTHORIZED = "1";
};

describe("MKT-06.1 — provider plan id persistence across Pricing Center saves", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_unitKey";
    delete process.env.RAZORPAY_LIVE_PROVISIONING_AUTHORIZED;
    h.mockGetServerSession.mockResolvedValue({ user: { role: "SUPER_ADMIN", email: "sa@test" } });
    h.mockUpsert.mockResolvedValue({ id: "plan-row" });
    h.mockVersionCreate.mockResolvedValue({ id: "v" });
    h.mockPlansCreate.mockReset();
  });

  it("preserves the existing razorpayPlanId when the price is unchanged", async () => {
    const EXISTING_ID = "plan_TTZhIq131KIkGH";
    h.mockFindUnique.mockResolvedValue({
      price: 1999,
      runtimeConfig: { pricing: { price: 1999, annualPrice: 19990, razorpayPlanId: EXISTING_ID } },
    });

    const res = await savePlanConfig(scaleInput({ changeNote: "unrelated marketing edit" }));

    expect(res.success).toBe(true);
    expect(h.mockPlansCreate).not.toHaveBeenCalled(); // no reprovision
    const rc = h.mockUpsert.mock.calls[0][0].update.runtimeConfig as { pricing?: { razorpayPlanId?: string | null } };
    expect(rc.pricing?.razorpayPlanId).toBe(EXISTING_ID);
  });

  it("leaves razorpayPlanId unset when no prior contract exists and price is unchanged", async () => {
    h.mockFindUnique.mockResolvedValue({ price: 1999, runtimeConfig: null });

    const res = await savePlanConfig(scaleInput());

    expect(res.success).toBe(true);
    expect(h.mockPlansCreate).not.toHaveBeenCalled();
    const rc = h.mockUpsert.mock.calls[0][0].update.runtimeConfig as { pricing?: { razorpayPlanId?: string | null } };
    expect(rc.pricing?.razorpayPlanId ?? null).toBeNull();
  });

  it("overwrites the stored id with the freshly provisioned one on a price change", async () => {
    h.mockPlansCreate.mockResolvedValue({ id: "plan_fresh_999" });
    h.mockFindUnique.mockResolvedValue({
      price: 1998,
      runtimeConfig: { pricing: { price: 1998, razorpayPlanId: "plan_old" } },
    });

    await savePlanConfig(scaleInput({ monthlyPrice: 1999 }));

    expect(h.mockPlansCreate).toHaveBeenCalledTimes(1);
    const rc = h.mockUpsert.mock.calls[0][0].update.runtimeConfig as { pricing?: { razorpayPlanId?: string | null } };
    expect(rc.pricing?.razorpayPlanId).toBe("plan_fresh_999");
  });

  it("retains the previous working contract when reprovisioning fails (non-fatal warning)", async () => {
    h.mockPlansCreate.mockRejectedValue(new Error("provider down"));
    h.mockFindUnique.mockResolvedValue({
      price: 1998,
      runtimeConfig: { pricing: { price: 1998, razorpayPlanId: "plan_still_valid" } },
    });

    const res = await savePlanConfig(scaleInput({ monthlyPrice: 1999 }));

    expect(res.success).toBe(true);
    expect(res.warning).toMatch(/provisioning failed/i);
    const rc = h.mockUpsert.mock.calls[0][0].update.runtimeConfig as { pricing?: { razorpayPlanId?: string | null } };
    expect(rc.pricing?.razorpayPlanId).toBe("plan_still_valid");
  });
});

describe("MKT-06.1 — fail-closed LIVE guard remains armed (regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.mockGetServerSession.mockResolvedValue({ user: { role: "SUPER_ADMIN", email: "sa@test" } });
    h.mockUpsert.mockResolvedValue({ id: "plan-row" });
    h.mockVersionCreate.mockResolvedValue({ id: "v" });
    h.mockPlansCreate.mockReset();
    delete process.env.RAZORPAY_LIVE_PROVISIONING_AUTHORIZED;
  });

  it("blocks provisioning under LIVE keys without explicit authorization", async () => {
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_live_unitTestKey";
    h.mockFindUnique.mockResolvedValue({ price: 1995, runtimeConfig: null });

    const res = await savePlanConfig(scaleInput({ monthlyPrice: 1999 }));

    expect(res.success).toBe(true);
    expect(res.warning).toMatch(/LIVE MODE CONFIRMATION REQUIRED/i);
    expect(h.mockPlansCreate).not.toHaveBeenCalled();
    // Price change path with blocked provisioning must NOT fabricate a stale id
    const rc = h.mockUpsert.mock.calls[0][0].update.runtimeConfig as { pricing?: { razorpayPlanId?: string | null } };
    expect(rc.pricing?.razorpayPlanId ?? null).toBeNull();
  });

  it("permits provisioning only with RAZORPAY_LIVE_PROVISIONING_AUTHORIZED=1", async () => {
    LIVE_KEY();
    h.mockPlansCreate.mockResolvedValue({ id: "plan_authorized_live" });
    h.mockFindUnique.mockResolvedValue({ price: 1995, runtimeConfig: null });

    const res = await savePlanConfig(scaleInput({ monthlyPrice: 1999 }));

    expect(res.success).toBe(true);
    expect(res.warning).toBeUndefined();
    expect(h.mockPlansCreate).toHaveBeenCalledTimes(1);
  });
});
