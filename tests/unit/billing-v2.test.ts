import { describe, it, expect } from "vitest";
import { entitlement, EntitlementService } from "@/modules/billing/application/entitlements";
import { canTransition, getAllowedTransitions, LIFECYCLE_STATES } from "@/modules/billing/domain/lifecycle";
import { statusAfterEvent } from "@/modules/billing/domain/events";
import { buildRazorpayIdempotencyKey } from "@/modules/billing/domain/webhook";
import { billingIdempotency } from "@/modules/billing/infrastructure/idempotency";
import { getPlan } from "@/lib/capabilities";

describe("EntitlementService", () => {
  it("should check boolean features with has()", () => {
    expect(entitlement.has("creator_free", "custom_domain")).toBe(false);
    expect(entitlement.has("creator_pro", "custom_domain")).toBe(false);
    expect(entitlement.has("creator_elite", "custom_domain")).toBe(true);
    expect(entitlement.has("creator_elite", "webhooks")).toBe(true);
    expect(entitlement.has("creator_elite", "live_social_sync")).toBe(true);
  });

  it("should get numeric limits with limit()", () => {
    expect(entitlement.limit("creator_free", "max_products")).toBe(3);
    expect(entitlement.limit("creator_pro", "max_products")).toBe(-1);
  });

  it("should return 0 for unknown feature", () => {
    expect(entitlement.limit("creator_free", "bogus_feature")).toBe(0);
  });

  it("should return EntitlementCheck with can()", () => {
    const check = entitlement.can("creator_free", "custom_domain");
    expect(check.allowed).toBe(false);
  });

  it("should calculate remaining usage", () => {
    const remaining = entitlement.remaining("creator_free", "max_products", 1);
    expect(remaining).toBe(2);
  });

  it("should produce an audit report", () => {
    const audit = entitlement.audit("creator_free");
    expect(audit.length).toBeGreaterThan(0);
    expect(audit[0]!.planName).toBe("Creator Launch");
  });

  it("should export a singleton instance", () => {
    expect(entitlement).toBeInstanceOf(EntitlementService);
  });
});

describe("Subscription Lifecycle", () => {
  it("should define 6 lifecycle states", () => {
    expect(LIFECYCLE_STATES).toEqual(["DRAFT", "TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"]);
  });

  it("should allow DRAFT → ACTIVE", () => { expect(canTransition("DRAFT", "ACTIVE")).toBe(true); });
  it("should allow DRAFT → TRIALING", () => { expect(canTransition("DRAFT", "TRIALING")).toBe(true); });
  it("should allow ACTIVE → PAST_DUE", () => { expect(canTransition("ACTIVE", "PAST_DUE")).toBe(true); });
  it("should allow CANCELLED → ACTIVE (reactivation)", () => { expect(canTransition("CANCELLED", "ACTIVE")).toBe(true); });
  it("should allow EXPIRED → ACTIVE (renewal)", () => { expect(canTransition("EXPIRED", "ACTIVE")).toBe(true); });

  it("should NOT allow ACTIVE → DRAFT", () => { expect(canTransition("ACTIVE", "DRAFT")).toBe(false); });
  it("should NOT allow CANCELLED → PAST_DUE", () => { expect(canTransition("CANCELLED", "PAST_DUE")).toBe(false); });

  it("should allow admin reset from EXPIRED → DRAFT", () => { expect(canTransition("CANCELLED", "DRAFT")).toBe(true); });
  it("should allow EXPIRED → DRAFT", () => { expect(canTransition("EXPIRED", "DRAFT")).toBe(true); });

  it("should return allowed transitions from ACTIVE", () => {
    const transitions = getAllowedTransitions("ACTIVE");
    expect(transitions).toContain("PAST_DUE");
    expect(transitions).toContain("CANCELLED");
    expect(transitions).toContain("EXPIRED");
  });
});

describe("Billing Events", () => {
  it("SUBSCRIPTION_CREATED should set DRAFT", () => { expect(statusAfterEvent("SUBSCRIPTION_CREATED", null)).toBe("DRAFT"); });
  it("PAYMENT_SUCCEEDED from DRAFT should activate", () => { expect(statusAfterEvent("PAYMENT_SUCCEEDED", "DRAFT")).toBe("ACTIVE"); });
  it("PAYMENT_FAILED should set PAST_DUE", () => { expect(statusAfterEvent("PAYMENT_FAILED", "ACTIVE")).toBe("PAST_DUE"); });
  it("SUBSCRIPTION_CANCELLED should set CANCELLED", () => { expect(statusAfterEvent("SUBSCRIPTION_CANCELLED", "ACTIVE")).toBe("CANCELLED"); });
  it("REFUND_COMPLETED should set CANCELLED", () => { expect(statusAfterEvent("REFUND_COMPLETED", "ACTIVE")).toBe("CANCELLED"); });
});

describe("Idempotency", () => {
  beforeEach(() => { billingIdempotency.reset(); });

  it("should detect duplicates", () => {
    expect(billingIdempotency.isDuplicate("key1")).toBe(false);
    expect(billingIdempotency.isDuplicate("key1")).toBe(true);
  });

  it("should track processed count", () => {
    billingIdempotency.markProcessed("a"); billingIdempotency.markProcessed("b");
    expect(billingIdempotency.size).toBe(2);
  });

  it("should reset", () => {
    billingIdempotency.markProcessed("x");
    billingIdempotency.reset();
    expect(billingIdempotency.size).toBe(0);
  });
});

describe("RCCF-37 — canonical webhook idempotency key", () => {
  const charged = (paymentId?: string, subId = "sub_1") => ({
    event: "subscription.charged",
    payload: {
      payment: paymentId ? { entity: { id: paymentId } } : undefined,
      subscription: { entity: { id: subId } },
    },
  });

  it("collapses subscription.charged and payment.captured for the same payment to ONE key", () => {
    const chargedKey = buildRazorpayIdempotencyKey(charged("pay_1") as never, "subscription.charged", "pay_1");
    const capturedKey = buildRazorpayIdempotencyKey(
      { event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } } as never,
      "payment.captured",
      "pay_1",
    );
    expect(chargedKey).toBe("razorpay_payment_pay_1");
    expect(capturedKey).toBe("razorpay_payment_pay_1");
    expect(chargedKey).toBe(capturedKey);
  });

  it("collapses order.paid and payment.captured for the same payment", () => {
    const orderPaid = buildRazorpayIdempotencyKey(
      { event: "order.paid", payload: { payment: { entity: { id: "pay_2" } } } } as never,
      "order.paid",
      "pay_2",
    );
    expect(orderPaid).toBe("razorpay_payment_pay_2");
  });

  it("uses distinct keys for different payments (monthly renewals stay separate)", () => {
    const k1 = buildRazorpayIdempotencyKey(charged("pay_1") as never, "subscription.charged", "pay_1");
    const k2 = buildRazorpayIdempotencyKey(charged("pay_2") as never, "subscription.charged", "pay_2");
    expect(k1).not.toBe(k2);
  });

  it("falls back to event+reference when no payment id exists (e.g. subscription.paused)", () => {
    const paused = buildRazorpayIdempotencyKey(
      { event: "subscription.paused", payload: { subscription: { entity: { id: "sub_1" } } } } as never,
      "subscription.paused",
      "sub_1",
    );
    expect(paused).toBe("razorpay_subscription.paused_sub_1");
  });

  it("RCCF-41: refund events key on the provider REFUND id (not the payment)", () => {
    const refund = buildRazorpayIdempotencyKey(
      { event: "refund.processed", payload: { refund: { entity: { id: "refund_42" } }, payment: { entity: { id: "pay_1" } } } } as never,
      "refund.processed",
      "pay_1",
    );
    expect(refund).toBe("razorpay_refund_refund_42");
  });

  it("RCCF-41: different refunds of the same payment get different keys (each is one reversal)", () => {
    const r1 = buildRazorpayIdempotencyKey({ event: "refund.processed", payload: { refund: { entity: { id: "refund_1" } } } } as never, "refund.processed", "");
    const r2 = buildRazorpayIdempotencyKey({ event: "refund.processed", payload: { refund: { entity: { id: "refund_2" } } } } as never, "refund.processed", "");
    expect(r1).not.toBe(r2);
  });
});
