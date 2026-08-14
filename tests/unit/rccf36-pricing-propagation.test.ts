import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockPlansFindMany: vi.fn(),
  mockFindPlanByCode: vi.fn(),
  mockCreateEvent: vi.fn(),
  mockProviderCreateCheckout: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { billingPlan: { findMany: h.mockPlansFindMany } },
}));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: { findPlanByCode: h.mockFindPlanByCode, createEvent: h.mockCreateEvent },
}));

vi.mock("@/modules/billing/infrastructure/providers/razorpay", () => ({
  razorpayProvider: { createCheckout: h.mockProviderCreateCheckout },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn() } }));

import { billingService } from "@/modules/billing/application/service";
import { getRuntimePlan } from "@/modules/pricing/application/runtime";

const DB_ROW = (price: number, rc: unknown) => ({
  code: "creator_grow",
  name: "Creator Growth",
  family: "creator",
  price,
  currency: "INR",
  status: "ACTIVE",
  gracePeriodDays: 0,
  runtimeConfig: rc,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.mockPlansFindMany.mockReset();
  h.mockFindPlanByCode.mockReset();
  h.mockProviderCreateCheckout.mockReset();
  h.mockProviderCreateCheckout.mockResolvedValue({ success: true, orderId: "o1", providerOrderId: "o1" });
  h.mockCreateEvent.mockResolvedValue({});
});

describe("RCCF-36 — price propagation: Super Admin → DB → runtime", () => {
  it("runtime sees the new Growth price (999) after a Super Admin save", async () => {
    h.mockPlansFindMany.mockResolvedValue([DB_ROW(999, { pricing: { price: 999 } })]);
    const plan = await getRuntimePlan("creator_grow");
    expect(plan?.price).toBe(999);
  });

  it("runtime sees the new Scale price (1995) after a Super Admin save", async () => {
    h.mockPlansFindMany.mockResolvedValue([
      DB_ROW(999, { pricing: { price: 999 } }),
      { ...DB_ROW(1995, { pricing: { price: 1995 } }), code: "creator_scale" },
    ]);
    const plan = await getRuntimePlan("creator_scale");
    expect(plan?.price).toBe(1995);
  });

  it("runtime falls back to the registry default when no DB row exists", async () => {
    h.mockPlansFindMany.mockResolvedValue([]);
    expect((await getRuntimePlan("creator_grow"))?.price).toBe(999);
    expect((await getRuntimePlan("creator_scale"))?.price).toBe(1995);
  });
});

describe("RCCF-36 — checkout uses the DB-authoritative price + provisioned plan id", () => {
  it("passes the DB price and provisioned razorpayPlanId to the provider", async () => {
    h.mockFindPlanByCode.mockResolvedValue(
      DB_ROW(999, { pricing: { price: 999, razorpayPlanId: "plan_prov_1" } }),
    );

    const res = await billingService.createCheckout("ws-1", "creator_grow", "c@x.io");

    expect(res.success).toBe(true);
    expect(h.mockProviderCreateCheckout).toHaveBeenCalledWith({
      planCode: "creator_grow",
      accountId: "ws-1",
      email: "c@x.io",
      currency: "INR",
      price: 999,
      razorpayPlanId: "plan_prov_1",
    });
  });

  it("passes price:null razorpayPlanId when the DB plan has no runtime config (registry fallback)", async () => {
    h.mockFindPlanByCode.mockResolvedValue(DB_ROW(999, null));

    await billingService.createCheckout("ws-1", "creator_grow");

    expect(h.mockProviderCreateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ price: 999, razorpayPlanId: null }),
    );
  });
});
