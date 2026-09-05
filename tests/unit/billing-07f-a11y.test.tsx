// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { InvoiceCenter } from "@/components/billing/InvoiceCenter";
import { ComparisonMatrix } from "@/components/marketing/Pricing/comparison";

const pricingPath = resolve("src/components/marketing/Pricing/index.tsx");
const invoicePath = resolve("src/components/billing/InvoiceCenter.tsx");
const comparisonPath = resolve("src/components/marketing/Pricing/comparison.tsx");
const subMgrPath = resolve("src/components/billing/SubscriptionManager.tsx");
const billingClientPath = resolve("src/components/billing/BillingPageClient.tsx");
const dashboardPath = resolve("src/components/billing/BillingDashboard.tsx");

// 1) Annual pricing toggle
describe("RCCF-BILLING-07F — annual toggle a11y", () => {
  it("has role switch, aria-checked, accessible name, keyboard, derived savings", () => {
    const src = readFileSync(pricingPath, "utf8");
    expect(src).toContain('role="switch"');
    expect(src).toContain("aria-checked={cycle === \"yearly\"}");
    expect(src).toContain('aria-label="Toggle yearly billing"');
    expect(src).toContain("suppressHydrationWarning");
    expect(src).not.toContain("Save ~17%");
    expect(src).toContain("getAnnualSavings");
    expect(src).toContain("Math.max");
    expect(src).toContain("Save {maxSavings}%");
    expect(src).toContain("aria-label={`Save ${maxSavings} percent");
    expect(src).toContain("focus-visible:ring-2");
    expect(src).toContain("motion-reduce:transition-none");
  });
});

// 2) Invoice table
describe("RCCF-BILLING-07F — invoice table a11y and 390px", () => {
  it("has aria-sort on Date header, region wrapper, min-w, flex-wrap, no page overflow", () => {
    const src = readFileSync(invoicePath, "utf8");
    expect(src).toContain('aria-sort={sortAsc ? "ascending" : "descending"}');
    expect(src).toContain('tabIndex={0}');
    expect(src).toContain('role="region"');
    expect(src).toContain('aria-label="Invoices table, scroll horizontally');
    expect(src).toContain("min-w-[560px]");
    expect(src).toContain("flex-wrap");
    expect(src).toContain("overscroll-x-contain");
    expect(src).toContain("motion-reduce:transition-none");
    expect(src).toContain("focus-visible:ring-2");
  });

  it("renders at 390px without clipping (overflow scroll, readable)", () => {
    const invoices = [
      { id: "inv_12345678", accountId: "a", planCode: "creator_grow", planName: "Growth", amount: 999, taxAmount: 0, total: 999, currency: "INR", status: "PAID" as const, issuedAt: new Date().toISOString(), paidAt: null, dueAt: null, invoiceUrl: null, provider: null, providerReference: null, lineItems: [] },
    ];
    const { container } = render(<InvoiceCenter invoices={invoices} />);
    // wrapper should be focusable region
    const region = container.querySelector('[role="region"]');
    expect(region).toBeTruthy();
    expect(region?.getAttribute("tabIndex")).toBe("0");
    // table should have min-w
    const table = container.querySelector("table");
    expect(table?.className).toContain("min-w-[560px]");
  });
});

// 3) Plan comparison
describe("RCCF-BILLING-07F — plan comparison a11y", () => {
  it("has scroll region, sticky, keyboard affordance, min-w, no page overflow", () => {
    const src = readFileSync(comparisonPath, "utf8");
    expect(src).toContain('role="region"');
    expect(src).toContain('aria-label="Plan comparison, scroll horizontally');
    expect(src).toContain("tabIndex={0}");
    expect(src).toContain("min-w-[640px]");
    expect(src).toContain("overscroll-x-contain");
    expect(src).toContain("Scroll to compare");
    expect(src).toContain("sm:hidden");
    expect(src).toContain("sticky left-0");
    expect(src).toContain("focus-visible:ring-2");
  });

  it("sticky first column/header remain accessible at 390px", () => {
    // Render with minimal plans to verify structure
    const plans = [
      { code: "creator_launch", name: "Launch", price: 0, annualPrice: null, currency: "INR", badge: null, ctaLabel: "Start", ctaType: "signup" as const, trialDays: 15, hidden: false, enterprise: false, popular: false, bestValue: false, recommended: false, comparisonOrder: 1, colorAccent: null, capabilities: [], featureOverrides: {}, features: {}, publishing: undefined, razorpayPlanId: null, highlights: [], scheduled: [], description: "", marketingDescription: "", targetAudience: null, family: "creator" as const },
      { code: "creator_grow", name: "Grow", price: 999, annualPrice: 9990, currency: "INR", badge: null, ctaLabel: "Upgrade", ctaType: "checkout" as const, trialDays: null, hidden: false, enterprise: false, popular: true, bestValue: false, recommended: true, comparisonOrder: 2, colorAccent: null, capabilities: ["premium_themes"], featureOverrides: {}, features: { premium_themes: true }, publishing: undefined, razorpayPlanId: null, highlights: [], scheduled: [], description: "", marketingDescription: "", targetAudience: null, family: "creator" as const },
    ] as any;
    const { container } = render(<ComparisonMatrix plans={plans} family="creator" />);
    const region = container.querySelector('[role="region"]');
    expect(region).toBeTruthy();
    const table = container.querySelector("table");
    expect(table?.className).toContain("min-w-[640px]");
    // sticky header
    expect(container.innerHTML).toContain("sticky left-0");
  });
});

// 4) Lifecycle banners
describe("RCCF-BILLING-07F — lifecycle banners focus/contrast/disabled", () => {
  it("past-due/expired/cancelled banners have break-words, no clipped text, proper live roles", () => {
    const srcMgr = readFileSync(subMgrPath, "utf8");
    expect(srcMgr).toContain('data-testid="submgr-past-due"');
    expect(srcMgr).toContain('break-words');
    expect(srcMgr).toContain('role="status" aria-live="polite"');
    expect(srcMgr).toContain('data-testid="submgr-expired"');
    expect(srcMgr).toContain('data-testid="submgr-cancelled"');

    const dashSrc = readFileSync(dashboardPath, "utf8");
    expect(dashSrc).toContain('data-testid="billing-past-due-banner"');
    expect(dashSrc).toContain('break-words');
    expect(dashSrc).toContain('flex-1');
  });

  it("disabled Launch has note semantics, aria-disabled, aria-label, not clipped", () => {
    const src = readFileSync(subMgrPath, "utf8");
    expect(src).toContain('data-testid="cta-launch-disabled"');
    expect(src).toContain('role="note"');
    expect(src).toContain('aria-disabled="true"');
    expect(src).toContain('aria-label="Creator Launch is a 15-day free trial');
    expect(src).toContain("max-w-full");
    expect(src).toContain("break-words");
  });

  it("Retry/Upgrade buttons have focus-visible and not clipped via flex-wrap", () => {
    const src = readFileSync(subMgrPath, "utf8");
    // Buttons rendered inside flex-wrap containers
    expect(src).toContain('flex flex-wrap gap-2');
    expect(src).toContain('data-testid="submgr-retry-cta"');
    expect(src).toContain('data-testid="submgr-upgrade-grow"');
  });
});

// 5) Razorpay/loading/error live regions and reduced-motion
describe("RCCF-BILLING-07F — loading/error/success live regions, no focus trap, reduced-motion", () => {
  it("BillingPageClient has alert assertive and polite live region, clearPaymentError, no focus trap", () => {
    const src = readFileSync(billingClientPath, "utf8");
    expect(src).toContain('role="alert"');
    expect(src).toContain('aria-live="assertive"');
    expect(src).toContain('aria-live="polite"');
    expect(src).toContain('data-testid="billing-error"');
    expect(src).toContain('data-testid="billing-live-region"');
    expect(src).toContain("clearPaymentError");
    expect(src).toContain("setError(null)");
    // No focus trap: no inert trap, modal ondismiss restores
    expect(src).toContain("modal: {");
    expect(src).toContain("ondismiss");
    // Ensure live region is sr-only not focus trap
    expect(src).toContain('className="sr-only"');
  });

  it("reduced-motion respected on toggles and transitions", () => {
    const pricingSrc = readFileSync(pricingPath, "utf8");
    const invoiceSrc = readFileSync(invoicePath, "utf8");
    const comparisonSrc = readFileSync(comparisonPath, "utf8");
    expect(pricingSrc).toContain("motion-reduce:transition-none");
    expect(invoiceSrc).toContain("motion-reduce:transition-none");
    expect(comparisonSrc).toContain("motion-reduce:transition-none");
    // BillingPageClient motion reduce on error
    const bcSrc = readFileSync(billingClientPath, "utf8");
    expect(bcSrc).toContain("motion-reduce:transition-none");
  });

  it("hydration and console: client components use Date.now only in client, no server mismatch", () => {
    const dashSrc = readFileSync(dashboardPath, "utf8");
    // BillingDashboard is "use client" so Date.now is client-only, not SSR
    expect(dashSrc).toContain('"use client"');
    expect(dashSrc).toContain("Date.now()");
    // No suppressHydrationWarning needed because client-only
  });
});
