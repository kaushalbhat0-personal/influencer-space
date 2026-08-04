import { describe, it, expect } from "vitest";
import {
  COMMERCE_PLANS,
  getCommercePlan,
  getCreatorCommercePlans,
  razorpayPlanIdFor,
  capabilitiesForPlan,
  isManualPlan,
  featuresForPlan,
  LEGACY_TO_CANONICAL,
} from "@/config/commerce/plans";
import { statusForWebhookEvent, mappingForRazorpayEvent, targetStatusForAction } from "@/modules/billing/domain/webhook";
import { capabilityService, getPlan } from "@/lib/capabilities";

describe("canonical plan configuration (IMPLEMENTATION-34)", () => {
  it("defines exactly Launch/Grow/Scale/Enterprise with the canonical prices", () => {
    expect(COMMERCE_PLANS.map((p) => p.code)).toEqual(["creator_launch", "creator_grow", "creator_scale", "creator_enterprise"]);
    expect(getCommercePlan("creator_launch")?.price).toBe(0);
    expect(getCommercePlan("creator_grow")?.price).toBe(699);
    expect(getCommercePlan("creator_scale")?.price).toBe(1995);
    expect(getCommercePlan("creator_enterprise")?.price).toBeNull();
  });

  it("maps Razorpay plan ids via configuration only", () => {
    expect(razorpayPlanIdFor("creator_grow")).toBe("plan_TLTGQBU1EXkseF");
    expect(razorpayPlanIdFor("creator_scale")).toBe("plan_TLTH45wQlPdW7v");
    expect(razorpayPlanIdFor("creator_launch")).toBeNull();
    expect(razorpayPlanIdFor("creator_enterprise")).toBeNull();
    expect(razorpayPlanIdFor(null)).toBeNull();
  });

  it("marks enterprise as manual (no public checkout)", () => {
    expect(isManualPlan("creator_enterprise")).toBe(true);
    expect(isManualPlan("creator_grow")).toBe(false);
  });

  it("has unique codes and non-empty capability grants", () => {
    const codes = COMMERCE_PLANS.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const p of COMMERCE_PLANS) expect(p.capabilities.length).toBeGreaterThan(0);
  });

  it("legacy creator codes map to canonical matrix plans", () => {
    expect(LEGACY_TO_CANONICAL.creator_free).toBe("creator_launch");
    expect(LEGACY_TO_CANONICAL.creator_pro).toBe("creator_grow");
    expect(LEGACY_TO_CANONICAL.creator_elite).toBe("creator_scale");
    expect(capabilitiesForPlan("creator_pro")).toEqual(capabilitiesForPlan("creator_grow"));
  });
});

describe("capability matrix derivation", () => {
  it("derives feature maps from the matrix", () => {
    const launch = featuresForPlan("creator_launch");
    expect(launch.premium_themes).toBeUndefined();
    expect(launch.custom_domain).toBeUndefined();
    const grow = featuresForPlan("creator_grow");
    expect(grow.premium_themes).toBe(true);
    expect(grow.custom_domain).toBe(true);
    const scale = featuresForPlan("creator_scale");
    expect(scale.white_label).toBe(true);
    expect(scale.api_access).toBe(true);
  });

  it("CapabilityService reflects the canonical grants", () => {
    expect(capabilityService.can("creator_launch", "premium_themes").allowed).toBe(false);
    expect(capabilityService.can("creator_grow", "premium_themes").allowed).toBe(true);
    expect(capabilityService.can("creator_grow", "custom_domain").allowed).toBe(true);
    expect(capabilityService.can("creator_scale", "white_label").allowed).toBe(true);
    expect(capabilityService.can("creator_launch", "white_label").allowed).toBe(false);
    expect(capabilityService.can("creator_enterprise", "white_label").allowed).toBe(true);
  });

  it("pricing page plans resolve from the matrix catalog", () => {
    const creatorPlans = getCreatorCommercePlans();
    expect(creatorPlans.map((p) => p.code)).toContain("creator_grow");
    expect(getPlan("creator_grow")?.price).toBe(699);
    expect(getPlan("creator_scale")?.price).toBe(1995);
  });
});

describe("webhook lifecycle mapping (IMPLEMENTATION-34)", () => {
  it("maps every Razorpay subscription event to a billing action", () => {
    expect(mappingForRazorpayEvent("subscription.activated")?.action).toBe("activate");
    expect(mappingForRazorpayEvent("subscription.charged")?.action).toBe("renew");
    expect(mappingForRazorpayEvent("subscription.completed")?.action).toBe("cancel");
    expect(mappingForRazorpayEvent("subscription.cancelled")?.action).toBe("cancel");
    expect(mappingForRazorpayEvent("subscription.paused")?.action).toBe("pause");
    expect(mappingForRazorpayEvent("subscription.resumed")?.action).toBe("resume");
    expect(mappingForRazorpayEvent("payment.failed")?.action).toBe("past_due");
    expect(mappingForRazorpayEvent("order.paid")?.action).toBe("activate");
    expect(mappingForRazorpayEvent("unknown.event")).toBeNull();
  });

  it("derives target statuses", () => {
    expect(targetStatusForAction("activate")).toBe("ACTIVE");
    expect(targetStatusForAction("cancel")).toBe("CANCELLED");
    expect(targetStatusForAction("pause")).toBe("PAST_DUE");
    expect(targetStatusForAction("past_due")).toBe("PAST_DUE");
    expect(targetStatusForAction("resume")).toBe("ACTIVE");
  });

  it("respects the lifecycle state machine", () => {
    expect(statusForWebhookEvent("subscription.activated", null)).toBe("ACTIVE"); // DRAFT → ACTIVE
    expect(statusForWebhookEvent("subscription.activated", "TRIALING")).toBe("ACTIVE"); // TRIALING → ACTIVE
    expect(statusForWebhookEvent("subscription.cancelled", "ACTIVE")).toBe("CANCELLED");
    expect(statusForWebhookEvent("payment.failed", "ACTIVE")).toBe("PAST_DUE");
    expect(statusForWebhookEvent("subscription.charged", "ACTIVE")).toBe("ACTIVE"); // same-state no-op
    expect(statusForWebhookEvent("subscription.resumed", "PAST_DUE")).toBe("ACTIVE");
    expect(statusForWebhookEvent("unknown.event", "ACTIVE")).toBeNull();
  });
});
