import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  findSubByWorkspace: vi.fn(),
  findSubWithPlan: vi.fn(),
  findPlanByCode: vi.fn(),
  upsertSub: vi.fn(),
  createEvent: vi.fn(),
  isDuplicate: vi.fn(),
  createInvoice: vi.fn(),
  publish: vi.fn(),
  logAction: vi.fn(),
  workspaceFind: vi.fn(),
  planFindUnique: vi.fn(),
}));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: {
    findSubscriptionByWorkspaceId: h.findSubByWorkspace,
    findSubscriptionWithPlan: h.findSubWithPlan,
    findPlanByCode: h.findPlanByCode,
    upsertSubscription: h.upsertSub,
    createEvent: h.createEvent,
    isDuplicateEvent: h.isDuplicate,
    createInvoice: h.createInvoice,
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: h.workspaceFind },
    billingPlan: { findUnique: h.planFindUnique },
    billingInvoice: { findMany: vi.fn().mockResolvedValue([]) },
    billingEvent: { findMany: vi.fn().mockResolvedValue([]) },
    product: { count: vi.fn().mockResolvedValue(0) },
    galleryImage: { count: vi.fn().mockResolvedValue(0) },
    productOrder: { count: vi.fn().mockResolvedValue(0) },
  },
}));

vi.mock("@/lib/events", () => ({ platformEventBus: { publish: h.publish } }));
vi.mock("@/lib/audit", () => ({ logAction: h.logAction }));
vi.mock("@/lib/commission", () => ({ commissionService: { processCommission: vi.fn() } }));
vi.mock("@/lib/partners", () => ({ partnerService: { get: vi.fn().mockResolvedValue(null) } }));
vi.mock("@/modules/billing/infrastructure/providers/razorpay", () => ({
  razorpayProvider: { createCheckout: vi.fn().mockResolvedValue({ success: true, subscriptionId: "sub_test" }) },
}));

import { BillingService } from "@/modules/billing/application/service";

const service = new BillingService();

beforeEach(() => {
  vi.clearAllMocks();
  h.isDuplicate.mockResolvedValue(false);
  h.upsertSub.mockImplementation(async (_ws: string, data: object) => ({ id: "sub-1", ...data }));
  h.createEvent.mockResolvedValue({ id: "evt-1" });
  h.createInvoice.mockResolvedValue({ id: "inv-1", amount: 0 });
  h.planFindUnique.mockResolvedValue({ id: "plan-1", code: "creator_grow" });
  h.workspaceFind.mockResolvedValue({ tenantId: "t-1" });
  h.logAction.mockResolvedValue(undefined);
});

describe("handleSubscriptionWebhook — lifecycle transitions", () => {
  it("activates a new subscription via subscription.activated", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    h.findPlanByCode.mockResolvedValue({ id: "plan-1", code: "creator_grow" });
    const result = await service.handleSubscriptionWebhook({
      eventName: "subscription.activated",
      workspaceId: "ws-1",
      planCode: "creator_grow",
      providerReference: "sub_test",
      idempotencyKey: "k1",
      renewsAt: new Date(),
    });
    expect(result.handled).toBe(true);
    expect(result.status).toBe("ACTIVE");
    expect(h.upsertSub).toHaveBeenCalledWith("ws-1", expect.objectContaining({ status: "ACTIVE", planId: "plan-1" }));
    expect(h.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "SUBSCRIPTION_ACTIVATED", idempotencyKey: "k1" }));
    expect(h.createInvoice).toHaveBeenCalled();
    expect(h.publish).toHaveBeenCalledWith("PaymentCaptured", expect.anything());
  });

  it("marks payment failures as PAST_DUE", async () => {
    h.findSubByWorkspace.mockResolvedValue({ id: "sub-1", planId: "plan-1", status: "ACTIVE" });
    h.planFindUnique.mockResolvedValue({ id: "plan-1", code: "creator_grow" });
    const result = await service.handleSubscriptionWebhook({
      eventName: "payment.failed",
      workspaceId: "ws-1",
      providerReference: "pay_fail",
      idempotencyKey: "k2",
    });
    expect(result.status).toBe("PAST_DUE");
    expect(h.upsertSub).toHaveBeenCalledWith("ws-1", expect.objectContaining({ status: "PAST_DUE" }));
  });

  it("cancels via subscription.cancelled", async () => {
    h.findSubByWorkspace.mockResolvedValue({ id: "sub-1", planId: "plan-1", status: "ACTIVE" });
    const result = await service.handleSubscriptionWebhook({
      eventName: "subscription.cancelled",
      workspaceId: "ws-1",
      providerReference: "sub_c",
      idempotencyKey: "k3",
    });
    expect(result.status).toBe("CANCELLED");
    expect(h.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "SUBSCRIPTION_CANCELLED" }));
  });

  it("ignores illegal transitions (payment.failed on a cancelled subscription)", async () => {
    h.findSubByWorkspace.mockResolvedValue({ id: "sub-1", planId: "plan-1", status: "CANCELLED" });
    const result = await service.handleSubscriptionWebhook({
      eventName: "payment.failed",
      workspaceId: "ws-1",
      providerReference: "sub_x",
      idempotencyKey: "k4",
    });
    expect(result.handled).toBe(false);
    expect(h.upsertSub).not.toHaveBeenCalled(); // state never corrupted
    expect(h.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "PAYMENT_FAILED" })); // event recorded
  });

  it("is idempotent for duplicate deliveries", async () => {
    h.isDuplicate.mockResolvedValue(true);
    const result = await service.handleSubscriptionWebhook({
      eventName: "subscription.activated",
      workspaceId: "ws-1",
      planCode: "creator_grow",
      providerReference: "sub_test",
      idempotencyKey: "k5",
    });
    expect(result.handled).toBe(false);
    expect(h.upsertSub).not.toHaveBeenCalled();
  });

  it("survives a missing workspace/plan gracefully", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    h.findPlanByCode.mockResolvedValue(null);
    h.planFindUnique.mockResolvedValue(null);
    await expect(
      service.handleSubscriptionWebhook({
        eventName: "subscription.activated",
        workspaceId: "ws-missing",
        planCode: "creator_scale",
        providerReference: "r",
        idempotencyKey: "k6",
      }),
    ).rejects.toThrow(); // no plan to resolve — surfaced, never corrupts state
    expect(h.upsertSub).not.toHaveBeenCalled();
  });
});

describe("cancelSubscription / resumeSubscription — events authoritative", () => {
  it("cancels and records a SUBSCRIPTION_CANCELLED BillingEvent", async () => {
    h.findSubByWorkspace.mockResolvedValue({ id: "sub-1", planId: "plan-1", status: "ACTIVE" });
    await service.cancelSubscription("ws-1", "customer");
    expect(h.upsertSub).toHaveBeenCalledWith("ws-1", expect.objectContaining({ status: "CANCELLED", cancelledAt: expect.any(Date) }));
    expect(h.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "SUBSCRIPTION_CANCELLED" }));
    expect(h.publish).toHaveBeenCalledWith("SubscriptionCancelled", expect.anything());
  });

  it("resumes a cancelled subscription via a SUBSCRIPTION_RESUMED event", async () => {
    h.findSubByWorkspace.mockResolvedValue({ id: "sub-1", planId: "plan-1", status: "CANCELLED" });
    await service.resumeSubscription("ws-1");
    expect(h.upsertSub).toHaveBeenCalledWith("ws-1", expect.objectContaining({ status: "ACTIVE", cancelledAt: null }));
    expect(h.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "SUBSCRIPTION_RESUMED" }));
  });
});

describe("changePlan — validation + checkout", () => {
  it("creates a new subscription checkout for a valid plan change", async () => {
    h.findSubWithPlan.mockResolvedValue({ id: "sub-1", status: "ACTIVE", plan: { code: "creator_launch" } });
    h.findPlanByCode.mockResolvedValue({ id: "plan-grow", code: "creator_grow" });
    const result = await service.changePlan("ws-1", "creator_grow");
    expect(result.success).toBe(true);
    expect(result.subscriptionId).toBe("sub_test");
  });

  it("rejects an unknown plan", async () => {
    const result = await service.changePlan("ws-1", "nope");
    expect(result.success).toBe(false);
  });

  it("allows change from CANCELLED (reactivation)", async () => {
    h.findSubWithPlan.mockResolvedValue({ id: "sub-1", status: "CANCELLED", plan: { code: "creator_grow" } });
    h.findPlanByCode.mockResolvedValue({ id: "plan-grow", code: "creator_grow" });
    const result = await service.changePlan("ws-1", "creator_scale");
    expect(result.success).toBe(true);
  });
});
