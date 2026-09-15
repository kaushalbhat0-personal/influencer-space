import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockSubscriptionsCreate: vi.fn(),
  mockOrdersCreate: vi.fn(),
}));

vi.mock("razorpay", () => ({
  __esModule: true,
  default: class {
    subscriptions = { create: h.mockSubscriptionsCreate };
    orders = { create: h.mockOrdersCreate };
  },
}));

import { razorpayProvider } from "@/modules/billing/infrastructure/providers/razorpay";

beforeEach(() => {
  vi.clearAllMocks();
  h.mockSubscriptionsCreate.mockResolvedValue({ id: "sub_x" });
  h.mockOrdersCreate.mockResolvedValue({ id: "order_x" });
});

describe("RCCF-36 — Razorpay provider DB-authoritative resolution", () => {
  it("uses the DB razorpayPlanId (provisioned for the current price) over the registry mapping", async () => {
    await razorpayProvider.createCheckout({
      planCode: "creator_grow",
      accountId: "ws-1",
      currency: "INR",
      razorpayPlanId: "plan_prov_999",
    });

    expect(h.mockSubscriptionsCreate).toHaveBeenCalledWith(expect.objectContaining({ plan_id: "plan_prov_999" }));
    expect(h.mockOrdersCreate).not.toHaveBeenCalled();
  });

  it("falls back to the registry razorpay plan id when no DB id is present", async () => {
    // RCCF-LIVE-SMOKE-14: registry for creator_grow is now null (legacy 699 removed). No plan -> ORDER at DB price.
    await razorpayProvider.createCheckout({ planCode: "creator_grow", accountId: "ws-1", currency: "INR", price: 999 });

    expect(h.mockSubscriptionsCreate).not.toHaveBeenCalled();
    expect(h.mockOrdersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 99900 }));
  });

  it("legacy ₹699 plan plan_TLTGQBU1EXkseF is never used for creator_grow (regression)", async () => {
    await razorpayProvider.createCheckout({ planCode: "creator_grow", accountId: "ws-1", currency: "INR", price: 999, razorpayPlanId: "plan_TLTGQBU1EXkseF" });
    expect(h.mockSubscriptionsCreate).not.toHaveBeenCalled();
    expect(h.mockOrdersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 99900 }));
  });

  it("smokeTest forces ORDER at 100 paise even for creator_grow", async () => {
    await razorpayProvider.createCheckout({ planCode: "creator_grow", accountId: "ws-1", currency: "INR", price: 1, razorpayPlanId: null, smokeTest: true });
    expect(h.mockSubscriptionsCreate).not.toHaveBeenCalled();
    expect(h.mockOrdersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 100 }));
  });

  it("one-time order amount derives from the DB price, not the registry", async () => {
    await razorpayProvider.createCheckout({
      planCode: "creator_launch",
      accountId: "ws-1",
      currency: "INR",
      price: 0,
    });

    expect(h.mockOrdersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }));
  });

  it("one-time order for a paid plan without a plan id uses the DB price amount", async () => {
    await razorpayProvider.createCheckout({
      planCode: "custom_paid",
      accountId: "ws-1",
      currency: "INR",
      price: 1299,
    });

    expect(h.mockOrdersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 129900 }));
  });

  it("manual plans never create a recurring subscription checkout", async () => {
    await razorpayProvider.createCheckout({ planCode: "creator_enterprise", accountId: "ws-1", razorpayPlanId: "plan_ent" });

    expect(h.mockSubscriptionsCreate).not.toHaveBeenCalled();
  });
});
