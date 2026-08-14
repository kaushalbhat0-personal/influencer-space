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
    await razorpayProvider.createCheckout({ planCode: "creator_grow", accountId: "ws-1", currency: "INR" });

    // registry razorpayPlanIdFor("creator_grow") = plan_TLTGQBU1EXkseF
    expect(h.mockSubscriptionsCreate).toHaveBeenCalledWith(expect.objectContaining({ plan_id: "plan_TLTGQBU1EXkseF" }));
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
