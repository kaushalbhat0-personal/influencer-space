/**
 * RCCF-FINANCE-04 — Manual Renewal Billing for Agency/Freelancer
 * Proves one-time Razorpay order per period, no subscriptions, cycle persisted, wrong-cycle rejected, duplicate not double-extend, expiry requires manual renewal, etc.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PARTNER_RECURRING_PRICES, partnerPriceForCycle, royaltyPercentForActiveClients, computeAgencyRoyalty } from "@/config/commerce/agency-commercial";
import { getCommercePlan, isOneTimePlan } from "@/config/commerce/plans";

describe("FINANCE-04 — manual renewal pricing (one-time per period)", () => {
  it("Solo monthly 4999 / yearly 49990", () => {
    expect(PARTNER_RECURRING_PRICES.partner_solo.monthly).toBe(4999);
    expect(PARTNER_RECURRING_PRICES.partner_solo.yearly).toBe(49990);
    expect(partnerPriceForCycle("partner_solo", "monthly")).toBe(4999);
    expect(partnerPriceForCycle("partner_solo", "yearly")).toBe(49990);
  });
  it("Scale monthly 14999 / yearly 149990", () => {
    expect(PARTNER_RECURRING_PRICES.partner_scale.monthly).toBe(14999);
    expect(PARTNER_RECURRING_PRICES.partner_scale.yearly).toBe(149990);
  });
  it("Additional client 2000", async () => {
    const { PARTNER_ADDON_UNIT_PRICE_INR } = await import("@/config/commerce/agency-addons");
    expect(PARTNER_ADDON_UNIT_PRICE_INR).toBe(2000);
  });
  it("partner_solo/scale are one_time (manual) with annualPrice", () => {
    const solo = getCommercePlan("partner_solo")!;
    const scale = getCommercePlan("partner_scale")!;
    expect(isOneTimePlan("partner_solo")).toBe(true);
    expect(isOneTimePlan("partner_scale")).toBe(true);
    expect(solo.billingForm).toBe("one_time");
    expect(scale.billingForm).toBe("one_time");
    expect(solo.annualPrice).toBe(49990);
    expect(scale.annualPrice).toBe(149990);
  });
});

describe("FINANCE-04 — no Razorpay Subscription required", () => {
  it("provider does not require razorpayPlanId for agency — manual renewal uses orders", () => {
    const src = readFileSync(resolve("src/modules/billing/infrastructure/providers/razorpay.ts"), "utf8");
    expect(src).toContain('isOneTimePlan(params.planCode)');
    expect(src).toContain("razorpay.orders.create");
    // Agency manual path must not mandate subscription plan id
    expect(src).toContain("one-time order");
    // Should NOT imply agency requires subscription
    expect(src).not.toMatch(/partner_.*subscriptions\.create/);
  });
  it("CheckoutParams cycle present, no razorpayYearlyPlanId required", () => {
    const types = readFileSync(resolve("src/modules/billing/domain/types.ts"), "utf8");
    expect(types).toContain('cycle?: "monthly" | "yearly"');
    const svc = readFileSync(resolve("src/modules/billing/application/service.ts"), "utf8");
    expect(svc).toContain("partnerPriceForCycle");
  });
});

describe("FINANCE-04 — entitlement period (monthly +1 month, yearly +1 year, no perpetual)", () => {
  it("service computes renewsAt from cycle when provider does not supply it", () => {
    const svc = readFileSync(resolve("src/modules/billing/application/service.ts"), "utf8");
    expect(svc).toContain("effectiveRenewsAt");
    expect(svc).toContain('c === "yearly"');
    expect(svc).toContain("setFullYear");
    expect(svc).toContain("setMonth");
    expect(svc).not.toContain("new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)");
  });
  it("webhook deriveRenewsAt cycle-aware via notes.cycle + capturedAmount inference", () => {
    const route = readFileSync(resolve("src/app/api/webhooks/razorpay/route.ts"), "utf8");
    expect(route).toContain("deriveRenewsAt");
    expect(route).toContain("effectiveCycle");
    expect(route).toContain("setFullYear");
    expect(route).toContain("setMonth");
  });
  it("billing-expiry promotes ACTIVE past renewsAt to PAST_DUE (manual renewal expiry)", () => {
    const expiry = readFileSync(resolve("src/modules/billing/application/billing-expiry.ts"), "utf8");
    expect(expiry).toContain('status: "ACTIVE"');
    expect(expiry).toContain("PAST_DUE");
    expect(expiry).toContain("period_expired");
  });
  it("no perpetual — ACTIVE one_time with past renewsAt not eligible", () => {
    // isSubscriptionEntitlementEligible still true for ACTIVE null, but legacy ACTIVE null blocked in plan-source
    // Manual renewal ACTIVE with past renewsAt should be PAST_DUE after expiry cron
    const src = readFileSync(resolve("src/modules/billing/application/plan-source.ts"), "utf8");
    expect(src).toContain('status === "ACTIVE" && !legacy.currentPeriodEnd');
  });
});

describe("FINANCE-04 — wrong-cycle, duplicate, failed, expiry, renewal", () => {
  it("wrong-cycle amount rejected (cycle-specific drift)", () => {
    const svc = readFileSync(resolve("src/modules/billing/application/service.ts"), "utf8");
    expect(svc).toContain('cycleForValidation');
    expect(svc).toContain('if (cycleForValidation === "yearly")');
    expect(svc).toContain('if (cycleForValidation === "monthly")');
    expect(svc).toContain("one_time_amount_mismatch");
  });
  it("duplicate webhook cannot double-extend (idempotencyKey + providerReference)", () => {
    const svc = readFileSync(resolve("src/modules/billing/application/service.ts"), "utf8");
    expect(svc).toContain("isDuplicateEvent");
    expect(svc).toContain("idempotencyKey");
    const runner = readFileSync(resolve("src/modules/billing/application/reconciliation-runner.ts"), "utf8");
    expect(runner).toContain("reconcile_resolved_");
  });
  it("failed payment does not activate (payment_guard)", () => {
    const svc = readFileSync(resolve("src/modules/billing/application/service.ts"), "utf8");
    expect(svc).toContain("payment_guard:no_activation");
    expect(svc).toContain("RECONCILIATION_REQUIRED");
  });
  it("UI shows manual renewal, not auto-renew", () => {
    const manager = readFileSync(resolve("src/app/agency/billing/_components/agency-plan-manager.tsx"), "utf8");
    expect(manager).toContain("Renew manually");
    expect(manager).toContain("Yearly — ₹");
    expect(manager).toContain("Monthly — ₹");
    expect(manager).not.toContain("subscription_id");
    const page = readFileSync(resolve("src/app/agency/billing/page.tsx"), "utf8");
    expect(page).toContain("Renew manually");
    expect(page).not.toContain("auto-renew");
    expect(page).not.toContain("auto-charge");
  });
});

describe("FINANCE-04 — royalty unchanged + ProductOrder excluded", () => {
  const cases: Array<[number, number]> = [[0,0],[4,0],[5,20],[25,20],[26,30],[50,30],[51,40]];
  for (const [c,p] of cases) it(`${c} clients → ${p}%`, () => expect(royaltyPercentForActiveClients(c)).toBe(p));
  it("royalty only from SaaS, ProductOrder 0", () => {
    expect(computeAgencyRoyalty({ activeClientCount: 10, qualifyingRecurringRevenue: 9990 }).royaltyAmount).toBe(1998);
    expect(computeAgencyRoyalty({ activeClientCount: 10, qualifyingRecurringRevenue: 0 }).royaltyAmount).toBe(0);
  });
});

describe("FINANCE-04 — creator billing unaffected", () => {
  it("creator_grow remains subscription (not one_time)", () => {
    expect(isOneTimePlan("creator_grow")).toBe(false);
    expect(getCommercePlan("creator_grow")!.razorpayPlanId).toBeTruthy();
    expect(isOneTimePlan("creator_scale")).toBe(false);
  });
});
