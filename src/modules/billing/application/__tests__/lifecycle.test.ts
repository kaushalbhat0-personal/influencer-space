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
  invoiceFindFirst: vi.fn(),
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
    billingInvoice: { findMany: vi.fn().mockResolvedValue([]), findFirst: h.invoiceFindFirst },
    billingEvent: { findMany: vi.fn().mockResolvedValue([]) },
    product: { count: vi.fn().mockResolvedValue(0) },
    galleryImage: { count: vi.fn().mockResolvedValue(0) },
    productOrder: { count: vi.fn().mockResolvedValue(0) },
    // RCCF-41: invoice + commission are created inside one transaction.
    $transaction: async (cb: (tx: unknown) => unknown) => cb({
      billingInvoice: { create: h.createInvoice },
    }),
  },
}));

vi.mock("@/lib/events", () => ({ platformEventBus: { publish: h.publish } }));
vi.mock("@/lib/audit", () => ({ logAction: h.logAction }));
vi.mock("@/lib/commission", () => ({ commissionService: { processCommission: vi.fn() } }));
vi.mock("@/lib/partners", () => ({ partnerService: { get: vi.fn().mockResolvedValue(null) } }));
vi.mock("@/lib/commission/runtime", () => ({ recordSubscriptionCommission: vi.fn().mockResolvedValue({ success: true }) }));
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
  h.invoiceFindFirst.mockResolvedValue(null);
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
      providerReference: "pay_test",
      idempotencyKey: "k1",
      renewsAt: new Date(),
      amount: 999,
    });
    expect(result.handled).toBe(true);
    expect(result.status).toBe("ACTIVE");
    expect(h.upsertSub).toHaveBeenCalledWith("ws-1", expect.objectContaining({ status: "ACTIVE", planId: "plan-1" }));
    expect(h.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "SUBSCRIPTION_ACTIVATED", idempotencyKey: "k1" }));
    expect(h.createInvoice).toHaveBeenCalled();
    expect(h.publish).toHaveBeenCalledWith("PaymentCaptured", expect.anything());
  });

  it("RCCF-41: a webhook with no/zero amount never mints an invoice or commission", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    h.findPlanByCode.mockResolvedValue({ id: "plan-1", code: "creator_grow" });
    const result = await service.handleSubscriptionWebhook({
      eventName: "subscription.activated",
      workspaceId: "ws-1",
      planCode: "creator_grow",
      providerReference: "pay_zero",
      idempotencyKey: "k-zero",
      renewsAt: new Date(),
      amount: 0, // missing/zero payment entity → amount 0
    });
    expect(result.handled).toBe(true);
    // RCCF-71.4.5 (F1): a zero/absent amount NEVER transitions to ACTIVE.
    expect(result.status).toBeNull(); // subscription never activated
    expect(h.upsertSub).not.toHaveBeenCalled(); // state never corrupted
    expect(h.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "SUBSCRIPTION_ACTIVATED" })); // idempotency preserved
    expect(h.createInvoice).not.toHaveBeenCalled();
    expect(h.publish).not.toHaveBeenCalled();
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

  it("RCCF-37 P1: one charge across overlapping events mints only ONE paid invoice", async () => {
    h.findSubByWorkspace.mockResolvedValue({ id: "sub-1", planId: "plan-1", status: "ACTIVE" });
    h.findPlanByCode.mockResolvedValue({ id: "plan-1", code: "creator_grow" });
    h.createInvoice.mockResolvedValue({ id: "inv-1", amount: 999 });

    // First event (e.g. subscription.charged) — no existing invoice → created.
    h.invoiceFindFirst.mockResolvedValue(null);
    await service.handleSubscriptionWebhook({
      eventName: "subscription.charged",
      workspaceId: "ws-1",
      planCode: "creator_grow",
      providerReference: "pay_1",
      idempotencyKey: "k-charged",
      amount: 999,
      renewsAt: new Date(),
    });
    expect(h.createInvoice).toHaveBeenCalledTimes(1);
    expect(h.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ providerReference: "pay_1", amount: 999 }), expect.anything());

    // Second overlapping event (payment.captured) for the SAME payment →
    // an invoice already exists for this reference → no second invoice.
    h.invoiceFindFirst.mockResolvedValue({ id: "inv-1" });
    await service.handleSubscriptionWebhook({
      eventName: "payment.captured",
      workspaceId: "ws-1",
      planCode: "creator_grow",
      providerReference: "pay_1",
      idempotencyKey: "k-captured",
      amount: 999,
    });

    expect(h.createInvoice).toHaveBeenCalledTimes(1);
  });
});
