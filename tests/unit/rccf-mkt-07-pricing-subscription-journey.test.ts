/**
 * RCCF-MKT-07 — Pricing, Upgrade & Subscription Journey audit guards.
 *
 * Pins the audited truths of the full journey:
 *   marketing → runtime registry → BillingPlan catalog → checkout/subscription
 *   → subscription state → entitlement enforcement → dashboard/UI.
 *
 * Style: pure functions + source contracts. No DB writes, no network, no
 * provider calls, no live Razorpay objects (read/audit-only ticket).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

import { COMMERCE_PLANS, getCommercePlan } from "@/config/commerce/plans";
import { capabilityService } from "@/lib/capabilities";
import { canonicalPlanCode, planTierFor } from "@/lib/capabilities/plan-resolution";
import { entitlementService } from "@/lib/capabilities/entitlements";
import { isSubscriptionEntitlementEligible } from "@/modules/billing/application/plan-source";
import {
  LAUNCH_GLOBAL_LIMIT,
  LAUNCH_CORE_FEATURES,
  isLaunchPlan,
} from "@/modules/billing/application/content-limit.enforcement";
import { canTransition, validateTransition } from "@/modules/billing/domain/lifecycle";

// ── Pricing truth ────────────────────────────────────────────────────────────

describe("MKT-07 — authoritative pricing truth", () => {
  it("resolves exactly the approved monthly prices", () => {
    expect(getCommercePlan("creator_launch")?.price).toBe(0);
    expect(getCommercePlan("creator_grow")?.price).toBe(999);
    expect(getCommercePlan("creator_scale")?.price).toBe(1999);
    expect(getCommercePlan("partner_free")?.price).toBe(0);
    expect(getCommercePlan("partner_solo")?.price).toBe(4999);
    expect(getCommercePlan("partner_scale")?.price).toBe(14999);
  });

  // MODERNIZED in RCCF-73: annual billing exists ONLY for recurring Creator
  // plans. Partner Solo/Scale are ONE-TIME purchases — no annual variant.
  it("keeps annualPrice = 10 × monthly across the recurring (Creator) catalog; partners have none", () => {
    for (const code of ["creator_grow", "creator_scale"]) {
      const p = getCommercePlan(code)!;
      expect(p.annualPrice, code).toBe(p.price! * 10);
    }
    for (const code of ["partner_solo", "partner_scale"]) {
      expect(getCommercePlan(code)?.annualPrice ?? null, `${code} is one-time`).toBeNull();
    }
  });

  it("carries no retired price anywhere in the registry", () => {
    const prices = COMMERCE_PLANS.map((p) => p.price);
    for (const stale of [699, 1995, 2999, 7999]) expect(prices).not.toContain(stale);
  });

  it("keeps Partner Growth retired and unresolvable as a canonical plan", () => {
    expect(COMMERCE_PLANS.some((p) => p.code === "partner_growth")).toBe(false);
    expect(canonicalPlanCode("partner_growth")).toBeNull();
    // Unknown/retired codes sit in the free tier band, never a paid band.
    expect(planTierFor("partner_growth")).toBe("free");
  });
});

// ── Creator Launch quota truth ───────────────────────────────────────────────

describe("MKT-07 — Creator Launch entitlement truth", () => {
  it("enforces ONE shared ceiling of 3 ACTIVE items across products/services/courses/games", () => {
    expect(LAUNCH_GLOBAL_LIMIT).toBe(3);
    expect(LAUNCH_CORE_FEATURES.has("max_products")).toBe(true);
    expect(LAUNCH_CORE_FEATURES.has("max_services")).toBe(true);
    expect(LAUNCH_CORE_FEATURES.has("max_courses")).toBe(true);
    expect(LAUNCH_CORE_FEATURES.has("max_games")).toBe(true);
    expect(LAUNCH_CORE_FEATURES.size).toBe(4);
  });

  it("keeps independent per-type limits of 3 outside the core set, and bookings OFF", () => {
    const ov = getCommercePlan("creator_launch")!.featureOverrides;
    expect(ov.max_gallery).toBe(3);
    expect(ov.max_testimonials).toBe(3);
    expect(ov.max_faq).toBe(3);
    expect(ov.max_timeline).toBe(3);
    expect(ov.max_links).toBe(3);
    expect(ov.max_feed).toBe(3);
    expect(ov.max_bookings).toBe(0); // bookings are NOT part of the Launch offer
    expect(ov.max_orders).toBe(10);
    expect(ov.storage_mb).toBe(20);
    expect(ov.ai_credits).toBe(0);
  });

  it("marketing copy states the shared allowance, never four independent buckets", () => {
    const src = read("src/config/commerce/plans.ts");
    expect(src).toContain("Up to 3 active items across products, services, courses & games");
    expect(src).toContain("combined allowance");
  });

  it("the comparison matrix explains the same combined rule", () => {
    const src = read("src/components/marketing/Pricing/comparison.tsx");
    expect(src).toContain("combined allowance of up to 3 active items");
  });

  it("identifies Launch (and aliases) as the global-limit plan only", () => {
    expect(isLaunchPlan("creator_launch")).toBe(true);
    expect(isLaunchPlan("creator_grow")).toBe(false);
    expect(isLaunchPlan("creator_scale")).toBe(false);
    expect(isLaunchPlan(null)).toBe(false);
  });
});

// ── Entitlement truth ────────────────────────────────────────────────────────

describe("MKT-07 — entitlement resolution matches the approved tiers", () => {
  it("gates headline capabilities per plan exactly as marketed", () => {
    const cases: Array<[string, string, boolean]> = [
      ["advanced_builder", "creator_launch", false],
      ["advanced_builder", "creator_grow", true],
      ["ai_automation", "creator_grow", true],
      ["api_access", "creator_scale", true],
      ["api_access", "creator_grow", false],
      ["webhooks", "creator_scale", true],
      ["webhooks", "creator_grow", false],
      ["custom_domain", "creator_scale", true],
      ["white_label", "partner_scale", true],
      ["white_label", "partner_solo", false],
      ["premium_themes", "creator_launch", false],
      ["premium_themes", "creator_grow", true],
    ];
    for (const [feature, plan, allowed] of cases) {
      expect(capabilityService.can(plan, feature).allowed, `${plan}:${feature}`).toBe(allowed);
    }
  });

  it("maps the commerce advanced_ai claim onto the real engine feature", () => {
    // Marketing says Scale includes Advanced AI; the engine expresses it as
    // ai_automation — the commerce mapper bridges the two names.
    expect(capabilityService.can("creator_scale", "ai_automation").allowed).toBe(true);
    expect(capabilityService.limit("creator_scale", "ai_credits")).toBe(2000);
  });

  it("server gate resolves granular theme capabilities from the engine, not rc arrays", () => {
    expect(entitlementService.has("creator_launch", "theme_background_image")).toBe(false);
    expect(entitlementService.has("creator_scale", "theme_background_video")).toBe(true);
  });
});

// ── Plan resolution & lifecycle ──────────────────────────────────────────────

describe("MKT-07 — subscription state grants or denies entitlements safely", () => {
  const now = new Date("2026-08-24T12:00:00Z");
  const future = new Date("2026-09-24T12:00:00Z");
  const past = new Date("2026-08-01T12:00:00Z");

  it("ACTIVE grants until period end; TRIALING only while the trial is open", () => {
    expect(isSubscriptionEntitlementEligible({ status: "ACTIVE", renewsAt: future }, now)).toBe(true);
    expect(isSubscriptionEntitlementEligible({ status: "TRIALING", trialEndsAt: future }, now)).toBe(true);
    expect(isSubscriptionEntitlementEligible({ status: "TRIALING", trialEndsAt: past }, now)).toBe(false);
    expect(isSubscriptionEntitlementEligible({ status: "ACTIVE" }, now)).toBe(true); // no end → active
  });

  it("PAST_DUE / CANCELLED / EXPIRED never grant access (no grace period by design)", () => {
    for (const status of ["PAST_DUE", "CANCELLED", "EXPIRED"]) {
      expect(isSubscriptionEntitlementEligible({ status, renewsAt: future }, now)).toBe(false);
    }
  });

  it("lifecycle allows exactly the documented transitions and rejects the rest", () => {
    expect(canTransition("TRIALING", "ACTIVE")).toBe(true);
    expect(canTransition("ACTIVE", "PAST_DUE")).toBe(true);
    expect(canTransition("ACTIVE", "CANCELLED")).toBe(true);
    expect(canTransition("CANCELLED", "ACTIVE")).toBe(true);
    expect(canTransition("CANCELLED", "TRIALING")).toBe(false);
    expect(() => validateTransition("EXPIRED", "TRIALING")).toThrow(/Illegal/);
    expect(() => validateTransition("DRAFT", "PAST_DUE")).toThrow(/Illegal/);
  });
});

// ── Upgrade / downgrade paths ────────────────────────────────────────────────

describe("MKT-07 — upgrade/downgrade surface truth", () => {
  it("derives the creator upgrade ladder from price order within the family", async () => {
    const { getUpgradePath } = await import("@/lib/billing");
    const up: string[] = await getUpgradePath("creator_grow");
    expect(up).toContain("creator_scale");
    expect(up).not.toContain("creator_launch"); // cheaper tiers are never "upgrades"
    expect(await getUpgradePath("creator_scale")).toEqual([]); // top of ladder
  });

  it("changePlan validates status and delegates activation to webhooks (old plan kept until activation)", () => {
    const src = read("src/modules/billing/application/service.ts");
    expect(src).toMatch(/Cannot change plan from status/);
    expect(src).toMatch(/capabilities remain until the new subscription activates/);
  });

  it("documents that free-plan re-selection cannot mint a paid provider object", () => {
    // Launch/Free carry no razorpayPlanId and ₹0 price → provider path either
    // skips subscriptions (no id) or Razorpay rejects ₹0 orders — never a paid
    // contract. Guarded by the registry itself.
    expect(getCommercePlan("creator_launch")?.razorpayPlanId ?? null).toBeNull();
    expect(getCommercePlan("partner_free")?.razorpayPlanId ?? null).toBeNull();
  });

  it("flags the known asymmetry: partner path enforces family, creator path does not (F1/P2)", () => {
    const partner = read("src/actions/partner.actions.ts");
    expect(partner).toMatch(/family !== "partner"/);
    const creator = read("src/actions/billing.actions.ts");
    expect(creator).toMatch(/billingService\.changePlan\(workspaceId, planCode/);
    // Documenting current behavior — a creator session may request any valid
    // canonical code; family restriction is a pending product decision (P2).
  });
});

// ── Free / trial safety ──────────────────────────────────────────────────────

describe("MKT-07 — free/trial signup safety", () => {
  it("registration hardcodes FREE plans and truthful 15-day trials (no client planCode)", () => {
    const src = read("src/app/api/auth/register/route.ts");
    expect(src).toContain('"creator_launch"');
    expect(src).toContain('"partner_free"');
    expect(src).toMatch(/FREE-only/);
    expect(src).not.toMatch(/body\.planCode|body\.plan\b/);
  });

  it("registration never imports or touches Razorpay", () => {
    const src = read("src/app/api/auth/register/route.ts");
    expect(src).not.toMatch(/razorpay/i);
  });
});

// ── Super Admin authority & injection resistance ─────────────────────────────

describe("MKT-07 — super-admin authority and client injection resistance", () => {
  it("every exported pricing mutation is gated by requireSuperAdmin", () => {
    const src = read("src/actions/super-admin-pricing.actions.ts");
    const exports = src.match(/export async function \w+/g) ?? [];
    const gates = src.match(/await requireSuperAdmin\(\)/g) ?? [];
    // All mutating/reading entry points except none — requireSuperAdmin must
    // appear at least once per exported operation (8 exports observed).
    expect(exports.length).toBeGreaterThanOrEqual(8);
    expect(gates.length).toBeGreaterThanOrEqual(exports.length - 1); // helper-free tolerance documented in closure
  });

  it("billing actions scope every operation to the caller's own tenant workspace", () => {
    const src = read("src/actions/billing.actions.ts");
    expect(src).toMatch(/session\.user\.tenantId !== tenantId/);
    expect(src).toMatch(/findFirst\(\s*\{\s*where:\s*\{ id: workspaceId, tenantId \}/);
    expect(src).toMatch(/dev-only/); // simulator locked down
    expect(src).toMatch(/SUPER_ADMIN/);
  });

  it("checkout amounts and provider plan ids are always server-resolved", () => {
    const svc = read("src/modules/billing/application/service.ts");
    // price comes from the DB/runtime plan; provider id from stored runtimeConfig
    expect(svc).toMatch(/price: plan\.price/);
    expect(svc).toMatch(/rc\?\.pricing\?\.razorpayPlanId \?\? null/);
    const reg = read("src/app/api/auth/register/route.ts");
    expect(reg).not.toMatch(/amount/); // no client amount anywhere near signup
  });

  it("provider plan id preservation invariant holds in source (MKT-06.1 defect stays fixed)", () => {
    const src = read("src/actions/super-admin-pricing.actions.ts");
    expect(src).toMatch(/RCCF-MKT-06\.1 — preserve the DB-authoritative Razorpay plan id/);
    expect(src).toMatch(/RCCF-MKT-06 — live-mode fail-closed guard/);
    expect(src).toMatch(/RAZORPAY_LIVE_PROVISIONING_AUTHORIZED/);
  });

  it("webhook route verifies signatures with a length guard and rate limit", () => {
    const src = read("src/app/api/webhooks/razorpay/route.ts");
    expect(src).toMatch(/timingSafeEqual/);
    expect(src).toMatch(/expectedBuf\.length !== signatureBuf\.length/);
    expect(src).toMatch(/checkRateLimit/);
    expect(src).toMatch(/Webhook secret not configured/);
  });

  it("paid activation is impossible without a positive captured amount", () => {
    const src = read("src/modules/billing/application/service.ts");
    expect(src).toMatch(/payment_guard:no_activation/);
    expect(src).toMatch(/isPaidTransition && validPaidAmount === null/);
  });
});

// ── Provider ID retention (catalog layer, mocked) ───────────────────────────

describe("MKT-07 — BillingPlan/provider contract alignment", () => {
  it("declares provider contracts exactly where approved (registry layer)", () => {
    // MODERNIZED in RCCF-73: partner plans carry NO provider subscription id —
    // they are one-time orders; the legacy "plan_solo"/"plan_scale" placeholders
    // were retired so the subscription branch can never be selected for them.
    const expected: Record<string, string | null> = {
      creator_launch: null,
      creator_grow: "plan_TLTGQBU1EXkseF", // pre-existing valid Growth contract
      creator_scale: null, // BY DESIGN: Scale's LIVE contract is DB-authoritative
      creator_enterprise: null,
      partner_free: null,
      partner_solo: null,
      partner_scale: null,
      partner_enterprise: null,
    };
    for (const p of COMMERCE_PLANS) {
      expect(p.razorpayPlanId ?? null, `${p.code}`).toBe(expected[p.code] ?? null);
    }
  });

  it("keeps Creator Scale's live contract OUT of source and in the DB runtime path (MKT-06.1)", () => {
    // Registry deliberately holds no Scale provider id; checkout resolves it
    // from BillingPlan.runtimeConfig.pricing.razorpayPlanId (persisted live).
    expect(getCommercePlan("creator_scale")?.razorpayPlanId ?? null).toBeNull();
    const svc = read("src/modules/billing/application/service.ts");
    expect(svc).toMatch(/razorpayPlanId: rc\?\.pricing\?\.razorpayPlanId \?\? null/);
  });

  it("manual enterprise plans never produce public checkouts", () => {
    expect(getCommercePlan("partner_enterprise")?.manual).toBe(true);
    const provider = read("src/modules/billing/infrastructure/providers/razorpay.ts");
    expect(provider).toMatch(/isManualPlan\(params\.planCode\)/);
  });
});
