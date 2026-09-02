/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentStrategyCard } from "@/components/billing/PaymentStrategyCard";
import { PaymentsMultiproviderClient } from "@/app/admin/payments/_components/payments-client.multiprovider";
import type { ResolvedCommerceStrategy } from "@/modules/commerce-strategy/domain/types";
import type { PaymentReadinessReport, PaymentAccountData } from "@/modules/payment-account/domain/types";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function strategy(id: "PLATFORM_COLLECT" | "DIRECT_CREATOR" | "MARKETPLACE", status: "active" | "reserved" = "active"): ResolvedCommerceStrategy {
  const def: ResolvedCommerceStrategy["definition"] = {
    id: id as never,
    label: id === "PLATFORM_COLLECT" ? "Platform Collect" : id === "DIRECT_CREATOR" ? "Direct Creator" : "Marketplace",
    description: "",
    merchantOfRecord: id === "PLATFORM_COLLECT" ? "platform" : "creator",
    supportsTransfers: false,
    supportsSubscriptions: true,
    supportsProducts: true,
    supportsBookings: true,
    supportsServices: true,
    supportsCourses: true,
    requiresLinkedAccount: id !== "PLATFORM_COLLECT",
    requiresSettlement: id !== "PLATFORM_COLLECT",
    requiresShipping: false,
    requiresDigitalDelivery: false,
    status,
  } as never;
  return { id: id as never, source: "tenant", definition: def, readiness: status === "active" ? "ready" : "incomplete", reason: null };
}

function readiness(overrides: Partial<PaymentReadinessReport> = {}): PaymentReadinessReport {
  return {
    tenantId: "t1",
    readiness: "ready",
    strategy: "DIRECT_CREATOR",
    provider: "razorpay",
    requirements: [
      { key: "strategy", label: "Commerce strategy", met: true, severity: "required" },
      { key: "provider", label: "Payment provider selected", met: true, severity: "required" },
      { key: "configured", label: "Account configured", met: true, severity: "required" },
      { key: "identity", label: "Account holder identified", met: true, severity: "required" },
      { key: "settlement", label: "Settlement detail provided", met: true, severity: "required" },
      { key: "verification", label: "Provider credentials verified", met: true, severity: "required" },
      { key: "active", label: "Active provider chosen", met: true, severity: "required" },
    ],
    missing: [],
    ...overrides,
  } as PaymentReadinessReport;
}

function account(overrides: Partial<PaymentAccountData> = {}): PaymentAccountData {
  return {
    id: "acc1",
    tenantId: "t1",
    provider: "razorpay",
    displayName: null,
    accountHolderName: "Test Holder",
    merchantName: null,
    upiId: "test@upi",
    bankAccountName: null,
    hasBankAccountNumber: false,
    ifsc: null,
    settlementMode: "upi",
    status: "active",
    verificationStatus: "verified",
    capabilities: { products: true },
    hasProviderKeys: true,
    lastVerifiedAt: new Date("2026-01-15T10:00:00Z").toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    providerAccountId: null,
    isActive: true,
    ...overrides,
  } as PaymentAccountData;
}

describe("RCCF-PAYMENTS-UX-01C — PaymentStrategyCard", () => {
  it("TEST 1 — DIRECT_CREATOR READY shows Payments ready, Razorpay label, /admin/payments, no coming soon/Connect Razorpay", () => {
    const s = strategy("DIRECT_CREATOR");
    const r = readiness({ readiness: "ready", strategy: "DIRECT_CREATOR", provider: "razorpay" });
    const { container } = render(<PaymentStrategyCard strategy={s} readiness={r} activeProviderLabel="Razorpay" lastVerifiedAt={account().lastVerifiedAt} />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/Payments ready/i);
    expect(text).toMatch(/Razorpay/);
    expect(container.querySelector('a[href="/admin/payments"]')).not.toBeNull();
    expect(text.toLowerCase()).not.toContain("coming soon");
    expect(text).not.toMatch(/Connect Razorpay/i);
  });

  it("TEST 2 — DIRECT_CREATOR NOT READY shows missing canonical requirement, Payments CTA, no coming soon, no false success", () => {
    const s = strategy("DIRECT_CREATOR");
    const r = readiness({ readiness: "warning", missing: ["Settlement detail provided"], requirements: [
      { key: "strategy", label: "Commerce strategy", met: true, severity: "required" },
      { key: "provider", label: "Payment provider selected", met: true, severity: "required" },
      { key: "configured", label: "Account configured", met: true, severity: "required" },
      { key: "identity", label: "Account holder identified", met: true, severity: "required" },
      { key: "settlement", label: "Settlement detail provided", met: false, severity: "required" },
      { key: "verification", label: "Provider credentials verified", met: true, severity: "required" },
      { key: "active", label: "Active provider chosen", met: true, severity: "required" },
    ]});
    const { container } = render(<PaymentStrategyCard strategy={s} readiness={r} activeProviderLabel="Razorpay" lastVerifiedAt={null} />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/stay unavailable until you complete/i);
    expect(text).toMatch(/Settlement detail provided/);
    expect(container.querySelector('a[href="/admin/payments"]')).not.toBeNull();
    expect(text.toLowerCase()).not.toContain("coming soon");
    expect(text).not.toMatch(/Payments ready/i);
  });

  it("TEST 3 — DIRECT_CREATOR NO PAYMENT ACCOUNT shows blocked, canonical missing, Payments CTA, no success", () => {
    const s = strategy("DIRECT_CREATOR");
    const r = readiness({ readiness: "blocked", provider: null, missing: ["Payment provider selected", "Account configured", "Account holder identified", "Settlement detail provided", "Provider credentials verified", "Active provider chosen"]});
    const { container } = render(<PaymentStrategyCard strategy={s} readiness={r} activeProviderLabel={null} lastVerifiedAt={null} />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/stay unavailable until you complete/i);
    expect(text).toMatch(/Payment provider selected/);
    expect(container.querySelector('a[href="/admin/payments"]')).not.toBeNull();
    expect(text).not.toMatch(/Payments ready/i);
    expect(text.toLowerCase()).not.toContain("coming soon");
  });

  it("TEST 4 — PLATFORM_COLLECT shows platform message, no Razorpay CTA, no coming soon, no sales CTA", () => {
    const s = strategy("PLATFORM_COLLECT");
    const r = readiness({ readiness: "ready", strategy: "PLATFORM_COLLECT", provider: null, missing: [] });
    const { container } = render(<PaymentStrategyCard strategy={s} readiness={r} activeProviderLabel={null} lastVerifiedAt={null} />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/CreatorStore handles payments for you/i);
    expect(text.toLowerCase()).not.toContain("coming soon");
    expect(text).not.toMatch(/Connect Razorpay/i);
    // Should not show Go to Payments CTA for platform
    expect(container.querySelector('a[href="/admin/payments"]')).toBeNull();
  });

  it("TEST 8 — PaymentStrategyCard.tsx does not contain stale coming-soon sales message", () => {
    const src = readFileSync(resolve(__dirname, "../../src/components/billing/PaymentStrategyCard.tsx"), "utf8");
    expect(src).not.toContain("Connect Razorpay to receive product payments directly — coming soon.");
    // Future provider coming-soon elsewhere is allowed, only stale sales message is prohibited
    expect(src.toLowerCase()).not.toContain("coming soon");
  });
});

describe("RCCF-PAYMENTS-UX-01C — Payments multiprovider banner", () => {
  it("TEST 5+6 — CROSS-SURFACE + VERIFIED BUT NOT READY: green only when ready, amber lists missing, no false receiving", () => {
    const readyReport = readiness({ readiness: "ready", strategy: "DIRECT_CREATOR", provider: "razorpay", missing: [] });
    const { container: readyContainer, unmount } = render(
      <PaymentsMultiproviderClient initialAccounts={[account()]} initialActive="razorpay" initialReadiness={readyReport} />
    );
    expect(readyContainer.textContent).toMatch(/You're receiving payments through/i);
    expect(readyContainer.textContent).toMatch(/Razorpay/);
    unmount();

    const blockedReport = readiness({
      readiness: "warning",
      strategy: "DIRECT_CREATOR",
      provider: "razorpay",
      missing: ["Settlement detail provided"],
      requirements: [
        { key: "strategy", label: "Commerce strategy", met: true, severity: "required" },
        { key: "provider", label: "Payment provider selected", met: true, severity: "required" },
        { key: "configured", label: "Account configured", met: true, severity: "required" },
        { key: "identity", label: "Account holder identified", met: true, severity: "required" },
        { key: "settlement", label: "Settlement detail provided", met: false, severity: "required" },
        { key: "verification", label: "Provider credentials verified", met: true, severity: "required" },
        { key: "active", label: "Active provider chosen", met: true, severity: "required" },
      ],
    });
    const { container: blockedContainer } = render(
      <PaymentsMultiproviderClient initialAccounts={[account({ verificationStatus: "verified", isActive: true })]} initialActive="razorpay" initialReadiness={blockedReport} />
    );
    const blockedText = blockedContainer.textContent ?? "";
    // Must NOT show green receiving as success
    expect(blockedText).not.toMatch(/You're receiving payments through.*✓/);
    // Must show canonical missing with verified-but-blocked phrasing
    expect(blockedText).toMatch(/stay unavailable until you complete/i);
    expect(blockedText).toMatch(/Settlement detail provided/);
  });

  it("TEST 6b — Billing and Payments use identical missing vocabulary", () => {
    const missing = ["Settlement detail provided"];
    const r = readiness({ readiness: "warning", missing, requirements: [
      { key: "strategy", label: "Commerce strategy", met: true, severity: "required" },
      { key: "provider", label: "Payment provider selected", met: true, severity: "required" },
      { key: "configured", label: "Account configured", met: true, severity: "required" },
      { key: "identity", label: "Account holder identified", met: true, severity: "required" },
      { key: "settlement", label: "Settlement detail provided", met: false, severity: "required" },
      { key: "verification", label: "Provider credentials verified", met: true, severity: "required" },
      { key: "active", label: "Active provider chosen", met: true, severity: "required" },
    ]});
    const s = strategy("DIRECT_CREATOR");
    const { container: billing } = render(<PaymentStrategyCard strategy={s} readiness={r} activeProviderLabel="Razorpay" lastVerifiedAt={null} />);
    const { container: payments } = render(<PaymentsMultiproviderClient initialAccounts={[account()]} initialActive="razorpay" initialReadiness={r} />);
    expect(billing.textContent).toContain("Settlement detail provided");
    expect(payments.textContent).toContain("Settlement detail provided");
  });
});

describe("RCCF-PAYMENTS-UX-01C — legacy field does not control readiness", () => {
  it("TEST 7 — Tenant.razorpayAccountId populated but PaymentAccount absent => readiness remains NOT READY", async () => {
    const src = readFileSync(resolve(__dirname, "../../src/modules/commerce-strategy/application/runtime.ts"), "utf8");
    // Active sales-readiness path must not query Tenant.razorpayAccountId directly
    expect(src).not.toMatch(/select:\s*\{\s*razorpayAccountId/);
    expect(src).not.toMatch(/prisma\.tenant\.findMany\(\{\s*select:\s*\{\s*razorpayAccountId/);
    // Also verify PaymentStrategyCard no longer imports getMyStrategyReadiness legacy
    const cardSrc = readFileSync(resolve(__dirname, "../../src/components/billing/PaymentStrategyCard.tsx"), "utf8");
    expect(cardSrc).not.toContain("getMyStrategyReadiness");
    expect(cardSrc).not.toContain("getMyCommerceStrategy");
  });
});

describe("RCCF-PAYMENTS-UX-01C — Billing terminology", () => {
  it("BillingPageClient TABS label is Billing payment methods and PaymentMethodManager empty message is billing-scoped", () => {
    const billingClientSrc = readFileSync(resolve(__dirname, "../../src/components/billing/BillingPageClient.tsx"), "utf8");
    expect(billingClientSrc).toContain('label: "Billing payment methods"');
    expect(billingClientSrc).not.toContain('label: "Payment Methods"');

    const managerSrc = readFileSync(resolve(__dirname, "../../src/components/billing/PaymentMethodManager.tsx"), "utf8");
    expect(managerSrc).toContain("No billing payment methods added yet.");
    expect(managerSrc).toContain('title="Billing payment methods"');
  });
});
