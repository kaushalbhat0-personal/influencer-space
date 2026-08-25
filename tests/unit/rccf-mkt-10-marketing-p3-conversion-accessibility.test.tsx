/**
 * RCCF-MKT-10 — Marketing P3 Closure, Conversion Polish & Final Pre-Release Audit.
 *
 * Pins the P3 audit decisions WITHOUT re-litigating MKT-09:
 *   P3-A  Blog positioning is broad (creators · freelancers · businesses),
 *         while topic-specific articles remain untouched.
 *   P3-B  Pricing plan selector follows WAI-ARIA tabs: roving tabindex,
 *         ArrowLeft/ArrowRight/Home/End automatic activation, tab↔panel
 *         association, visible selected state.
 *   P3-C  /showcase shows ONLY real published sites — the fabricated demo
 *         fallback is gone; an honest empty state replaces it.
 *   P3-D  Runtime-derived metadata prices render through formatCurrency
 *         ("₹4,999", not "₹4999"); values still come ONLY from the catalog.
 *   Truth Launch shared 3-ACTIVE-item ceiling wording stays accurate.
 *
 * Guardrail style: assert correct tokens present AND wrong tokens absent,
 * at source level and (where cheap) at rendered level.
 */
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, cleanup, fireEvent } from "@testing-library/react";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

import { COMMERCE_PLANS, isOneTimePlan } from "@/config/commerce/plans";
import { PARTNER_ADDON_UNIT_PRICE_INR } from "@/config/commerce/agency-addons";
import { formatCurrency } from "@/lib/utils";
import {
  getDisplayPrice,
  getAnnualSavings,
  type PricingData,
} from "@/components/marketing/Pricing/data";
import { Pricing } from "@/components/marketing/Pricing";
import type { ResolvedPlan } from "@/modules/pricing/application/runtime";

beforeEach(() => {
  cleanup();
});

// Hoisted mock: /showcase must work against an empty published set.
vi.mock("@/modules/tenant/infrastructure/website-repository", () => ({
  websiteRepository: {
    listPublished: vi.fn(async () => []),
  },
}));

// ── helpers ──────────────────────────────────────────────────────────────────

function resolvedPlan(partial: Partial<ResolvedPlan>): ResolvedPlan {
  return {
    code: "x",
    name: "X",
    family: "creator",
    description: "",
    marketingDescription: "",
    targetAudience: null,
    price: null,
    annualPrice: null,
    currency: "INR",
    badge: null,
    ctaLabel: "",
    ctaType: "signup",
    trialDays: null,
    gracePeriodDays: 0,
    hidden: false,
    enterprise: false,
    popular: false,
    bestValue: false,
    recommended: false,
    comparisonOrder: 1,
    colorAccent: null,
    capabilities: [],
    featureOverrides: {},
    features: {},
    highlights: [],
    scheduled: [],
    ...partial,
  };
}

function pricingData(): PricingData {
  return {
    // Minimal truthful shapes — enough to exercise tabs/panels/CTAs.
    creator: [
      resolvedPlan({ code: "creator_launch", name: "Creator Launch", price: 0 }),
      resolvedPlan({
        code: "creator_grow",
        name: "Creator Growth",
        price: 999,
        annualPrice: 9990,
        ctaType: "checkout",
      }),
      resolvedPlan({
        code: "creator_scale",
        name: "Creator Scale",
        price: 1999,
        annualPrice: 19990,
        ctaType: "checkout",
      }),
    ],
    partner: [
      resolvedPlan({ code: "partner_free", name: "Partner Launch", price: 0 }),
      resolvedPlan({
        code: "partner_solo",
        name: "Solo Partner",
        price: 4999,
        ctaType: "checkout",
      }),
      resolvedPlan({
        code: "partner_scale",
        name: "Partner Scale",
        price: 14999,
        ctaType: "checkout",
      }),
    ],
    enterpriseCreator: null,
    enterprisePartner: null,
  };
}

// ── P3-A — Blog positioning breadth ──────────────────────────────────────────

describe("MKT-10 P3-A — blog positioning is broad", () => {
  const blogIndex = read("src/app/blog/page.tsx");
  const blogLayout = read("src/app/blog/layout.tsx");
  const blogGuides = read("src/app/blog/guides/page.tsx");
  const blogPost = read("src/app/blog/[slug]/page.tsx");

  it("index copy addresses creators, freelancers and businesses — not a single India/creator segment", () => {
    // JSX source wraps lines, so match across whitespace.
    expect(blogIndex).toMatch(
      /Tips,\s+guides,\s+and\s+strategies\s+for\s+creators,\s+freelancers,\s+and\s+businesses/,
    );
    for (const src of [blogIndex, blogLayout, blogGuides]) {
      expect(src).not.toContain("for Indian creators");
      expect(src).not.toContain("Tips for Indian Creators");
    }
  });

  it("blog metadata carries the broad audience framing", () => {
    expect(blogLayout).toContain(
      "creators, freelancers, and businesses building their presence and business online",
    );
    expect(blogGuides).toContain(
      "guides for creators, freelancers, and businesses",
    );
  });

  it("topic-specific articles are intentionally untouched (no unnecessary rewrites)", () => {
    // The UPI article remains legitimately India/payments-focused content;
    // only positioning SURFACES (index/guides chrome + metadata) were broadened.
    expect(blogPost).toContain("upi-integration-for-creators");
    expect(blogIndex).toContain("How to Monetize Your Audience as an Indian Creator in 2026");
  });
});

// ── P3-B — Pricing tabs accessibility (WAI-ARIA) ─────────────────────────────

describe("MKT-10 P3-B — pricing plan selector tab semantics", () => {
  it("exposes a labelled tablist with two selectable tabs and an associated panel", () => {
    const { getByRole } = render(<PricingHarness />);
    const tablist = getByRole("tablist", { name: "Pricing plans" });
    expect(tablist).toBeTruthy();

    const creatorTab = getByRole("tab", { name: "For Creators" });
    const partnerTab = getByRole("tab", { name: "For Partners" });
    expect(creatorTab.getAttribute("aria-selected")).toBe("true");
    expect(partnerTab.getAttribute("aria-selected")).toBe("false");

    // Panel association both ways — one stable panel, labelled by the
    // selected tab.
    const panel = getByRole("tabpanel");
    expect(panel.id).toBe("pricing-panel");
    expect(creatorTab.getAttribute("aria-controls")).toBe(panel.id);
    expect(partnerTab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(creatorTab.id);
  });

  it("uses a roving tabindex — only the selected tab is a tab stop", () => {
    const { getByRole } = render(<PricingHarness />);
    expect(getByRole("tab", { name: "For Creators" }).tabIndex).toBe(0);
    expect(getByRole("tab", { name: "For Partners" }).tabIndex).toBe(-1);

    fireEvent.click(getByRole("tab", { name: "For Partners" }));
    expect(getByRole("tab", { name: "For Partners" }).tabIndex).toBe(0);
    expect(getByRole("tab", { name: "For Creators" }).tabIndex).toBe(-1);
  });

  it("ArrowRight / ArrowLeft move selection AND focus with automatic activation", () => {
    const { getByRole } = render(<PricingHarness />);
    const creatorTab = getByRole("tab", { name: "For Creators" });
    const partnerTab = getByRole("tab", { name: "For Partners" });

    fireEvent.keyDown(creatorTab, { key: "ArrowRight" });
    expect(partnerTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(partnerTab);
    expect(getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(partnerTab.id);

    fireEvent.keyDown(partnerTab, { key: "ArrowLeft" });
    expect(creatorTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(creatorTab);
  });

  it("Home jumps to the first tab and End to the last", () => {
    const { getByRole } = render(<PricingHarness />);
    fireEvent.click(getByRole("tab", { name: "For Partners" }));

    fireEvent.keyDown(getByRole("tab", { name: "For Partners" }), { key: "Home" });
    expect(getByRole("tab", { name: "For Creators" }).getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(getByRole("tab", { name: "For Creators" }), { key: "End" });
    expect(getByRole("tab", { name: "For Partners" }).getAttribute("aria-selected")).toBe("true");
  });

  it("Enter/Space activation keeps working natively (buttons)", () => {
    const { getByRole } = render(<PricingHarness />);
    const partnerTab = getByRole("tab", { name: "For Partners" }) as HTMLButtonElement;
    expect(partnerTab.tagName).toBe("BUTTON");
    fireEvent.click(partnerTab); // button semantics guarantee Enter/Space
    expect(partnerTab.getAttribute("aria-selected")).toBe("true");
  });
});

/** Renders the real Pricing component with the minimal truthful dataset. */
function PricingHarness() {
  return <Pricing data={pricingData()} />;
}

// ── P3-C — Showcase truthfulness ─────────────────────────────────────────────

describe("MKT-10 P3-C — showcase shows only real published sites", () => {
  it("with zero published sites the service returns none (no fabricated fallback)", async () => {
    const { showcaseService } = await import("@/modules/tenant/application/showcase.service");
    await expect(showcaseService.getPublished()).resolves.toEqual([]);
    await expect(showcaseService.getCategories()).resolves.toEqual([]);
  });

  it("the fabricated demo storefronts are gone from the codebase", () => {
    const service = read("src/modules/tenant/application/showcase.service.ts");
    for (const fake of ["NexusGamer", "FitWithZara", "DJElectra", "Chef Marco", "ArtByMaya"]) {
      expect(service).not.toContain(fake);
    }
    expect(service).not.toContain("getFallbackSites");
  });

  it("the page owns the honest empty state and hides filter chrome without sites", () => {
    const page = read("src/app/showcase/page.tsx");
    expect(page).toContain("showcase-empty");
    expect(page).toContain("No published sites yet.");
    // The real-sites claim must stay true under every data condition.
    expect(page).toContain("real, published CreatorStore website");
  });
});

// ── P3-D — Metadata price formatting (runtime-derived, grouped) ─────────────

describe("MKT-10 P3-D — pricing metadata formats runtime prices canonically", () => {
  it("formatCurrency groups Indian-style: ₹999 / ₹4,999 / ₹14,999", () => {
    expect(formatCurrency(999)).toBe("₹999");
    expect(formatCurrency(4999)).toBe("₹4,999");
    expect(formatCurrency(14999)).toBe("₹14,999");
    expect(formatCurrency(1999)).toBe("₹1,999");
  });

  it("metadata derives values from the runtime catalog and renders them via formatCurrency", () => {
    const page = read("src/app/pricing/page.tsx");
    expect(page).toContain("paidFromPrice(data.creator)");
    expect(page).toContain("paidFromPrice(data.partner)");
    expect(page).toMatch(/\$\{formatCurrency\(minCreator\)\}\/month/);
    expect(page).toMatch(/\$\{formatCurrency\(minPartner\)\} one-time/);
    // No hardcoded figures and no ungrouped raw interpolation remain.
    expect(page).not.toMatch(/₹\$\{min(Creator|Partner)\}/);
    expect(page).not.toContain("4999");
    expect(page).not.toContain("14999");
  });

  it("display math still derives annual pricing from runtime values", () => {
    const growth = resolvedPlan({ code: "creator_grow", price: 999, annualPrice: 9990 });
    expect(getDisplayPrice(growth, "monthly")).toBe(999);
    expect(getDisplayPrice(growth, "yearly")).toBe(833); // round(9990/12)
    expect(getAnnualSavings(growth)).toBe(17);
  });
});

// ── Capability & commercial truth (focused re-pin) ───────────────────────────

describe("MKT-10 — capability & commercial truth", () => {
  it("Partner Growth stays retired; Solo/Scale remain ONE-TIME", () => {
    expect(COMMERCE_PLANS.map((p) => p.code)).not.toContain("partner_growth");
    expect(isOneTimePlan("partner_solo")).toBe(true);
    expect(isOneTimePlan("partner_scale")).toBe(true);
    expect(isOneTimePlan("creator_grow")).toBe(false);
  });

  it("additional-client capacity is ₹2,000 one-time and is presented grouped, non-monthly", () => {
    expect(PARTNER_ADDON_UNIT_PRICE_INR).toBe(2000);
    expect(formatCurrency(PARTNER_ADDON_UNIT_PRICE_INR)).toBe("₹2,000");
    const pricing = read("src/components/marketing/Pricing/index.tsx");
    expect(pricing).toContain("it is not a monthly charge");
    expect(pricing).not.toMatch(/PARTNER_ADDON_UNIT_PRICE_INR[^;]*\/month/);
  });

  it("marketing Partner copy never quotes a fixed commission percentage", () => {
    const dataTs = read("src/components/marketing/Pricing/data.ts");
    const plansTs = read("src/config/commerce/plans.ts");
    for (const src of [dataTs, plansTs]) {
      expect(src).not.toMatch(/commission[^.\n]*\b\d+(\.\d+)?%/i);
      expect(src).not.toMatch(/\b\d+(\.\d+)?%[^.\n]*commission/i);
    }
  });

  it("Launch quota wording keeps the shared 3-ACTIVE-item ceiling truth", () => {
    const enforcement = read("src/modules/billing/application/content-limit.enforcement.ts");
    expect(enforcement).toContain("LAUNCH_GLOBAL_LIMIT = 3");

    const plansTs = read("src/config/commerce/plans.ts");
    expect(plansTs).toContain(
      "Up to 3 active items across products, services, courses & games",
    );
    // Never describe Launch as independent buckets ("3 uploads/products of every type").
    expect(plansTs).not.toContain("3 uploads of every type");

    const comparison = read("src/components/marketing/Pricing/comparison.tsx");
    expect(comparison).toContain("share one combined allowance of up to 3 active items");
  });

  it("no stale commercial tokens linger on marketing surfaces", () => {
    const surfaces = [
      "src/app/blog/page.tsx",
      "src/app/blog/layout.tsx",
      "src/app/blog/guides/page.tsx",
      "src/app/showcase/page.tsx",
      "src/app/pricing/page.tsx",
      "src/components/marketing/Pricing/index.tsx",
      "src/components/marketing/Pricing/data.ts",
      "src/components/marketing/FinalCta.tsx",
    ].map(read);
    for (const src of surfaces) {
      expect(src).not.toContain("partner_growth");
      expect(src).not.toContain("AI storefront");
      expect(src).not.toContain("on your domain");
      expect(src).not.toContain("thousands of");
      expect(src).not.toContain("90%");
      expect(src).not.toContain("10,000+");
      expect(src).not.toContain("5,000+");
      expect(src).not.toMatch(/₹(4999|14999|1995|2999|7999|699)\b/);
    }
  });
});
