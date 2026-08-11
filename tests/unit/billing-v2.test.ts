import { describe, it, expect } from "vitest";
import { entitlement, EntitlementService } from "@/modules/billing/application/entitlements";
import { canTransition, getAllowedTransitions, LIFECYCLE_STATES } from "@/modules/billing/domain/lifecycle";
import { statusAfterEvent } from "@/modules/billing/domain/events";
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
