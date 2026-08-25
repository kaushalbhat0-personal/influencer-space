/**
 * RCCF-MKT-09 — Full Marketing Experience & Conversion Polish.
 *
 * Pins the post-audit marketing frontend:
 *   - Positioning ("Your presence. Your business." — broad, not "Indian creators")
 *   - Five capability pillars (Build · Showcase · Sell · Promote · Grow)
 *   - Pricing truth (Creator 0/999/1999, Partner Free 0 / Solo 4999 / Scale 14999)
 *   - Commercial semantics (Partner one-time, Creator paid recurring, ₹2,000
 *     additional-client one-time, Partner Growth absent)
 *   - Truth (no fabricated TESTIMONIALS / SOCIAL_PROOF_STATS / 90% / 20% commission
 *     / 10-client examples)
 *   - CTA persona-consistent routing (persona=creator / persona=partner)
 *   - SEO (runtime-derived pricing metadata, no hardcoded plan prices)
 *
 * Guardrail style: assert the CORRECT tokens are present AND the stale/wrong
 * tokens are absent, at the source + rendered layers.
 */
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, cleanup, fireEvent } from "@testing-library/react";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

import {
  COMMERCE_PLANS,
  COMMERCE_PLAN_BY_CODE,
  LEGACY_TO_CANONICAL,
  getCommercePlan,
  planBillingForm,
  isOneTimePlan,
} from "@/config/commerce/plans";
import { PARTNER_ADDON_UNIT_PRICE_INR } from "@/config/commerce/agency-addons";
import { mergeRuntimePlan } from "@/modules/pricing/application/runtime";
import type { ResolvedPlan } from "@/modules/pricing/application/runtime";
import { Pricing } from "@/components/marketing/Pricing";

beforeEach(() => {
  cleanup();
});

const plan = (code: string) => COMMERCE_PLAN_BY_CODE[code];

function resolved(code: string): ResolvedPlan {
  const defaults = getCommercePlan(code);
  if (!defaults) throw new Error(`unknown plan ${code}`);
  return mergeRuntimePlan(defaults);
}

function pricingData() {
  return {
    creator: [resolved("creator_launch"), resolved("creator_grow"), resolved("creator_scale")],
    partner: [resolved("partner_free"), resolved("partner_solo"), resolved("partner_scale")],
    enterpriseCreator: null,
    enterprisePartner: null,
  };
}

// ── 1. Positioning ───────────────────────────────────────────────────────────

describe("MKT-09 — positioning: Your presence. Your business.", () => {
  const homepage = read("src/app/page.tsx");
  const hero = read("src/components/marketing/Hero.tsx");
  const finalCta = read("src/components/marketing/FinalCta.tsx");
  const rootLayout = read("src/app/layout.tsx");

  it("carries the 'Your presence. Your business.' story on the homepage, hero and final CTA", () => {
    expect(homepage).toContain("Your presence. Your business.");
    expect(hero).toContain("Your presence.");
    expect(hero).toContain("business");
    expect(finalCta).toContain("Your presence. Your business.");
  });

  it("is not defined by a single 'Indian creators' segment", () => {
    expect(hero).not.toContain("Built for Indian creators");
    expect(rootLayout).not.toContain("Built for Indian creators");
    // Hero outcomes now speak to a broader audience without inventing claims.
    expect(hero).toContain("Your own professional website");
    expect(hero).toContain("For creators, freelancers & businesses");
  });

  it("does not overclaim a custom domain on every plan (Scale+ only)", () => {
    expect(hero).not.toContain("on your domain");
  });

  it("keeps truthful outcome claims that runtime supports", () => {
    expect(hero).toContain("Sell and keep 100% of every sale");
    expect(hero).toContain("Showcase work, links & products");
  });
});

// ── 2. Five capability pillars ───────────────────────────────────────────────

describe("MKT-09 — five capability pillars", () => {
  const messaging = read("src/lib/marketing/messaging.ts");
  const features = read("src/app/features/page.tsx");

  it("defines the five pillars: Build, Showcase, Sell, Promote, Grow", () => {
    for (const pillar of ["Build", "Showcase", "Sell", "Promote", "Grow"]) {
      expect(messaging).toMatch(new RegExp(`category: "${pillar}"`));
    }
  });

  it("features page renders the five pillar categories", () => {
    for (const pillar of ["Build", "Showcase", "Sell", "Promote", "Grow"]) {
      expect(features).toContain(pillar);
    }
  });
});

// ── 3. Pricing truth (registry contract) ─────────────────────────────────────

describe("MKT-09 — pricing truth", () => {
  it("Creator: Launch ₹0 · Growth ₹999 · Scale ₹1,999", () => {
    expect(plan("creator_launch").price).toBe(0);
    expect(plan("creator_grow").price).toBe(999);
    expect(plan("creator_scale").price).toBe(1999);
  });

  it("Partner: Free ₹0 · Solo ₹4,999 · Scale ₹14,999 · Enterprise custom", () => {
    expect(plan("partner_free").price).toBe(0);
    expect(plan("partner_solo").price).toBe(4999);
    expect(plan("partner_scale").price).toBe(14999);
    expect(plan("partner_enterprise").price).not.toBeNull();
    expect(plan("partner_enterprise").enterprise).toBe(true);
  });

  it("no stale plan prices linger in the registry", () => {
    const prices = COMMERCE_PLANS.map((p) => p.price);
    for (const stale of [699, 1499, 1995, 2999, 7999]) {
      expect(prices).not.toContain(stale);
    }
  });
});

// ── 4. Commercial semantics ──────────────────────────────────────────────────

describe("MKT-09 — commercial semantics", () => {
  const plans = read("src/config/commerce/plans.ts");

  it("Partner Solo/Scale are ONE-TIME purchases; Creator paid plans are recurring", () => {
    expect(isOneTimePlan("partner_solo")).toBe(true);
    expect(isOneTimePlan("partner_scale")).toBe(true);
    expect(planBillingForm("partner_solo")).toBe("one_time");
    expect(planBillingForm("partner_scale")).toBe("one_time");
    for (const code of ["creator_grow", "creator_scale"]) {
      expect(planBillingForm(code)).toBe("subscription");
      expect(isOneTimePlan(code)).toBe(false);
    }
  });

  it("additional client capacity is ₹2,000 ONE-TIME — never monthly", () => {
    expect(PARTNER_ADDON_UNIT_PRICE_INR).toBe(2000);
    const pricing = read("src/components/marketing/Pricing/index.tsx");
    expect(pricing).toContain("PARTNER_ADDON_UNIT_PRICE_INR");
    expect(pricing).toContain("one-time");
    expect(pricing).toContain("it is not a monthly charge");
    expect(pricing).not.toMatch(/PARTNER_ADDON_UNIT_PRICE_INR[^;]*\/month/);
    expect(pricing).not.toContain("₹2,000/month");
  });

  it("Partner Growth is retired — absent from the registry and aliases", () => {
    const codes = COMMERCE_PLANS.map((p) => p.code);
    expect(codes).not.toContain("partner_growth");
    // No alias routes anything TO partner_growth anymore (the comment in
    // plans.ts documents the removal — that is expected).
    expect(Object.values(LEGACY_TO_CANONICAL)).not.toContain("partner_growth");
    expect(plans).not.toMatch(/partner_growth:\s*"/);
  });
});

// ── 5. Truth — no fabricated social proof or commission examples ─────────────

describe("MKT-09 — marketing truth", () => {
  const trustTestimonials = read("src/lib/marketing/trust/testimonials.ts");
  const trustMetrics = read("src/lib/marketing/trust/metrics.ts");
  const homepage = read("src/app/page.tsx");
  const pricingIndex = read("src/components/marketing/Pricing/index.tsx");
  const pricingData = read("src/components/marketing/Pricing/data.ts");

  it("no fabricated testimonials or social-proof statistics are shipped", () => {
    expect(trustTestimonials).toContain("intentionally empty");
    expect(trustMetrics).toContain("intentionally empty");
    expect(homepage).not.toContain("SEED_TESTIMONIALS");
    expect(homepage).not.toContain("SEED_METRICS");
    expect(homepage).not.toContain("SEED_CASE_STUDIES");
  });

  it("no fabricated commission percentage or client-count example", () => {
    for (const src of [pricingIndex, pricingData]) {
      expect(src).not.toMatch(/20%/);
      expect(src).not.toContain("0.2%");
      expect(src).not.toContain("10 clients on Creator Growth");
      expect(src).not.toContain("10 clients");
    }
  });

  it("no '90%' statistic anywhere in marketing surfaces", () => {
    for (const src of [pricingIndex, pricingData, homepage]) {
      expect(src).not.toContain("90%");
    }
  });
});

// ── 6. CTA persona-consistent routing ────────────────────────────────────────

describe("MKT-09 — CTA persona routing", () => {
  const nav = read("src/components/marketing/MarketingNav.tsx");
  const finalCta = read("src/components/marketing/FinalCta.tsx");
  const features = read("src/app/features/page.tsx");
  const about = read("src/app/about/page.tsx");
  const showcase = read("src/app/showcase/page.tsx");

  it("nav carries creator and partner CTAs with the correct personas", () => {
    expect(nav).toContain('href="/signup?persona=creator"');
    expect(nav).toContain('href="/signup?persona=partner"');
  });

  it("final CTA routes creator → persona=creator and partner → persona=partner", () => {
    expect(finalCta).toContain('href="/signup?persona=creator"');
    expect(finalCta).toContain('href="/signup?persona=partner"');
  });

  it("features, about and showcase creator CTAs carry persona=creator", () => {
    expect(features).toContain('href="/signup?persona=creator"');
    expect(about).toContain('href="/signup?persona=creator"');
    expect(showcase).toContain('href="/signup?persona=creator"');
  });

  it("pricing cards route the plan family into the matching persona", () => {
    const { getByRole } = render(<Pricing data={pricingData()} />);
    const creatorHrefs = [...document.querySelectorAll('a[href*="plan=creator_"]')].map((a) =>
      a.getAttribute("href"),
    );
    expect(creatorHrefs.length).toBeGreaterThan(0);
    for (const h of creatorHrefs) expect(h).toContain("persona=creator");

    fireEvent.click(getByRole("tab", { name: "For Partners" }));
    const partnerHrefs = [...document.querySelectorAll('a[href*="plan=partner_"]')].map((a) =>
      a.getAttribute("href"),
    );
    expect(partnerHrefs.length).toBeGreaterThan(0);
    for (const h of partnerHrefs) {
      expect(h).toContain("persona=partner");
      expect(h).not.toContain("persona=creator");
    }
  });
});

// ── 7. SEO — runtime-derived pricing metadata ────────────────────────────────

describe("MKT-09 — SEO metadata derives from runtime", () => {
  const pricingPage = read("src/app/pricing/page.tsx");
  const homepage = read("src/app/page.tsx");

  it("pricing page derives 'from' prices from the runtime plans, not hardcoded figures", () => {
    expect(pricingPage).toContain("paidFromPrice(data.creator)");
    expect(pricingPage).toContain("paidFromPrice(data.partner)");
    // RCCF-MKT-10 P3-D: runtime values render through the canonical
    // formatCurrency helper (₹4,999-class grouping) — no raw interpolation.
    expect(pricingPage).toMatch(/Paid plans from \$\{formatCurrency\(minCreator\)\}\/month\./);
    expect(pricingPage).toMatch(/Partner plans from \$\{formatCurrency\(minPartner\)\} one-time\./);
    expect(pricingPage).not.toContain("₹4,999");
    expect(pricingPage).not.toContain("₹14,999");
  });

  it("pricing JSON-LD branches on the authoritative one-time selector", () => {
    expect(pricingPage).toContain("isOneTimePlan(p.code)");
    expect(pricingPage).toContain("one-time purchase");
  });

  it("homepage carries canonical metadata and runtime pricing", () => {
    expect(homepage).toContain('alternates: { canonical: "/" }');
    expect(homepage).toContain("getPublicPricingData()");
  });
});