import { describe, it, expect } from "vitest";
import { FeatureGateService, featureGate } from "@/lib/billing/feature-gate";
import { PLANS, FEATURES } from "@/lib/billing/plan-catalog";
import { v2FeatureGate } from "@/lib/billing/compat";

describe("Plan Catalog", () => {
  it("should have at least 5 plans defined", () => {
    expect(PLANS.length).toBeGreaterThanOrEqual(5);
  });

  it("every plan should have a unique code", () => {
    const codes = PLANS.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every plan should declare a family", () => {
    for (const plan of PLANS) {
      expect(["creator", "agency"]).toContain(plan.family);
    }
  });

  it("creator_free should cost 0", () => {
    const free = PLANS.find((p) => p.code === "creator_free")!;
    expect(free.price).toBe(0);
    expect(free.features.max_products).toBe(5);
    expect(free.features.custom_domain).toBe(false);
  });

  it("creator_pro should have unlimited products (-1)", () => {
    const pro = PLANS.find((p) => p.code === "creator_pro")!;
    expect(pro.features.max_products).toBe(-1);
    expect(pro.features.custom_domain).toBe(true);
    expect(pro.price).toBe(999);
  });

  it("agency_growth should have white_label", () => {
    const growth = PLANS.find((p) => p.code === "agency_growth")!;
    expect(growth.features.white_label).toBe(true);
    expect(growth.features.max_clients).toBe(20);
  });
});

describe("Feature Definitions", () => {
  it("should have at least 10 features defined", () => {
    expect(FEATURES.length).toBeGreaterThanOrEqual(10);
  });

  it("every feature should have a unique key", () => {
    const keys = FEATURES.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every feature referenced by a plan should exist in FEATURES", () => {
    const featureKeys = new Set(FEATURES.map((f) => f.key));
    for (const plan of PLANS) {
      for (const key of Object.keys(plan.features)) {
        expect(featureKeys.has(key)).toBe(true);
      }
    }
  });
});

describe("FeatureGateService", () => {
  const svc = new FeatureGateService();

  it("should allow custom domain for creator_pro", () => {
    expect(svc.canUseCustomDomain("creator_pro")).toBe(true);
  });

  it("should deny custom domain for creator_free", () => {
    expect(svc.canUseCustomDomain("creator_free")).toBe(false);
  });

  it("should return 5 for max_products on creator_free", () => {
    expect(svc.maxProducts("creator_free")).toBe(5);
  });

  it("should return -1 (unlimited) for creator_pro", () => {
    expect(svc.maxProducts("creator_pro")).toBe(-1);
  });

  it("should return 20 for max_clients on agency_growth", () => {
    expect(svc.maxClients("agency_growth")).toBe(20);
  });

  it("should return 0 for unknown plan", () => {
    expect(svc.maxProducts("nonexistent_plan")).toBe(0);
  });

  it("should return false for unknown feature", () => {
    expect(svc.canUse("creator_free", "nonexistent_feature").allowed).toBe(false);
  });

  it("should return all features for a plan", () => {
    const features = svc.getPlanFeatures("creator_free");
    expect(features.max_products).toBe(5);
    expect(features.custom_domain).toBe(false);
  });

  it("should allow agency_growth branding removal", () => {
    expect(svc.canRemoveBranding("agency_growth")).toBe(true);
  });
});

describe("Compatibility Layer", () => {
  it("should map legacy STARTER to creator_free", () => {
    expect(v2FeatureGate.maxProducts("STARTER")).toBe(5);
  });

  it("should map legacy PRO to creator_pro", () => {
    expect(v2FeatureGate.maxProducts("PRO")).toBe(-1);
  });

  it("should map legacy FREELANCER to agency_starter", () => {
    expect(v2FeatureGate.maxClients("FREELANCER")).toBe(5);
  });

  it("should map legacy GROWTH to agency_growth", () => {
    expect(v2FeatureGate.maxClients("GROWTH")).toBe(20);
  });

  it("should default unknown plans to creator_free", () => {
    expect(v2FeatureGate.maxProducts("UNKNOWN")).toBe(5);
  });
});

describe("FeatureGateService — singleton", () => {
  it("should export a singleton instance", () => {
    expect(featureGate).toBeInstanceOf(FeatureGateService);
    expect(featureGate.maxProducts("creator_free")).toBe(5);
  });
});

// ── LIFECYCLE ────────────────────────────────────────────────────────────────

import {
  canTransition, validateTransition, getAllowedTransitions, LIFECYCLE_STATES,
} from "@/lib/billing/lifecycle";
import { statusAfterEvent } from "@/lib/billing/events";
import { BillingIdempotency } from "@/lib/billing/idempotency";
import { EntitlementService, entitlement } from "@/lib/billing/entitlements";

describe("EntitlementService", () => {
  const svc = new EntitlementService();

  it("should check boolean features with has()", () => {
    expect(svc.has("creator_pro", "custom_domain")).toBe(true);
    expect(svc.has("creator_free", "custom_domain")).toBe(false);
  });

  it("should get numeric limits with limit()", () => {
    expect(svc.limit("creator_free", "max_products")).toBe(5);
    expect(svc.limit("creator_pro", "max_products")).toBe(-1);
    expect(svc.limit("agency_growth", "max_clients")).toBe(20);
  });

  it("should return 0 for unknown feature", () => {
    expect(svc.limit("creator_free", "nonexistent")).toBe(0);
  });

  it("should return EntitlementCheck with can()", () => {
    const r1 = svc.can("creator_pro", "custom_domain");
    expect(r1.allowed).toBe(true);

    const r2 = svc.can("creator_free", "custom_domain");
    expect(r2.allowed).toBe(false);

    const r3 = svc.can("agency_growth", "white_label");
    expect(r3.allowed).toBe(true);
  });

  it("should calculate remaining usage", () => {
    expect(svc.remaining("creator_free", "max_products", 3)).toBe(2);
    expect(svc.remaining("creator_free", "max_products", 5)).toBe(0);
    expect(svc.remaining("creator_pro", "max_products", 50)).toBe(Infinity);
  });

  it("should produce an audit report", () => {
    const audit = svc.audit("creator_free", "acct_001");
    expect(audit.length).toBeGreaterThan(5);
    const products = audit.find((r) => r.feature === "max_products")!;
    expect(products.allowed).toBe(true);
    expect(products.limit).toBe(5);
    expect(products.accountId).toBe("acct_001");
  });

  it("should export a singleton instance", () => {
    expect(entitlement).toBeInstanceOf(EntitlementService);
    expect(entitlement.has("creator_pro", "custom_domain")).toBe(true);
  });
});

describe("Subscription Lifecycle", () => {
  it("should define 6 lifecycle states", () => {
    expect(LIFECYCLE_STATES).toHaveLength(6);
    expect(LIFECYCLE_STATES).toContain("DRAFT");
    expect(LIFECYCLE_STATES).toContain("ACTIVE");
    expect(LIFECYCLE_STATES).toContain("CANCELLED");
  });

  it("should allow DRAFT → ACTIVE", () => {
    expect(canTransition("DRAFT", "ACTIVE")).toBe(true);
  });

  it("should allow DRAFT → TRIALING", () => {
    expect(canTransition("DRAFT", "TRIALING")).toBe(true);
  });

  it("should allow ACTIVE → PAST_DUE", () => {
    expect(canTransition("ACTIVE", "PAST_DUE")).toBe(true);
  });

  it("should allow CANCELLED → ACTIVE (reactivation)", () => {
    expect(canTransition("CANCELLED", "ACTIVE")).toBe(true);
  });

  it("should allow EXPIRED → ACTIVE (renewal)", () => {
    expect(canTransition("EXPIRED", "ACTIVE")).toBe(true);
  });

  it("should NOT allow ACTIVE → DRAFT", () => {
    expect(canTransition("ACTIVE", "DRAFT")).toBe(false);
  });

  it("should NOT allow CANCELLED → PAST_DUE", () => {
    expect(canTransition("CANCELLED", "PAST_DUE")).toBe(false);
  });

  it("should allow admin reset from EXPIRED → DRAFT", () => {
    expect(canTransition("EXPIRED", "DRAFT")).toBe(true);
  });

  it("should throw on illegal transition", () => {
    expect(() => validateTransition("ACTIVE", "DRAFT")).toThrow("Illegal subscription state transition");
  });

  it("should not throw on legal transition", () => {
    expect(() => validateTransition("DRAFT", "ACTIVE")).not.toThrow();
  });

  it("should return allowed transitions from ACTIVE", () => {
    const allowed = getAllowedTransitions("ACTIVE");
    expect(allowed).toContain("PAST_DUE");
    expect(allowed).toContain("CANCELLED");
    expect(allowed).toContain("EXPIRED");
    expect(allowed).not.toContain("DRAFT");
  });
});

describe("Billing Events", () => {
  it("SUBSCRIPTION_CREATED should set DRAFT", () => {
    expect(statusAfterEvent("SUBSCRIPTION_CREATED", null)).toBe("DRAFT");
  });

  it("PAYMENT_SUCCEEDED from DRAFT should activate", () => {
    expect(statusAfterEvent("PAYMENT_SUCCEEDED", "DRAFT")).toBe("ACTIVE");
  });

  it("PAYMENT_FAILED should set PAST_DUE", () => {
    expect(statusAfterEvent("PAYMENT_FAILED", "ACTIVE")).toBe("PAST_DUE");
  });

  it("SUBSCRIPTION_RENEWED should set ACTIVE", () => {
    expect(statusAfterEvent("SUBSCRIPTION_RENEWED", "PAST_DUE")).toBe("ACTIVE");
  });

  it("SUBSCRIPTION_CANCELLED should set CANCELLED", () => {
    expect(statusAfterEvent("SUBSCRIPTION_CANCELLED", "ACTIVE")).toBe("CANCELLED");
  });

  it("REFUND_COMPLETED should set CANCELLED", () => {
    expect(statusAfterEvent("REFUND_COMPLETED", "ACTIVE")).toBe("CANCELLED");
  });
});

describe("Idempotency", () => {
  it("should detect duplicates", () => {
    const idem = new BillingIdempotency();
    expect(idem.isDuplicate("evt_001")).toBe(false);
    expect(idem.isDuplicate("evt_001")).toBe(true);
  });

  it("should track processed count", () => {
    const idem = new BillingIdempotency();
    idem.markProcessed("a");
    idem.markProcessed("b");
    idem.markProcessed("c");
    expect(idem.size).toBe(3);
  });

  it("should reset", () => {
    const idem = new BillingIdempotency();
    idem.markProcessed("x");
    idem.reset();
    expect(idem.size).toBe(0);
  });
});
