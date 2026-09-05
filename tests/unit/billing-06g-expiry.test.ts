import { describe, it, expect, vi, beforeEach } from "vitest";
import { mappingForRazorpayEvent, targetStatusForAction, statusForWebhookEvent } from "@/modules/billing/domain/webhook";
import { canTransition } from "@/modules/billing/domain/lifecycle";
import { isSubscriptionEntitlementEligible } from "@/modules/billing/application/plan-source";

describe("RCCF-BILLING-06G — P0-1 subscription.completed → EXPIRED (not CANCELLED)", () => {
  it("1. subscription.completed maps to EXPIRED", () => {
    const mapping = mappingForRazorpayEvent("subscription.completed");
    expect(mapping).not.toBeNull();
    expect(mapping!.eventType).toBe("SUBSCRIPTION_EXPIRED");
    expect(mapping!.action).toBe("expire");
    expect(targetStatusForAction(mapping!.action)).toBe("EXPIRED");
  });

  it("2. subscription.cancelled still maps to CANCELLED", () => {
    const mapping = mappingForRazorpayEvent("subscription.cancelled");
    expect(mapping!.eventType).toBe("SUBSCRIPTION_CANCELLED");
    expect(mapping!.action).toBe("cancel");
    expect(targetStatusForAction(mapping!.action)).toBe("CANCELLED");
  });

  it("3. EXPIRED storefront entitlement remains false/404", () => {
    expect(isSubscriptionEntitlementEligible({ status: "EXPIRED" })).toBe(false);
    expect(isSubscriptionEntitlementEligible({ status: "EXPIRED", renewsAt: new Date(Date.now() + 86400000) })).toBe(false);
    expect(isSubscriptionEntitlementEligible({ status: "EXPIRED", trialEndsAt: new Date(Date.now() + 86400000) })).toBe(false);
  });

  it("4. EXPIRED → ACTIVE reactivation remains legal", () => {
    expect(canTransition("EXPIRED", "ACTIVE")).toBe(true);
    expect(statusForWebhookEvent("subscription.activated", "EXPIRED")).toBe("ACTIVE");
    expect(statusForWebhookEvent("subscription.charged", "EXPIRED")).toBe("ACTIVE");
    // Also via payment.captured
    expect(statusForWebhookEvent("payment.captured", "EXPIRED")).toBe("ACTIVE");
  });

  it("4b. CANCELLED → ACTIVE still legal (adminSetPlan / resume)", () => {
    expect(canTransition("CANCELLED", "ACTIVE")).toBe(true);
    expect(statusForWebhookEvent("subscription.activated", "CANCELLED")).toBe("ACTIVE");
  });

  it("5. duplicate completed webhook remains idempotent (same payment id collapses)", async () => {
    const { buildRazorpayIdempotencyKey } = await import("@/modules/billing/domain/webhook");
    const payload1 = { payload: { payment: { entity: { id: "pay_123" } }, subscription: { entity: { id: "sub_123" } } } } as any;
    const k1 = buildRazorpayIdempotencyKey(payload1, "subscription.completed", "pay_123");
    const k2 = buildRazorpayIdempotencyKey(payload1, "subscription.completed", "pay_123");
    expect(k1).toBe(k2);
    expect(k1).toBe("razorpay_payment_pay_123");
    // Different payment → different key (not collapsed)
    const payload2 = { payload: { payment: { entity: { id: "pay_456" } } } } as any;
    const k3 = buildRazorpayIdempotencyKey(payload2, "subscription.completed", "pay_456");
    expect(k3).not.toBe(k1);
  });

  it("6. no regression: activated/charged/payment.failed still map correctly", () => {
    expect(mappingForRazorpayEvent("subscription.activated")!.action).toBe("activate");
    expect(targetStatusForAction("activate")).toBe("ACTIVE");
    expect(statusForWebhookEvent("subscription.activated", "DRAFT")).toBe("ACTIVE");

    expect(mappingForRazorpayEvent("subscription.charged")!.action).toBe("renew");
    expect(targetStatusForAction("renew")).toBe("ACTIVE");
    expect(statusForWebhookEvent("subscription.charged", "ACTIVE")).toBe("ACTIVE");

    expect(mappingForRazorpayEvent("payment.failed")!.action).toBe("past_due");
    expect(targetStatusForAction("past_due")).toBe("PAST_DUE");
    expect(statusForWebhookEvent("payment.failed", "ACTIVE")).toBe("PAST_DUE");
    // illegal: CANCELLED + payment.failed should be null
    expect(statusForWebhookEvent("payment.failed", "CANCELLED")).toBeNull();
  });

  it("lifecycle: ACTIVE → EXPIRED and PAST_DUE → EXPIRED legal, EXPIRED never grants", () => {
    expect(canTransition("ACTIVE", "EXPIRED")).toBe(true);
    expect(canTransition("PAST_DUE", "EXPIRED")).toBe(true);
    expect(canTransition("TRIALING", "EXPIRED")).toBe(true);
    expect(isSubscriptionEntitlementEligible({ status: "EXPIRED" })).toBe(false);
    expect(isSubscriptionEntitlementEligible({ status: "PAST_DUE" })).toBe(false);
    expect(isSubscriptionEntitlementEligible({ status: "CANCELLED" })).toBe(false);
  });

  it("storefront gate: resolveActivePlan would return null for EXPIRED → 404", async () => {
    const { isSubscriptionEntitlementEligible: check } = await import("@/modules/billing/application/plan-source");
    // Simulate what storefront-loader does: if not eligible → return null
    const expiredSub = { status: "EXPIRED" as const, renewsAt: new Date(), trialEndsAt: null };
    expect(check(expiredSub)).toBe(false);
    // Active future should be eligible → 200
    const activeSub = { status: "ACTIVE" as const, renewsAt: new Date(Date.now() + 30*86400000) };
    expect(check(activeSub)).toBe(true);
  });
});
