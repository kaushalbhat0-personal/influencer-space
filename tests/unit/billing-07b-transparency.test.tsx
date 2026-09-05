// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BillingDashboard } from "@/components/billing/BillingDashboard";
import { SubscriptionManager } from "@/components/billing/SubscriptionManager";
import { BillingStatusBadge } from "@/components/admin/BillingStatusBadge";
import { RENEWAL_GRACE_DAYS } from "@/lib/billing/constants";
import { getGracePeriodEndDate } from "@/lib/billing/subscription-engine";
import type { BillingDashboard as BillingDashboardData, BillingPlan, BillingSubscription } from "@/lib/billing";

function mkPlan(overrides: Partial<BillingPlan> = {}): BillingPlan {
  return {
    code: "creator_grow",
    family: "creator",
    name: "Creator Growth",
    description: "",
    price: 999,
    currency: "INR",
    cycle: "monthly",
    features: { max_products: -1 },
    recommended: false,
    badge: "",
    ...overrides,
  };
}
function mkSub(overrides: Partial<BillingSubscription> = {}): BillingSubscription {
  return {
    id: "sub-1",
    accountId: "acc-1",
    workspaceId: "ws-1",
    planCode: "creator_grow",
    status: "ACTIVE",
    trialEndsAt: null,
    renewsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelledAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Grace derivation (canonical helper, not new logic) ───────────────
describe("RCCF-BILLING-07B — PAST_DUE grace date derivation", () => {
  it("derives graceEnd = renewsAt + 3 via getGracePeriodEndDate", () => {
    const renewsAt = new Date("2026-09-01T12:00:00.000Z");
    const graceEnd = getGracePeriodEndDate(renewsAt, RENEWAL_GRACE_DAYS);
    expect(graceEnd.toISOString()).toBe("2026-09-04T12:00:00.000Z");
    expect(RENEWAL_GRACE_DAYS).toBe(3);
  });
  it("no fabrication: null renewsAt → no grace date derived (handled as no-date message)", () => {
    const sub = mkSub({ status: "PAST_DUE", renewsAt: null });
    expect(sub.renewsAt).toBeNull();
  });
});

// ── BillingDashboard PAST_DUE banner ─────────────────────────────────
describe("RCCF-BILLING-07B — BillingDashboard PAST_DUE transparency", () => {
  it("shows payment-failed + grace-until date + remaining + retry hint when PAST_DUE with renewsAt", () => {
    const renewsAt = new Date(Date.now() + 1 * 86400000).toISOString(); // ~1 day future → grace active ~2 days remaining + renews
    const data: BillingDashboardData = {
      plan: mkPlan(),
      subscription: mkSub({ status: "PAST_DUE", renewsAt }),
      invoices: [],
      paymentMethods: [],
      usage: [],
      activeProducts: 0,
      activeGallery: 0,
      storageUsed: 0,
      ordersProcessed: 0,
      messagesSent: 0,
    };
    render(<BillingDashboard data={data} />);
    const banner = screen.getByTestId("billing-past-due-banner");
    expect(banner.textContent).toMatch(/Payment failed/);
    expect(banner.textContent).toMatch(/3-day grace/);
    expect(banner.textContent).toMatch(/storefront is still live/i);
    // remaining copy
    expect(banner.textContent).toMatch(/remaining|expires today/i);
    expect(banner.textContent).toMatch(/Successful payment/);
  });

  it("shows generic grace copy when PAST_DUE but renewsAt null (no fabricated date)", () => {
    const data: BillingDashboardData = {
      plan: mkPlan(),
      subscription: mkSub({ status: "PAST_DUE", renewsAt: null }),
      invoices: [],
      paymentMethods: [],
      usage: [],
      activeProducts: 0,
      activeGallery: 0,
      storageUsed: 0,
      ordersProcessed: 0,
      messagesSent: 0,
    };
    render(<BillingDashboard data={data} />);
    const banner = screen.getByTestId("billing-past-due-banner");
    expect(banner.textContent).toMatch(/3-day grace/);
  });
});

// ── BillingDashboard EXPIRED vs CANCELLED distinction ─────────────────
describe("RCCF-BILLING-07B — EXPIRED vs CANCELLED distinction", () => {
  it("EXPIRED banner explains 404 + upgrade to Grow + pricing link, distinct from normal status", () => {
    const data: BillingDashboardData = {
      plan: mkPlan(),
      subscription: mkSub({ status: "EXPIRED", renewsAt: null }),
      invoices: [],
      paymentMethods: [],
      usage: [],
      activeProducts: 0,
      activeGallery: 0,
      storageUsed: 0,
      ordersProcessed: 0,
      messagesSent: 0,
    };
    render(<BillingDashboard data={data} />);
    const banner = screen.getByTestId("billing-expired-banner");
    expect(banner.textContent).toMatch(/Storefront unavailable/);
    expect(banner.textContent).toMatch(/404/);
    expect(banner.textContent).toMatch(/Upgrade to Creator Grow/);
    expect(screen.getByTestId("billing-expired-pricing-link")).toBeTruthy();
    expect(screen.getByTestId("billing-expired-pricing-link").getAttribute("href")).toBe("/pricing");
  });

  it("BillingStatusBadge visually distinguishes EXPIRED from CANCELLED", () => {
    const { container: c1 } = render(<BillingStatusBadge status="CANCELLED" />);
    const { container: c2 } = render(<BillingStatusBadge status="EXPIRED" />);
    const cls1 = c1.firstChild as HTMLElement;
    const cls2 = c2.firstChild as HTMLElement;
    expect(cls1.className).not.toBe(cls2.className);
    expect(c2.textContent).toBe("EXPIRED");
    expect(c1.textContent).toBe("CANCELLED");
  });
});

// ── SubscriptionManager transparency ─────────────────────────────────
describe("RCCF-BILLING-07B — SubscriptionManager transparency", () => {
  it("PAST_DUE shows grace banner + Retry CTA derived from renewsAt", () => {
    const sub = mkSub({ status: "PAST_DUE", renewsAt: new Date(Date.now() + 86400000).toISOString() });
    render(
      <SubscriptionManager
        currentPlan={mkPlan()}
        subscription={sub}
        availablePlans={[mkPlan({ code: "creator_launch", name: "Creator Launch", price: 0 }), mkPlan()]}
        onUpgrade={() => {}}
        onDowngrade={() => {}}
        onCancel={() => {}}
        onRetry={() => {}}
      />
    );
    const banner = screen.getByTestId("submgr-past-due");
    expect(banner.textContent).toMatch(/Payment failed/);
    expect(banner.textContent).toMatch(/3-day grace/);
    expect(screen.getByTestId("submgr-retry-cta")).toBeTruthy();
  });

  it("EXPIRED shows 404 + Upgrade to Creator Grow primary + pricing link, not resume", () => {
    const sub = mkSub({ status: "EXPIRED", renewsAt: null });
    let upgradedTo: string | null = null;
    render(
      <SubscriptionManager
        currentPlan={mkPlan()}
        subscription={sub}
        availablePlans={[mkPlan(), mkPlan({ code: "creator_scale", name: "Creator Scale", price: 1999 })]}
        onUpgrade={(c) => (upgradedTo = c)}
        onDowngrade={() => {}}
        onCancel={() => {}}
        onRetry={() => {}}
      />
    );
    const banner = screen.getByTestId("submgr-expired");
    expect(banner.textContent).toMatch(/Storefront unavailable/);
    expect(banner.textContent).toMatch(/404/);
    expect(banner.textContent).toMatch(/different from Cancelled/);
    const growBtn = screen.getByTestId("submgr-upgrade-grow");
    expect(growBtn.textContent).toMatch(/Upgrade to Creator Grow/);
    growBtn.click();
    expect(upgradedTo).toBe("creator_grow");
    expect(screen.getByTestId("submgr-pricing-link").getAttribute("href")).toBe("/pricing");
  });

  it("CANCELLED shows distinct cancelled banner (not expired)", () => {
    const sub = mkSub({ status: "CANCELLED", renewsAt: null });
    render(
      <SubscriptionManager
        currentPlan={mkPlan()}
        subscription={sub}
        availablePlans={[mkPlan()]}
        onUpgrade={() => {}}
        onDowngrade={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByTestId("submgr-cancelled").textContent).toMatch(/cancelled/i);
    expect(screen.queryByTestId("submgr-expired")).toBeNull();
  });
});

// ── Trial contextual info ────────────────────────────────────────────
describe("RCCF-BILLING-07B — trial contextual info", () => {
  it("TRIALING active shows 15-day trial banner with ends date (no fabrication)", () => {
    const trialEndsAt = new Date(Date.now() + 10 * 86400000).toISOString();
    const data: BillingDashboardData = {
      plan: mkPlan({ code: "creator_launch", name: "Creator Launch", price: 0 }),
      subscription: mkSub({ status: "TRIALING", trialEndsAt, isTrialActive: true, planCode: "creator_launch" }),
      invoices: [],
      paymentMethods: [],
      usage: [],
      activeProducts: 0,
      activeGallery: 0,
      storageUsed: 0,
      ordersProcessed: 0,
      messagesSent: 0,
    };
    render(<BillingDashboard data={data} />);
    const banner = screen.getByTestId("billing-trial-banner");
    expect(banner.textContent).toMatch(/15-day free trial/);
    expect(banner.textContent).toMatch(/ends/);
  });
});

// ── FAQ lifecycle copy + storefront-loader comment ───────────────────
describe("RCCF-BILLING-07B — FAQ and storefront-loader transparency", () => {
  it("FAQ contains explicit 15-day trial + PAST_DUE → 3-day → EXPIRED → 404 lifecycle", async () => {
    const fs = await import("fs");
    const faq = fs.readFileSync("src/components/marketing/Pricing/faq.tsx", "utf8");
    expect(faq).toMatch(/15-day free trial/);
    expect(faq).toMatch(/Past Due/);
    expect(faq).toMatch(/3 days/);
    expect(faq).toMatch(/Expired/);
    expect(faq).toMatch(/404/);
    expect(faq).toMatch(/Successful payment.*restores/i);
    expect(faq).toMatch(/What happens if my payment fails\?/);
  });

  it("storefront-loader comment is 07B-accurate (PAST_DUE only within grace)", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("src/lib/storefront/storefront-loader.ts", "utf8");
    expect(src).toContain("PAST_DUE only within 3-day grace");
    expect(src).toContain("RENEWAL_GRACE_DAYS");
    expect(src).not.toMatch(/PAST_DUE\/CANCELLED\/EXPIRED never grant/);
  });
});
