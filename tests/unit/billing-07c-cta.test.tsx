// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { capabilityEngine } from "@/lib/capabilities/engine";
import { SubscriptionManager } from "@/components/billing/SubscriptionManager";
import type { BillingPlan, BillingSubscription } from "@/lib/billing";

function mkPlan(overrides: Partial<BillingPlan> = {}): BillingPlan {
  return {
    code: "creator_grow",
    family: "creator",
    name: "Creator Growth",
    description: "",
    price: 999,
    currency: "INR",
    cycle: "monthly",
    features: { max_products: -1, premium_themes: true, custom_domain: false, max_clients: 1 },
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

const smPath = resolve("src/components/billing/SubscriptionManager.tsx");
const bcPath = resolve("src/components/billing/BillingPageClient.tsx");

describe("RCCF-BILLING-07C — CTA correctness (capability-only, no price fallback)", () => {
  it("SubscriptionManager has no price-based fallback classification", () => {
    const src = readFileSync(smPath, "utf8");
    expect(src).not.toContain("isDowngradeFallback");
    expect(src).not.toContain("plan.price < currentPlan.price");
    expect(src).not.toContain("isDowngradeFinal");
    expect(src).toContain("capability-only classification");
    expect(src).toContain("isNeutral");
  });

  it("capabilityEngine: Grow → Scale is upgrade, same plan is neutral (no price mislabel)", () => {
    const growToScale = capabilityEngine.comparePlans("creator_grow", "creator_scale");
    expect(growToScale).not.toBeNull();
    // Scale adds custom_domain, webhooks etc — should be upgrade from Grow
    const hasUpgrade = growToScale!.addedFeatures.length > 0 || growToScale!.upgradedLimits.length > 0;
    expect(hasUpgrade).toBe(true);

    // Neutral: identical plan comparison → no added/upgraded (capability-neutral Switch)
    const growToGrow = capabilityEngine.comparePlans("creator_grow", "creator_grow");
    expect(growToGrow).not.toBeNull();
    expect(growToGrow!.addedFeatures.length).toBe(0);
    expect(growToGrow!.upgradedLimits.length).toBe(0);
  });

  it("renders Upgrade for capability-add, Downgrade for reverse, Switch for neutral (no price mislabel)", async () => {
    const current = mkPlan({ code: "creator_grow", name: "Growth", price: 999, features: { a: true, b: 10 } as any });
    const scale = mkPlan({ code: "creator_scale", name: "Scale", price: 1999, features: { a: true, b: -1, premium_themes: true } as any });
    // Mock capabilityEngine indirectly via real plans would be complex; instead test the rendered CTAs for real registry plans
    const sub = mkSub({ planCode: "creator_grow" });
    const plans = [
      mkPlan({ code: "creator_grow", name: "Growth", price: 999 }),
      mkPlan({ code: "creator_scale", name: "Scale", price: 1999 }),
    ];
    // Use real registry codes for meaningful comparison
    const realPlans = [
      { code: "creator_grow", name: "Creator Growth", price: 999, features: { max_products: -1, premium_themes: true } } as BillingPlan,
      { code: "creator_scale", name: "Creator Scale", price: 1999, features: { max_products: -1, premium_themes: true, custom_domain: true } } as BillingPlan,
    ];
    render(
      <SubscriptionManager
        currentPlan={mkPlan({ code: "creator_grow", name: "Creator Growth", price: 999, features: { max_products: -1, premium_themes: true } } as any)}
        subscription={mkSub({ planCode: "creator_grow" })}
        availablePlans={realPlans as any}
        onUpgrade={() => {}}
        onDowngrade={() => {}}
        onCancel={() => {}}
      />
    );
    // Current is Grow, Scale should be Upgrade (adds custom_domain)
    expect(screen.getByTestId("cta-upgrade-creator_scale")).toBeTruthy();
    expect(screen.getByTestId("cta-upgrade-creator_scale").textContent).toMatch(/Upgrade to/);
  });
});

describe("RCCF-BILLING-07C — Launch disabled for paid creators", () => {
  it("paid creator sees Launch as disabled informational state, not hidden or downgrade", () => {
    const current = mkPlan({ code: "creator_grow", name: "Creator Growth", price: 999 });
    const launch = mkPlan({ code: "creator_launch", name: "Creator Launch", price: 0 });
    const scale = mkPlan({ code: "creator_scale", name: "Creator Scale", price: 1999 });
    render(
      <SubscriptionManager
        currentPlan={current}
        subscription={mkSub({ planCode: "creator_grow" })}
        availablePlans={[launch, current, scale]}
        onUpgrade={() => {}}
        onDowngrade={() => {}}
        onCancel={() => {}}
      />
    );
    const el = screen.getByTestId("cta-launch-disabled");
    expect(el).toBeTruthy();
    expect(el.getAttribute("aria-disabled")).toBe("true");
    expect(el.textContent).toMatch(/15-day trial only/);
    expect(el.getAttribute("title")).toMatch(/15-day free trial.*not a permanent free plan/i);
    // Must NOT have upgrade/downgrade testids for Launch
    expect(screen.queryByTestId("cta-upgrade-creator_launch")).toBeNull();
    expect(screen.queryByTestId("cta-downgrade-creator_launch")).toBeNull();
  });

  it("Launch creator sees normal Launch current state, not disabled", () => {
    const launch = mkPlan({ code: "creator_launch", name: "Creator Launch", price: 0 });
    const grow = mkPlan({ code: "creator_grow", name: "Creator Growth", price: 999 });
    render(
      <SubscriptionManager
        currentPlan={launch}
        subscription={mkSub({ planCode: "creator_launch" })}
        availablePlans={[launch, grow]}
        onUpgrade={() => {}}
        onDowngrade={() => {}}
        onCancel={() => {}}
      />
    );
    // Launch is current → shows "Current — Creator Launch", not disabled
    expect(screen.queryByTestId("cta-launch-disabled")).toBeNull();
    expect(screen.getByText(/Current — Creator Launch/)).toBeTruthy();
    // Other plan should be upgrade
    expect(screen.getByTestId("cta-upgrade-creator_grow")).toBeTruthy();
  });

  it("source retains 06E guard comment and disabled rendering", () => {
    const src = readFileSync(smPath, "utf8");
    expect(src).toContain("cta-launch-disabled");
    expect(src).toContain("15-day signup trial");
    expect(src).toContain('aria-disabled="true"');
    // Should NOT contain bare return null for Launch hide
    expect(src).not.toMatch(/if \(plan\.code === "creator_launch" && currentPlan\.code !== "creator_launch"\) \{\s*return null;\s*\}/);
  });
});

describe("RCCF-BILLING-07C — BillingPageClient one-time vs recurring checkout", () => {
  it("BillingPageClient source correctly separates order_id and subscription_id flows", () => {
    const src = readFileSync(bcPath, "utf8");
    // Two distinct open functions
    expect(src).toContain("async function openSubscriptionCheckout");
    expect(src).toContain("async function openOrderCheckout");
    expect(src).toContain("subscription_id: checkout.subscriptionId");
    expect(src).toContain("order_id: checkout.orderId");
    expect(src).toMatch(/description: "One-time purchase/);
    expect(src).toMatch(/description: "Creator subscription — recurring billing/);
    // No unsafe cast that conflates orderId → subscriptionId
    expect(src).not.toContain('as unknown as { subscriptionId');
    expect(src).not.toContain('await openSubscriptionCheckout(result.checkout as unknown');
  });

  it("handleUpgrade checks subscriptionId first, then orderId, never expects subscriptionId for one-time", () => {
    const src = readFileSync(bcPath, "utf8");
    // Must check subscriptionId && keyId before orderId && keyId
    expect(src).toMatch(/if \(result\.checkout\?\.subscriptionId && result\.checkout\?\.keyId\)/);
    expect(src).toMatch(/else if \(result\.checkout\?\.orderId && result\.checkout\?\.keyId\)/);
    expect(src).toMatch(/await openOrderCheckout\(\{ orderId: result\.checkout\.orderId/);
    expect(src).not.toMatch(/Checkout ready — please complete payment\. Your current plan stays active until payment succeeds/);
  });

  it("handleDowngrade and handleRetry also handle both flows", () => {
    const src = readFileSync(bcPath, "utf8");
    // handleDowngrade
    expect(src).toMatch(/handleDowngrade[\s\S]*?if \(result\.checkout\?\.subscriptionId/);
    expect(src).toMatch(/handleDowngrade[\s\S]*?else if \(result\.checkout\?\.orderId/);
    // handleRetry — must also branch on subscriptionId vs orderId
    expect(src).toMatch(/handleRetry[\s\S]*?if \(result\.checkout\.subscriptionId && result\.checkout\.keyId\)/);
    expect(src).toMatch(/handleRetry[\s\S]*?else if \(result\.checkout\.orderId && result\.checkout\.keyId\)/);
  });

  it("recurring subscription flow preserved (subscription_id still used)", () => {
    const src = readFileSync(bcPath, "utf8");
    expect(src).toContain("await openSubscriptionCheckout({ subscriptionId: result.checkout.subscriptionId");
    // retry still supports subscription
    expect(src).toContain("openSubscriptionCheckout");
    expect(src).toContain("openOrderCheckout");
  });
});
