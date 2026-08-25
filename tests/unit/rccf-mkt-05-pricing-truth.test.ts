/**
 * RCCF-MKT-05 — Pricing Truth, Plan Entitlements & Super Admin Pricing Authority.
 *
 * Pins the approved business pricing contract across every authoritative layer:
 * registry (COMMERCE_PLANS) → capability engine (enforcement) → marketing
 * surfaces (homepage + /pricing + comparison matrix) → billing safety.
 *
 * Guardrail style: assert the CORRECT tokens are present AND the WRONG/stale
 * tokens are absent (source-level where a surface cannot be imported).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COMMERCE_PLANS,
  COMMERCE_PLAN_BY_CODE,
  getMarketingPlans,
  getEnterprisePlan,
  getPlanMonthlyPrice,
  getAnnualSavingsPercent,
  razorpayPlanIdFor,
  isManualPlan,
  LEGACY_TO_CANONICAL,
} from "@/config/commerce/plans";
import { capabilityService } from "@/lib/capabilities";
import { canonicalPlanCode } from "@/lib/capabilities/plan-resolution";
import { PLAN_CODES, UPGRADE_PATHS, LEGACY_PLAN_MAP } from "@/lib/capabilities/constants";
import { FEATURE_CATALOG } from "@/lib/capabilities/features";
import { APPROVED_STORAGE } from "@/components/marketing/Pricing/data";
import {
  LAUNCH_GLOBAL_LIMIT,
  LAUNCH_CORE_FEATURES,
} from "@/modules/billing/application/content-limit.enforcement";

const plan = (code: string) => COMMERCE_PLAN_BY_CODE[code];
const readSrc = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

// ── 1. Approved Creator pricing contract ─────────────────────────────────────

describe("RCCF-MKT-05 — Creator pricing contract", () => {
  it("Launch ₹0 · Growth ₹999 · Scale ₹1,999 · Enterprise manual/contact", () => {
    expect(plan("creator_launch").price).toBe(0);
    expect(plan("creator_grow").price).toBe(999);
    expect(plan("creator_scale").price).toBe(1999);
    expect(plan("creator_enterprise").price).toBeNull();
    expect(plan("creator_enterprise").manual).toBe(true);
    expect(plan("creator_enterprise").ctaType).toBe("contact");
  });

  it("capabilityService (the enforcement layer) sees the same prices", () => {
    expect(capabilityService.getPlan("creator_launch")?.price).toBe(0);
    expect(capabilityService.getPlan("creator_grow")?.price).toBe(999);
    expect(capabilityService.getPlan("creator_scale")?.price).toBe(1999);
  });

  it("retired prices are not active anywhere in the registry", () => {
    const prices = COMMERCE_PLANS.map((p) => p.price);
    expect(prices).not.toContain(699);
    expect(prices).not.toContain(1995);
    // Partner legacy values covered in the partner block below.
  });
});

// ── 2. Approved Partner pricing contract ─────────────────────────────────────

describe("RCCF-MKT-05 — Partner pricing contract", () => {
  it("Free/Launch ₹0 · Solo ₹4,999 · Scale ₹14,999 · Enterprise manual/contact", () => {
    expect(plan("partner_free").price).toBe(0);
    expect(plan("partner_solo").price).toBe(4999);
    expect(plan("partner_scale").price).toBe(14999);
    expect(plan("partner_enterprise").manual).toBe(true);
    expect(plan("partner_enterprise").enterprise).toBe(true);
    expect(plan("partner_enterprise").hidden).toBe(true);
    expect(plan("partner_enterprise").ctaType).toBe("contact");
  });

  it("old partner pricing is not active (no 2,999 / 7,999 plan prices)", () => {
    for (const p of COMMERCE_PLANS) {
      expect(p.price, `${p.code} must not carry stale pricing`).not.toBe(2999);
      expect(p.price).not.toBe(7999);
      expect(p.price).not.toBe(699);
      expect(p.price).not.toBe(1995);
    }
  });
});

// ── 3. Yearly pricing architecture (existing invariant — documented, not invented)

describe("RCCF-MKT-05 — yearly pricing architecture", () => {
  // MODERNIZED in RCCF-73: the annual=10×monthly invariant covers the
  // RECURRING (Creator) catalog; Partner Solo/Scale are one-time and carry no
  // annual variant at all.
  it("annualPrice keeps the catalog invariant annual = 10 × monthly (~17% saving)", () => {
    for (const code of ["creator_grow", "creator_scale"]) {
      const p = plan(code);
      expect(p.annualPrice, `${code} annual`).toBe((p.price as number) * 10);
    }
    for (const code of ["partner_solo", "partner_scale"]) {
      expect(plan(code).annualPrice ?? null, `${code} one-time`).toBeNull();
    }
  });

  it("monthly-equivalent display math derives from annualPrice/12", () => {
    const scale = plan("creator_scale");
    expect(getPlanMonthlyPrice(scale, "yearly")).toBe(Math.round(19990 / 12));
    expect(getPlanMonthlyPrice(scale, "monthly")).toBe(1999);
    const savings = getAnnualSavingsPercent(scale);
    expect(savings).toBeGreaterThan(0);
    expect(savings).toBeLessThanOrEqual(25); // matches the "Save ~17%" UI pill band
  });
});

// ── 4. Legacy: Partner Growth fully retired ─────────────────────────────────

describe("RCCF-MKT-05 — Partner Growth stays retired", () => {
  it("absent from the registry and canonical plan codes", () => {
    expect(COMMERCE_PLANS.some((p) => p.code === "partner_growth")).toBe(false);
    expect(PLAN_CODES).not.toContain("partner_growth");
    expect(PLAN_CODES).not.toContain("agency_agency");
    expect(COMMERCE_PLANS.filter((p) => p.family === "partner").map((p) => p.code)).toEqual([
      "partner_free",
      "partner_solo",
      "partner_scale",
      "partner_enterprise",
    ]);
  });

  it("cannot be resolved through any alias or legacy map", () => {
    expect(canonicalPlanCode("partner_growth")).toBeNull();
    expect(canonicalPlanCode("agency_agency")).toBeNull();
    for (const target of Object.values(LEGACY_TO_CANONICAL)) {
      expect(target).not.toBe("partner_growth");
    }
    expect(Object.values(LEGACY_PLAN_MAP)).not.toContain("partner_growth");
  });

  it("no upgrade/downgrade path reaches Partner Growth; public lineup excludes it", () => {
    for (const [from, targets] of Object.entries(UPGRADE_PATHS)) {
      expect(targets, `upgrade path from ${from}`).not.toContain("partner_growth");
    }
    expect(getMarketingPlans("partner").map((p) => p.code)).toEqual([
      "partner_free",
      "partner_solo",
      "partner_scale",
    ]);
    expect(getEnterprisePlan("partner")?.code).toBe("partner_enterprise");
  });

  it("historical closure docs are left untouched (spot check: MKT-04-R1 doc still exists)", () => {
    // Historical records must NOT be rewritten — only assert existence.
    const doc = join(process.cwd(), "docs/rccf-mkt-04-homepage-responsive-capability-truth-closure.md");
    expect(() => readFileSync(doc, "utf8")).not.toThrow();
  });
});

// ── 5. Creator Launch entitlement audit (runtime truth) ──────────────────────

describe("RCCF-MKT-05 — Creator Launch entitlement truth", () => {
  const launch = capabilityService.getPlan("creator_launch")!;

  it("per-type content limits are all exactly 3 (availability markers)", () => {
    const perTypeThree = [
      "max_products", "max_gallery", "max_services", "max_courses",
      "max_testimonials", "max_faq", "max_timeline", "max_links", "max_feed", "max_games",
    ];
    for (const key of perTypeThree) {
      expect(launch.features[key], `launch.${key}`).toBe(3);
    }
  });

  it("bookings/AI credits disabled; storage 20 MB; hero video 12 MB / 15 s", () => {
    expect(launch.features.max_bookings).toBe(0);
    expect(launch.features.ai_credits).toBe(0);
    expect(launch.features.storage_mb).toBe(20);
    expect(launch.features.hero_video_enabled).toBe(true);
    expect(launch.features.hero_video_max_size_mb).toBe(12);
    expect(launch.features.hero_video_max_duration_sec).toBe(15);
  });

  it("core content types share ONE global active ceiling of 3 (products+services+courses+games)", () => {
    expect(LAUNCH_GLOBAL_LIMIT).toBe(3);
    expect([...LAUNCH_CORE_FEATURES].sort()).toEqual(["max_courses", "max_games", "max_products", "max_services"]);
    // Enforcement reports the global ceiling as the effective limit on Launch.
    for (const feature of LAUNCH_CORE_FEATURES) {
      const decision = capabilityService.checkLimit("creator_launch", feature, 0);
      expect(decision.limit).toBe(3);
    }
  });

  it("Games ARE available on Launch (limit 3, shared ceiling) — matrix must show 3, growth shows 10, scale unlimited", () => {
    expect(capabilityService.getPlan("creator_launch")!.features.max_games).toBe(3);
    expect(capabilityService.getPlan("creator_grow")!.features.max_games).toBe(10);
    expect(capabilityService.getPlan("creator_scale")!.features.max_games).toBe(-1);
    expect(capabilityService.checkLimit("creator_launch", "max_games", 0).remaining).toBeGreaterThan(0);
    expect(capabilityService.can("creator_launch", "max_games").allowed).toBe(true);
  });
});

// ── 6. Comparison matrix truth (UI value === runtime value) ──────────────────

describe("RCCF-MKT-05 — comparison matrix vocabulary & values", () => {
  it("feature labels use precise entity names — never 'uploads'", () => {
    const expectedLabels: Record<string, string> = {
      max_gallery: "Gallery Items",
      max_services: "Services",
      max_courses: "Courses",
      max_testimonials: "Testimonials",
      max_faq: "FAQs",
      max_timeline: "Timeline Entries",
      max_links: "Links",
      max_feed: "Feed Posts",
      max_games: "Games",
    };
    for (const [id, label] of Object.entries(expectedLabels)) {
      expect(FEATURE_CATALOG[id]?.label, id).toBe(label);
    }
    for (const info of Object.values(FEATURE_CATALOG)) {
      expect(info.label.toLowerCase()).not.toContain("upload");
    }
  });

  it("approved creator storage table equals runtime storage_mb", () => {
    expect(APPROVED_STORAGE.creator_launch).toBe(`${capabilityService.getPlan("creator_launch")!.features.storage_mb} MB`);
    expect(APPROVED_STORAGE.creator_grow).toBe(`${capabilityService.getPlan("creator_grow")!.features.storage_mb} MB`);
    expect(APPROVED_STORAGE.creator_scale).toBe(`${capabilityService.getPlan("creator_scale")!.features.storage_mb} MB`);
  });

  it("comparison note number stays in parity with the runtime Launch ceiling", () => {
    const src = readSrc("src/components/marketing/Pricing/comparison.tsx");
    const match = src.match(/up to (\d+) active items/);
    expect(match, "Launch core-content note present in comparison matrix").not.toBeNull();
    expect(Number(match![1])).toBe(LAUNCH_GLOBAL_LIMIT);
  });

  it("Launch marketing highlights state the combined allowance, not four independent '3×' buckets", () => {
    const hl = plan("creator_launch").marketingHighlights ?? [];
    expect(hl.join(" | ")).toContain("Up to 3 active items across products, services, courses & games");
    for (const stale of ["3 products", "3 services", "3 courses", "3 games"]) {
      expect(hl).not.toContain(stale);
    }
  });
});

// ── 7. Marketing surfaces consume runtime (no duplicated hardcoded prices) ───

describe("RCCF-MKT-05 — marketing pricing truth (source guardrails)", () => {
  it("registry source contains no retired price tokens", () => {
    const src = readSrc("src/config/commerce/plans.ts");
    expect(src).not.toMatch(/\b699\b/);
    expect(src).not.toMatch(/price:\s*1995\b/);
    expect(src).not.toMatch(/price:\s*7999\b/);
    expect(src).not.toMatch(/\bannualPrice:\s*19950\b/);
    expect(src).not.toMatch(/\bannualPrice:\s*79990\b/);
    expect(src).toMatch(/price:\s*1999\b/);
    expect(src).toMatch(/price:\s*14999\b/);
  });

  it("/pricing metadata derives both family 'from' prices from runtime", () => {
    const page = readSrc("src/app/pricing/page.tsx");
    expect(page).toContain("paidFromPrice(data.creator)");
    expect(page).toContain("paidFromPrice(data.partner)");
    expect(page).not.toContain("₹4,999");
    expect(page).not.toContain("₹7,999");
  });

  it("partner add-on copy consumes the canonical constant, not a formatted literal", () => {
    const pricing = readSrc("src/components/marketing/Pricing/index.tsx");
    expect(pricing).toContain("PARTNER_ADDON_UNIT_PRICE_INR");
    expect(pricing).not.toContain("₹1,499");
  });

  it("homepage renders the shared runtime Pricing component (single pricing surface)", () => {
    const home = readSrc("src/app/page.tsx");
    expect(home).toContain("getPublicPricingData()");
    expect(home).toMatch(/<Pricing data=\{pricingData\}/);
  });
});

// ── 8. Super Admin ↔ runtime ↔ billing coherence ─────────────────────────────

describe("RCCF-MKT-05 — Super Admin catalog coherence & billing safety", () => {
  it("resync mechanism rebuilds BillingPlan rows from this registry (seed + override wipe)", () => {
    const actions = readSrc("src/actions/super-admin-pricing.actions.ts");
    expect(actions).toContain("seedBillingCatalog()");
    expect(actions).toContain("updateMany"); // wipes runtimeConfig so the registry becomes authoritative
  });

  it("every registry plan resolves through the capability engine with matching identity", () => {
    for (const p of COMMERCE_PLANS) {
      const resolved = capabilityService.getPlan(p.code);
      expect(resolved, p.code).toBeDefined();
      expect(resolved!.name).toBe(p.name);
      if (p.price !== null) expect(resolved!.price).toBe(p.price);
      expect(canonicalPlanCode(p.code)).toBe(p.code);
    }
  });

  it("Scale checkout no longer references the retired ₹1,995 Razorpay contract; Growth keeps its provisioned plan", () => {
    expect(razorpayPlanIdFor("creator_scale")).toBeNull();
    const growId = razorpayPlanIdFor("creator_grow");
    expect(growId).toBeTruthy();
    expect(growId!.startsWith("plan_")).toBe(true);
  });

  it("manual plans never create a public checkout; enterprise stays contact-only", () => {
    expect(isManualPlan("creator_enterprise")).toBe(true);
    expect(isManualPlan("partner_enterprise")).toBe(true);
    expect(isManualPlan("creator_scale")).toBe(false);
    expect(isManualPlan("partner_scale")).toBe(false);
  });
});
