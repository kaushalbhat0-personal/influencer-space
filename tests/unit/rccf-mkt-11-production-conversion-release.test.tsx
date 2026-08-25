/**
 * RCCF-MKT-11 — Production Marketing Conversion & Release Readiness Audit.
 *
 * Audit-first closure: pins ONLY the decisions this audit made. MKT-05→MKT-10
 * baselines are NOT re-litigated here beyond their release-critical invariants.
 *
 *   A. CTA persona routing — every marketing CTA carries an explicit persona
 *      (creator/partner); no generic plan-family ambiguity.
 *   B. Pricing truth — Creator 0/999/1999 monthly (+10× annual); Partner
 *      Free/4,999/14,999 ONE-TIME; Enterprise custom/hidden.
 *   C. Partner Growth absent from the registry.
 *   D. Launch shared 3-active-item ceiling + bookings disabled.
 *   E. Showcase shows only real published sites (honest empty state).
 *   F. Pricing metadata derives from the runtime through formatCurrency.
 *   G. FAQ commercial copy uses commission ELIGIBILITY language (no %).
 *   H. OG image is the certified storefront asset (exists on disk).
 *   I. Footer/nav destinations all resolve to real routes.
 *   J. Signup success copy names the SELECTED plan (Partner ≠ Creator Launch).
 *   K. Marketing surfaces carry no stale claims (699/1995/2999/7999/thousands…).
 */
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
/** Source with comments stripped — truth-scan targets visible copy, not docs. */
const readVisible = (p: string) =>
  readFileSync(join(ROOT, p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

import { COMMERCE_PLANS, isOneTimePlan, getCommercePlan } from "@/config/commerce/plans";
import { PARTNER_ADDON_UNIT_PRICE_INR } from "@/config/commerce/agency-addons";
import { CONTACT_EMAIL } from "@/lib/marketing/messaging";
import { showcaseService } from "@/modules/tenant/application/showcase.service";

// ── hoisted mock: showcase repository (truth = runtime rows only) ────────────
vi.mock("@/modules/tenant/infrastructure/website-repository", () => ({
  websiteRepository: {
    listPublished: vi.fn(async () => []),
  },
}));

// ── A. CTA persona routing ───────────────────────────────────────────────────
describe("MKT-11 · CTA persona routing", () => {
  const SURFACES = [
    "src/components/marketing/HeroInput.tsx",
    "src/components/marketing/MarketingNav.tsx",
    "src/components/marketing/FinalCta.tsx",
    "src/components/marketing/CreatorShowcase.tsx",
    "src/components/marketing/SellAnything.tsx",
    "src/components/marketing/BuilderShowcase.tsx",
    "src/app/showcase/page.tsx",
    "src/app/features/page.tsx",
    "src/app/about/page.tsx",
  ];

  it("creator CTAs route to /signup?persona=creator", () => {
    for (const f of SURFACES) expect(read(f)).toContain("/signup?persona=creator");
  });

  it("dual-persona surfaces expose the partner persona explicitly", () => {
    // Hero/nav/final CTA must offer Become a Partner with persona=partner;
    // single-purpose creator sections must NOT leak a partner CTA.
    for (const f of [
      "src/components/marketing/HeroInput.tsx",
      "src/components/marketing/MarketingNav.tsx",
      "src/components/marketing/FinalCta.tsx",
    ]) {
      expect(read(f)).toContain("/signup?persona=partner");
    }
    for (const f of ["src/components/marketing/FinalCta.tsx"]) {
      expect(read(f)).toContain("Become a Partner");
    }
  });

  it("pricing card CTAs derive persona from the selected tab family", () => {
    const src = read("src/components/marketing/Pricing/index.tsx");
    expect(src).toContain("persona=${isPartner ? \"partner\" : \"creator\"}");
    expect(src).not.toContain("/signup?plan=${plan.code}&persona=creator\"");
  });

  it("signup maps partner → agency internally and never lets a paid plan preselect", () => {
    const src = read("src/components/auth/signup/SignupForm.tsx");
    expect(src).toContain('personaParam === "partner" ? "agency"');
    expect(src).toContain("getSignupEligiblePlans");
  });
});

// ── B/C/D. Pricing registry truth ────────────────────────────────────────────
describe("MKT-11 · pricing registry truth", () => {
  const byCode = Object.fromEntries(COMMERCE_PLANS.map((p) => [p.code, p]));

  it("Creator prices are ₹0 / ₹999/mo / ₹1,999/mo with annual = 10× monthly", () => {
    expect(byCode.creator_launch.price).toBe(0);
    expect(byCode.creator_grow.price).toBe(999);
    expect(byCode.creator_grow.annualPrice).toBe(9990);
    expect(byCode.creator_scale.price).toBe(1999);
    expect(byCode.creator_scale.annualPrice).toBe(19990);
  });

  it("Creator plans remain recurring subscriptions (never one-time)", () => {
    for (const code of ["creator_launch", "creator_grow", "creator_scale"]) {
      expect(isOneTimePlan(code)).toBe(false);
    }
  });

  it("Partner Solo/Scale are one-time at ₹4,999 / ₹14,999 — never subscriptions", () => {
    expect(byCode.partner_solo.price).toBe(4999);
    expect(byCode.partner_solo.billingForm).toBe("one_time");
    expect(byCode.partner_scale.price).toBe(14999);
    expect(byCode.partner_scale.billingForm).toBe("one_time");
    expect(isOneTimePlan("partner_solo")).toBe(true);
    expect(isOneTimePlan("partner_scale")).toBe(true);
  });

  it("Partner Enterprise is contact-only and hidden from standard comparison", () => {
    const e = getCommercePlan("partner_enterprise");
    expect(e?.ctaType).toBe("contact");
    expect(e?.hidden).toBe(true);
    expect(e?.enterprise).toBe(true);
  });

  it("Partner Growth is retired — absent from the canonical registry", () => {
    expect(getCommercePlan("partner_growth")).toBeUndefined();
    expect(COMMERCE_PLANS.some((p) => p.code.includes("growth") && p.family === "partner")).toBe(false);
  });

  it("additional client capacity is the canonical ₹2,000 one-time constant", () => {
    expect(PARTNER_ADDON_UNIT_PRICE_INR).toBe(2000);
    const src = read("src/components/marketing/Pricing/index.tsx");
    expect(src).toContain("PARTNER_ADDON_UNIT_PRICE_INR");
    expect(src).toContain("one-time");
    expect(src).not.toContain("PARTNER_ADDON_UNIT_PRICE_INR.toLocaleString(\"en-IN\")}/month");
  });

  it("Partner tab hides the billing-cycle toggle; trust line says one-time", () => {
    const src = read("src/components/marketing/Pricing/index.tsx");
    expect(src).toMatch(/!\s*isPartner && plans\.some\(\(p\) => p\.annualPrice\)/);
    // Partner trust vocabulary: one-time purchase, never subscription-cancel framing.
    const partnerTrust = src.match(/TRUST_ITEMS_PARTNER = \[([^\]]*)\]/)?.[1] ?? "";
    expect(partnerTrust).toContain("Paid plans are one-time purchases");
    expect(partnerTrust).not.toContain("Cancel anytime");
  });

  it("Launch communicates the shared 3-active-item ceiling and disables bookings", () => {
    const launch = byCode.creator_launch;
    expect(launch.featureOverrides?.max_bookings).toBe(0);
    const highlights = launch.marketingHighlights ?? [];
    expect(highlights).toContain("Up to 3 active items across products, services, courses & games");
    expect(highlights.filter((h) => /^3 /.test(h)).length).toBeGreaterThanOrEqual(5);
    const cmp = read("src/components/marketing/Pricing/comparison.tsx");
    expect(cmp).toContain("share one combined allowance of up to 3 active items");
  });

  it("pricing card render path labels one-time plans without /month", () => {
    const src = read("src/components/marketing/Pricing/index.tsx");
    const oneTimeIdx = src.indexOf("isOneTimePlan(plan.code)");
    const monthIdx = src.indexOf("/{cycle === \"yearly\"");
    expect(oneTimeIdx).toBeGreaterThan(-1);
    expect(monthIdx).toBeGreaterThan(oneTimeIdx); // one-time branch short-circuits before any /month label
  });
});

// ── E. Showcase truth ────────────────────────────────────────────────────────
describe("MKT-11 · showcase truth", () => {
  it("returns ONLY runtime-published sites — no fabricated fallback", async () => {
    const sites = await showcaseService.getPublished();
    expect(sites).toEqual([]);
    const svc = read("src/modules/tenant/application/showcase.service.ts");
    expect(svc).toContain("listPublished");
    expect(svc.toLowerCase()).not.toContain("spower"); // demo brand never leaks as a customer
  });

  it("page renders an honest empty state when nothing is published", () => {
    const page = read("src/app/showcase/page.tsx");
    expect(page).toContain('data-testid="showcase-empty"');
    expect(page).toContain("No published sites yet.");
  });

  it("showcase CTA keeps the creator persona", () => {
    expect(read("src/app/showcase/page.tsx")).toContain('/signup?persona=creator');
  });
});

// ── F. Metadata / SEO ────────────────────────────────────────────────────────
describe("MKT-11 · pricing metadata & JSON-LD stay runtime-derived", () => {
  it("pricing page metadata derives 'from' prices via formatCurrency, never hardcoded", () => {
    const src = read("src/app/pricing/page.tsx");
    expect(src).toContain("getPublicPricingData");
    expect(src).toContain("formatCurrency(minCreator)");
    expect(src).toContain("formatCurrency(minPartner)");
    expect(src).not.toMatch(/₹\s?4,?999|₹\s?14,?999|₹\s?1,?999|₹\s?999</);
  });

  it("JSON-LD marks one-time partner offers without subscription semantics", () => {
    const src = read("src/app/pricing/page.tsx");
    expect(src).toContain("isOneTimePlan(p.code)");
    expect(src).toContain("one-time purchase");
  });

  it("OG/Twitter images point at the certified storefront asset that exists", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain("/marketing-assets/storefront/01-desktop.png");
    expect(existsSync(join(ROOT, "public/marketing-assets/storefront/01-desktop.png"))).toBe(true);
    expect(existsSync(join(ROOT, "public/marketing-assets/storefront/02-mobile.png"))).toBe(true);
  });

  it("hero/proof captures reference assets that exist on disk", () => {
    for (const f of ["src/components/marketing/Hero.tsx", "src/components/marketing/StorefrontShowcase.tsx"]) {
      expect(read(f)).toContain("/marketing-assets/storefront/01-desktop.png");
    }
  });

  it("standalone /faq route carries exactly one top-level heading (sr-only H1)", () => {
    const src = read("src/app/faq/page.tsx");
    expect(src).toMatch(/<h1 className="sr-only">Frequently asked questions<\/h1>/);
    expect(src.match(/<h1/g)?.length).toBe(1); // PricingFAQ's heading stays an h2
  });

  it("blog index and guides declare their own canonical URLs", () => {
    expect(read("src/app/blog/page.tsx")).toContain('alternates: { canonical: "/blog" }');
    expect(read("src/app/blog/guides/page.tsx")).toContain('alternates: { canonical: "/blog/guides" }');
    // the layout must NOT pin a shared canonical that guides would wrongly inherit
    expect(read("src/app/blog/layout.tsx")).not.toContain("canonical");
  });
});

// ── G. FAQ commercial truth ──────────────────────────────────────────────────
describe("MKT-11 · FAQ / commission truth", () => {
  it("commission appears only as eligibility — never as a percentage or guarantee", () => {
    const faq = readVisible("src/lib/marketing/content.ts");
    expect(faq).toMatch(/recurring commission/i);
    // The ONLY percentage allowed in visible marketing copy is the truthful
    // "keep 100% of every sale" — no 20%/90%-style commission claims.
    const pcts = faq.match(/\d+%/g) ?? [];
    for (const p of pcts) expect(p, `unexpected percentage claim ${p}`).toBe("100%");
    const data = read("src/components/marketing/Pricing/data.ts");
    expect(data).toMatch(/ELIGIBILITY|eligibility/);
    expect(data).not.toMatch(/\d+% commission/);
  });

  it("FAQ JSON-LD answers contain no contradiction with visible rules", () => {
    const faqPage = read("src/app/faq/page.tsx");
    expect(faqPage).toContain("15-day free trial");
    expect(faqPage).toContain("keep 100% of every sale");
    expect(faqPage).toContain("Razorpay");
    const pricingPage = read("src/app/pricing/page.tsx");
    expect(pricingPage).toContain("Creator Growth or higher");
  });

  it("contact identity is the single canonical email", () => {
    const contact = read("src/app/contact/page.tsx");
    expect(contact).toContain("CONTACT_EMAIL");
    const contactVisible = read("src/app/contact/page.tsx").replace(/(?:d|viewBox)="[^"]*"/g, ""); // ignore SVG geometry
    expect(contactVisible).not.toMatch(/[+\d][\d\s-]{7,}\d/); // no phone numbers
    const form = read("src/app/contact/_components/contact-form-client.tsx");
    expect(form).toContain("required");
  });
});

// ── H/I. Navigation destinations ─────────────────────────────────────────────
describe("MKT-11 · navigation destinations resolve", () => {
  const FOOTER_LINKS = ["/terms", "/privacy", "/refund", "/contact", "/about", "/features", "/pricing", "/faq", "/showcase", "/blog"];

  it.each(FOOTER_LINKS)("footer destination %s exists", (route) => {
    expect(existsSync(join(ROOT, "src/app", route, "page.tsx"))).toBe(true);
  });

  it("admin login route exists and nav/footer link to it", () => {
    expect(existsSync(join(ROOT, "src/app/admin/login/page.tsx"))).toBe(true);
    expect(read("src/components/marketing/Footer.tsx")).toContain('"/admin/login"');
  });

  it("nav carries exactly the four story links plus dual-persona CTAs", () => {
    const nav = read("src/components/marketing/MarketingNav.tsx");
    for (const href of ["/features", "/showcase", "/pricing", "/about"]) {
      expect(nav).toContain(`href: "${href}"`);
    }
    expect(nav).toContain("Escape");
    expect(nav).toContain('document.body.style.overflow = "hidden"');
  });
});

// ── J. Signup journey plan-name truth (MKT-11 P2 fix) ────────────────────────
describe("MKT-11 · signup success copy names the selected plan", () => {
  it("success message derives the plan name instead of hardcoding Creator Launch", () => {
    const src = read("src/components/auth/signup/SignupForm.tsx");
    expect(src).toContain("You're on the ${selectedPlanDef.name} plan.");
    expect(src).not.toContain("Creator Launch plan.");
  });
});

// ── K. Marketing truth scan (stale tokens) ───────────────────────────────────
describe("MKT-11 · marketing truth scan", () => {
  const COPY_SOURCES = [
    "src/lib/marketing/content.ts",
    "src/lib/marketing/messaging.ts",
    "src/components/marketing/Hero.tsx",
    "src/components/marketing/CoreIdea.tsx",
    "src/components/marketing/HowItWorks.tsx",
    "src/components/marketing/SellAnything.tsx",
    "src/components/marketing/PromoteBand.tsx",
    "src/components/marketing/BuilderShowcase.tsx",
    "src/components/marketing/GrowBand.tsx",
    "src/components/marketing/FinalCta.tsx",
    "src/components/marketing/StorefrontShowcase.tsx",
    "src/components/marketing/CreatorShowcase.tsx",
    "src/config/commerce/plans.ts",
  ];
  const STALE = [/699(?!\d)/, /1995/, /2999/, /7999/, /thousands of/i, /AI storefront/i];

  it("visible marketing copy carries none of the stale price/claim tokens", () => {
    for (const f of COPY_SOURCES) {
      const visible = readVisible(f); // comments stripped: history notes are not claims
      for (const re of STALE) {
        expect(visible, `${f} matches stale token ${re}`).not.toMatch(re);
      }
    }
  });

  it("positioning headline and breadth survive untouched", () => {
    expect(read("src/components/marketing/Hero.tsx")).toContain("Your presence.");
    expect(read("src/app/page.tsx")).toContain("Your presence. Your business.");
    expect(read("src/lib/marketing/content.ts")).toMatch(/freelancers|businesses/i);
  });

  it("canonical contact email is used across schema-bearing surfaces", () => {
    expect(CONTACT_EMAIL).toBe("info.micronest@gmail.com");
    expect(read("src/app/page.tsx")).toContain("CONTACT_EMAIL");
  });
});
