/**
 * RCCF-MKT-08-R1 — Partner Pricing Truth, Commercial Messaging & Marketing Frontend.
 *
 * The presentation flip for RCCF-73: Partner Solo/Scale are ONE-TIME Razorpay
 * orders, additional client capacity is a ₹2,000 one-time payment-gated
 * purchase, and commission is ELIGIBILITY for paid Partners only (rate from
 * the runtime configuration hierarchy — never a marketing percentage).
 *
 * Guardrail style: assert the CORRECT tokens are present AND the WRONG/stale
 * tokens are absent, at three layers:
 *   1. registry / config truth (the canonical commercial constants)
 *   2. rendered marketing component (partner tab + creator tab)
 *   3. metadata + JSON-LD source contracts (/pricing)
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
  getCommercePlan,
  planBillingForm,
  isOneTimePlan,
} from "@/config/commerce/plans";
import { PARTNER_ADDON_UNIT_PRICE_INR } from "@/config/commerce/agency-addons";
import { isCommissionEligiblePartnerPlan } from "@/lib/commission/runtime";
import { mergeRuntimePlan } from "@/modules/pricing/application/runtime";
import type { ResolvedPlan } from "@/modules/pricing/application/runtime";
import { Pricing } from "@/components/marketing/Pricing";

beforeEach(() => {
  cleanup();
});

const plan = (code: string) => COMMERCE_PLAN_BY_CODE[code];

/** Build render-ready ResolvedPlans straight from the registry (no DB). */
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

// ── 1. Registry commercial truth (RCCF-73 contract, presentation-facing) ─────

describe("MKT-08-R1 — registry commercial truth", () => {
  it("Partner Solo = ₹4,999 ONE-TIME; Scale = ₹14,999 ONE-TIME", () => {
    expect(plan("partner_solo").price).toBe(4999);
    expect(plan("partner_scale").price).toBe(14999);
    expect(isOneTimePlan("partner_solo")).toBe(true);
    expect(isOneTimePlan("partner_scale")).toBe(true);
    expect(planBillingForm("partner_solo")).toBe("one_time");
    expect(planBillingForm("partner_scale")).toBe("one_time");
  });

  it("Partner Launch = free with a truthful 15-day trial framing", () => {
    expect(plan("partner_free").price).toBe(0);
    expect(plan("partner_free").trialDays).toBe(15);
    expect(isOneTimePlan("partner_free")).toBe(false); // trial, not a purchase
  });

  it("Partner plans carry NO annual price (no yearly variant exists)", () => {
    for (const code of ["partner_free", "partner_solo", "partner_scale"]) {
      expect(getCommercePlan(code)?.annualPrice ?? null, code).toBeNull();
    }
  });

  it("additional client capacity = ₹2,000 ONE-TIME (canonical constant)", () => {
    expect(PARTNER_ADDON_UNIT_PRICE_INR).toBe(2000);
    expect(read("src/config/commerce/agency-addons.ts")).not.toContain("1499");
  });
});

// ── 2. Commission eligibility truth ──────────────────────────────────────────

describe("MKT-08-R1 — commission eligibility truth in marketing", () => {
  it("paid Partner plans are eligible; free Partner and Creator plans are not", () => {
    expect(isCommissionEligiblePartnerPlan("partner_solo")).toBe(true);
    expect(isCommissionEligiblePartnerPlan("partner_scale")).toBe(true);
    expect(isCommissionEligiblePartnerPlan("partner_free")).toBe(false);
    expect(isCommissionEligiblePartnerPlan("creator_grow")).toBe(false);
    expect(isCommissionEligiblePartnerPlan(null)).toBe(false);
  });

  it("Solo/Scale cards state eligibility wording — never a guaranteed amount", () => {
    const soloHighlights = plan("partner_solo").marketingHighlights ?? [];
    const scaleHighlights = plan("partner_scale").marketingHighlights ?? [];
    expect(soloHighlights.join(" | ")).toMatch(/[Rr]ecurring commission eligibility/);
    expect(scaleHighlights.join(" | ")).toMatch(/[Rr]ecurring commission from eligible active clients/);
  });

  it("free Partner card never claims commission", () => {
    const freeCopy = [
      ...(plan("partner_free").marketingHighlights ?? []),
      plan("partner_free").marketingDescription ?? "",
    ].join(" | ").toLowerCase();
    expect(freeCopy).not.toContain("commission");
  });

  it("no fixed percentage or ₹1,998 example anywhere in partner marketing sources", () => {
    const index = read("src/components/marketing/Pricing/index.tsx");
    const data = read("src/components/marketing/Pricing/data.ts");
    for (const src of [index, data]) {
      expect(src).not.toMatch(/\b0\.2\b/);
      expect(src).not.toMatch(/×\s*0\.2|\*\s*0\.2|0\.2\s*%/);
      expect(src).not.toContain("1998");
      expect(src).not.toContain("1,998");
      expect(src).not.toContain("roughly");
      expect(src).not.toContain("Earn 20%");
      expect(src).not.toContain("0.2%");
    }
    // The old "commission grows with your client count" guarantee is gone.
    expect(data).not.toContain("Commission that grows");
  });

  it("the runtime-resolved-rate wording is present (no published percentage)", () => {
    const data = read("src/components/marketing/Pricing/data.ts");
    expect(data).toContain("Earn recurring commission from eligible active clients as a paid Partner");
    expect(data).toContain("determined by your Partner configuration and eligible client activity");
  });
});

// ── 3. Rendered marketing component ──────────────────────────────────────────

describe("MKT-08-R1 — Pricing component (partner tab)", () => {
  it("hides the Monthly/Yearly toggle entirely for Partners (absent, not disabled)", () => {
    const { container, getByRole } = render(<Pricing data={pricingData()} />);
    fireEvent.click(getByRole("tab", { name: "For Partners" }));
    expect(container.querySelector('[role="switch"]')).toBeNull();
    expect(container.textContent).not.toContain("Monthly");
    expect(container.textContent).not.toContain("Yearly");
    // No dead wrapper: the billing-cycle group itself must not exist.
    expect(container.querySelector('[aria-label="Billing cycle"]')).toBeNull();
  });

  it("renders Solo ₹4,999 and Scale ₹14,999 with a One-time label — never /month", () => {
    const { container, getByRole } = render(<Pricing data={pricingData()} />);
    fireEvent.click(getByRole("tab", { name: "For Partners" }));
    const text = container.textContent ?? "";
    expect(text).toContain("₹4,999");
    expect(text).toContain("₹14,999");
    expect((text.match(/One-time/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(text).not.toMatch(/₹4,999\/month|₹4,999\/mo\b|₹14,999\/month|billed (monthly|yearly)/i);
  });

  it("Partner Launch renders the free-trial framing without ₹0/month semantics", () => {
    const { container, getByRole } = render(<Pricing data={pricingData()} />);
    fireEvent.click(getByRole("tab", { name: "For Partners" }));
    const text = container.textContent ?? "";
    expect(text).toContain("15-Day Free Trial");
    expect(text).toContain("No credit card required");
    expect(text).not.toMatch(/₹0\/month/i);
  });

  it("'How Partner plans work' explains the one-time model + ₹2,000 one-time add-on, with no commission example", () => {
    const { container, getByRole } = render(<Pricing data={pricingData()} />);
    fireEvent.click(getByRole("tab", { name: "For Partners" }));
    const block = container.querySelector('[data-testid="how-partner-plans-work"]');
    expect(block).not.toBeNull();
    const text = block?.textContent ?? "";
    expect(text).toContain("How Partner plans work");
    expect(text).toMatch(/one-time purchase/i);
    expect(text).toMatch(/no monthly Partner subscription/i);
    expect(text).toMatch(/₹2,000 one-time/i);
    expect(text).toMatch(/not a monthly charge/i);
    expect(text).toMatch(/eligible active clients/i);
    // Stale tokens must be gone from the whole partner view.
    const page = container.textContent ?? "";
    expect(page).not.toContain("Example:");
    expect(page).not.toContain("10 clients on Creator Growth");
    expect(page).not.toContain("/month");
  });

  it("partner checkout CTAs route into the partner flow (persona=partner)", () => {
    const { container, getByRole } = render(<Pricing data={pricingData()} />);
    fireEvent.click(getByRole("tab", { name: "For Partners" }));
    const hrefs = [...container.querySelectorAll('a[href*="persona="]')].map((a) =>
      a.getAttribute("href"),
    );
    const partnerCtas = hrefs.filter((h) => h?.includes("plan=partner_"));
    expect(partnerCtas.length).toBeGreaterThan(0);
    for (const h of partnerCtas) {
      expect(h).toContain("persona=partner");
      expect(h).not.toContain("persona=creator");
    }
    // The free-trial card renders through the non-checkout fallback branch —
    // it must still carry the family-consistent persona (§12).
    expect(partnerCtas).toContain("/signup?plan=partner_free&persona=partner");
  });
});

describe("MKT-08-R1 — Pricing component (creator regression)", () => {
  it("keeps the Monthly/Yearly toggle and recurring semantics for Creators", () => {
    const { container, getByRole } = render(<Pricing data={pricingData()} />);
    // Toggle present on the default creator tab.
    const toggle = container.querySelector('[role="switch"]');
    expect(toggle).not.toBeNull();
    expect(getByRole("tab", { name: "For Creators" }).getAttribute("aria-selected")).toBe("true");

    const text = () => container.textContent ?? "";
    expect(text()).toContain("₹999");
    expect(text()).toContain("₹1,999");
    expect(text()).toMatch(/₹999\/month/);
    expect(text()).toMatch(/₹1,999\/month/);

    // Every creator signup CTA — including the Launch free-trial fallback
    // branch — carries persona=creator (§12).
    const creatorCtas = [...container.querySelectorAll('a[href*="plan=creator_"]')]
      .map((a) => a.getAttribute("href"));
    expect(creatorCtas.length).toBeGreaterThan(0);
    for (const h of creatorCtas) expect(h).toContain("persona=creator");

    // Yearly still works: annual math derives from runtime annualPrice.
    fireEvent.click(toggle!);
    expect(text()).toContain("/mo billed yearly");
    expect(text()).not.toMatch(/₹999\/month/);
  });

  it("creator plans are NOT flipped to one-time rendering", () => {
    const { container } = render(<Pricing data={pricingData()} />);
    const text = container.textContent ?? "";
    expect(text).not.toContain("One-time"); // creator view has no one-time label
    for (const code of ["creator_grow", "creator_scale"]) {
      expect(planBillingForm(code)).toBe("subscription");
      expect(isOneTimePlan(code)).toBe(false);
    }
  });

  it("creator prices remain exactly Launch ₹0 · Growth ₹999 · Scale ₹1,999 with annual variants", () => {
    expect(plan("creator_launch").price).toBe(0);
    expect(plan("creator_grow").price).toBe(999);
    expect(plan("creator_grow").annualPrice).toBe(9990);
    expect(plan("creator_scale").price).toBe(1999);
    expect(plan("creator_scale").annualPrice).toBe(19990);
  });
});

// ── 4. Metadata & JSON-LD source contracts ───────────────────────────────────

describe("MKT-08-R1 — pricing metadata & JSON-LD truth", () => {
  const page = read("src/app/pricing/page.tsx");

  it("metadata describes partners as one-time and creators as monthly — runtime-derived", () => {
    expect(page).toContain("paidFromPrice(data.creator)");
    expect(page).toContain("paidFromPrice(data.partner)");
    // RCCF-MKT-10 P3-D: runtime values render via the canonical formatCurrency
    // helper (grouped INR) — never raw ₹${…} interpolation, never hardcoded.
    expect(page).toMatch(/Paid plans from \$\{formatCurrency\(minCreator\)\}\/month\./);
    expect(page).toMatch(/Partner plans from \$\{formatCurrency\(minPartner\)\} one-time\./);
    expect(page).not.toMatch(/minPartner\}\/month/);
    // Never a hardcoded figure.
    expect(page).not.toContain("₹4,999");
    expect(page).not.toContain("₹14,999");
  });

  it("JSON-LD offer categories branch on the authoritative billing form", () => {
    expect(page).toContain("isOneTimePlan(p.code)");
    // The old blanket mapping labelled every partner offer a subscription.
    expect(page).not.toContain('p.family === "creator" ? "Creator subscription" : "Partner subscription"');
    expect(page).toContain("one-time purchase");
  });

  it("solo/scale resolve one-time while creators resolve subscriptions through the same selector", () => {
    const offers = ["partner_solo", "partner_scale"].map((c) => isOneTimePlan(c));
    expect(offers).toEqual([true, true]);
    expect(isOneTimePlan("creator_grow")).toBe(false);
    expect(isOneTimePlan("creator_scale")).toBe(false);
  });
});

// ── 5. Truth scan — stale tokens across marketing surfaces ──────────────────

describe("MKT-08-R1 — stale-token truth scan", () => {
  const index = read("src/components/marketing/Pricing/index.tsx");
  const data = read("src/components/marketing/Pricing/data.ts");
  const registry = read("src/config/commerce/plans.ts");

  it("no stale ₹1,499 additional-client price or /month addon wording", () => {
    expect(index).not.toContain("1,499");
    expect(index).not.toMatch(/1499(?!\d)/); // digit-boundary: 14999 must not false-positive
    expect(registry).not.toMatch(/1499(?!\d)/);
    expect(registry.toLowerCase()).not.toContain("₹1,499");
    // The addon line must pair the canonical constant with one-time wording.
    expect(index).toMatch(/PARTNER_ADDON_UNIT_PRICE_INR[^;]*one-time/s);
    expect(index.toLowerCase()).not.toMatch(/addon[^;]*\/month/s);
  });

  it("no stale Partner monthly/annual claims in the shared pricing surface", () => {
    expect(data).not.toMatch(/partner[^\n]*\/month/i);
    expect(index).not.toContain("billed annually");
    expect(index).not.toContain("per year");
    // Registry partner entries carry no annual price token.
    const partnerBlock = registry.slice(registry.indexOf('"partner_free"'));
    expect(partnerBlock).not.toMatch(/annualPrice:\s*\d/);
  });

  it("registry keeps the retired prices retired", () => {
    const prices = COMMERCE_PLANS.map((p) => p.price);
    for (const stale of [699, 1499, 1995, 2999, 7999]) {
      expect(prices).not.toContain(stale);
    }
  });
});
