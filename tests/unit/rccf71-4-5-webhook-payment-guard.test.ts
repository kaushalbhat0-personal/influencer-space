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
    $transaction: async (cb: (tx: unknown) => unknown) =>
      cb({ billingInvoice: { create: h.createInvoice } }),
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
  h.createInvoice.mockResolvedValue({ id: "inv-1", amount: 999 });
  h.invoiceFindFirst.mockResolvedValue(null);
  h.planFindUnique.mockResolvedValue({ id: "plan-1", code: "creator_grow" });
  h.workspaceFind.mockResolvedValue({ tenantId: "t-1" });
  h.logAction.mockResolvedValue(undefined);
  h.findPlanByCode.mockResolvedValue({ id: "plan-1", code: "creator_grow" });
});

const paidEvent = (overrides: Record<string, unknown> = {}) =>
  service.handleSubscriptionWebhook({
    eventName: "subscription.activated",
    workspaceId: "ws-1",
    planCode: "creator_grow",
    providerReference: "pay_1",
    idempotencyKey: "k1",
    amount: 999,
    ...overrides,
  });

describe("RCCF-71.4.5 F1 — webhook payment guard (activate/renew)", () => {
  it("valid positive amount → subscription becomes ACTIVE and invoice is minted", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    const result = await paidEvent();
    expect(result.handled).toBe(true);
    expect(result.status).toBe("ACTIVE");
    expect(h.upsertSub).toHaveBeenCalledWith("ws-1", expect.objectContaining({ status: "ACTIVE", planId: "plan-1" }));
    expect(h.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ providerReference: "pay_1", amount: 999 }), expect.anything());
    expect(h.publish).toHaveBeenCalledWith("PaymentCaptured", expect.anything());
  });

  it("zero amount → NEVER ACTIVE (no upsert, no invoice, event recorded)", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    const result = await paidEvent({ amount: 0, idempotencyKey: "k-zero" });
    expect(result.handled).toBe(true);
    expect(result.status).toBeNull();
    expect(h.upsertSub).not.toHaveBeenCalled();
    expect(h.createInvoice).not.toHaveBeenCalled();
    expect(h.publish).not.toHaveBeenCalled();
    expect(h.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SUBSCRIPTION_ACTIVATED", idempotencyKey: "k-zero" }),
    );
    expect(h.logAction).toHaveBeenCalledWith(expect.anything(), "billing:payment-ignored", expect.anything());
  });

  it("missing amount → NEVER ACTIVE", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    const result = await paidEvent({ amount: undefined, idempotencyKey: "k-missing" });
    expect(result.handled).toBe(true);
    expect(result.status).toBeNull();
    expect(h.upsertSub).not.toHaveBeenCalled();
    expect(h.createInvoice).not.toHaveBeenCalled();
  });

  it("NaN amount → NEVER ACTIVE", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    const result = await paidEvent({ amount: Number.NaN, idempotencyKey: "k-nan" });
    expect(result.handled).toBe(true);
    expect(result.status).toBeNull();
    expect(h.upsertSub).not.toHaveBeenCalled();
    expect(h.createInvoice).not.toHaveBeenCalled();
  });

  it("negative amount → NEVER ACTIVE", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    const result = await paidEvent({ amount: -10, idempotencyKey: "k-neg" });
    expect(result.handled).toBe(true);
    expect(result.status).toBeNull();
    expect(h.upsertSub).not.toHaveBeenCalled();
    expect(h.createInvoice).not.toHaveBeenCalled();
  });

  it("duplicate delivery stays idempotent (handled:false, no state mutation)", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    h.isDuplicate.mockResolvedValue(true);
    const result = await paidEvent({ idempotencyKey: "k-dup" });
    expect(result.handled).toBe(false);
    expect(h.upsertSub).not.toHaveBeenCalled();
    expect(h.createEvent).not.toHaveBeenCalled();
  });

  it("zero-amount renew on an ACTIVE subscription leaves it unchanged (no extension, no invoice)", async () => {
    h.findSubByWorkspace.mockResolvedValue({ id: "sub-1", planId: "plan-1", status: "ACTIVE" });
    const result = await service.handleSubscriptionWebhook({
      eventName: "subscription.charged",
      workspaceId: "ws-1",
      planCode: "creator_grow",
      providerReference: "pay_renew",
      idempotencyKey: "k-renew-zero",
      renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      amount: 0,
    });
    expect(result.handled).toBe(true);
    expect(result.status).toBe("ACTIVE"); // unchanged
    expect(h.upsertSub).not.toHaveBeenCalled();
    expect(h.createInvoice).not.toHaveBeenCalled();
  });

  it("valid renewal still transitions/extends ACTIVE and mints an invoice", async () => {
    h.findSubByWorkspace.mockResolvedValue({ id: "sub-1", planId: "plan-1", status: "ACTIVE" });
    const result = await service.handleSubscriptionWebhook({
      eventName: "subscription.charged",
      workspaceId: "ws-1",
      planCode: "creator_grow",
      providerReference: "pay_renew2",
      idempotencyKey: "k-renew",
      renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      amount: 999,
    });
    expect(result.status).toBe("ACTIVE");
    expect(h.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ providerReference: "pay_renew2", amount: 999 }), expect.anything());
  });

  it("cancellation behavior is unchanged (no amount required)", async () => {
    h.findSubByWorkspace.mockResolvedValue({ id: "sub-1", planId: "plan-1", status: "ACTIVE" });
    const result = await service.handleSubscriptionWebhook({
      eventName: "subscription.cancelled",
      workspaceId: "ws-1",
      providerReference: "sub_c",
      idempotencyKey: "k-cancel",
    });
    expect(result.status).toBe("CANCELLED");
    expect(h.upsertSub).toHaveBeenCalledWith("ws-1", expect.objectContaining({ status: "CANCELLED" }));
    expect(h.createEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "SUBSCRIPTION_CANCELLED" }));
  });

  it("PAST_DUE behavior is unchanged (no amount required)", async () => {
    h.findSubByWorkspace.mockResolvedValue({ id: "sub-1", planId: "plan-1", status: "ACTIVE" });
    const result = await service.handleSubscriptionWebhook({
      eventName: "payment.failed",
      workspaceId: "ws-1",
      providerReference: "pay_fail",
      idempotencyKey: "k-past-due",
    });
    expect(result.status).toBe("PAST_DUE");
    expect(h.upsertSub).toHaveBeenCalledWith("ws-1", expect.objectContaining({ status: "PAST_DUE" }));
  });
});