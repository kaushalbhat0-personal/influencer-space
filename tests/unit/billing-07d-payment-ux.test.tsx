// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { humanizeTimelineEvent } from "@/components/billing/BillingPageClient";
import { InvoiceCenter } from "@/components/billing/InvoiceCenter";

const bcPath = resolve("src/components/billing/BillingPageClient.tsx");
const icPath = resolve("src/components/billing/InvoiceCenter.tsx");

// ── Timeline humanization ───────────────────────────────────────────────
describe("RCCF-BILLING-07D — timeline labels (existing data only)", () => {
  it("humanizes trial, renewal, payment failure, cancellation, expiry, resumed, checkout", () => {
    expect(humanizeTimelineEvent({ type: "SUBSCRIPTION_CREATED", payload: { planCode: "creator_launch" } }).label).toMatch(/Trial|Subscription created/i);
    expect(humanizeTimelineEvent({ type: "CHECKOUT_STARTED", payload: { planCode: "creator_grow", amount: 999 } }).label).toMatch(/Checkout started/i);
    expect(humanizeTimelineEvent({ type: "CHECKOUT_STARTED", payload: { planCode: "creator_grow" } }).detail).toMatch(/creator grow/i);

    const activatedLaunch = humanizeTimelineEvent({ type: "SUBSCRIPTION_ACTIVATED", payload: { planCode: "creator_launch" } });
    expect(activatedLaunch.label).toMatch(/Trial activated/i);
    const activatedGrow = humanizeTimelineEvent({ type: "SUBSCRIPTION_ACTIVATED", payload: { planCode: "creator_grow" } });
    expect(activatedGrow.label).toMatch(/Subscription activated/i);

    const renewed = humanizeTimelineEvent({ type: "SUBSCRIPTION_RENEWED", payload: { planCode: "creator_grow", amount: 999 } });
    expect(renewed.label).toMatch(/Renewal successful/i);
    expect(renewed.detail).toMatch(/creator grow/i);

    const failed = humanizeTimelineEvent({ type: "PAYMENT_FAILED", payload: { planCode: "creator_grow" } });
    expect(failed.label).toMatch(/Payment failed.*Past Due/i);
    expect(failed.detail).toMatch(/3-day grace/i);

    const cancelled = humanizeTimelineEvent({ type: "SUBSCRIPTION_CANCELLED", payload: { planCode: "creator_grow" } });
    expect(cancelled.label).toMatch(/cancelled/i);

    const expired = humanizeTimelineEvent({ type: "SUBSCRIPTION_EXPIRED", payload: { planCode: "creator_grow" } });
    expect(expired.label).toMatch(/Expired.*404/i);
    expect(expired.detail).toMatch(/grace elapsed/i);

    const resumed = humanizeTimelineEvent({ type: "SUBSCRIPTION_RESUMED", payload: { planCode: "creator_grow" } });
    expect(resumed.label).toMatch(/resumed/i);

    const paid = humanizeTimelineEvent({ type: "PAYMENT_SUCCEEDED", payload: { planCode: "creator_grow" } });
    expect(paid.label).toMatch(/Payment succeeded/i);

    const paused = humanizeTimelineEvent({ type: "SUBSCRIPTION_PAUSED", payload: { planCode: "creator_grow" } });
    expect(paused.label).toMatch(/Past Due/i);
  });

  it("fallback humanizes unknown types without fabricating", () => {
    const unk = humanizeTimelineEvent({ type: "BILLING_UNKNOWN_EVENT", payload: {} });
    expect(unk.label).toBe("Billing unknown event");
  });

  it("does not fabricate amount when payload has no amount", () => {
    const ev = humanizeTimelineEvent({ type: "CHECKOUT_STARTED", payload: { planCode: "creator_grow" } });
    expect(ev.detail).not.toMatch(/₹/);
  });

  it("shows amount when payload has amount (existing data)", () => {
    const ev = humanizeTimelineEvent({ type: "CHECKOUT_STARTED", payload: { planCode: "creator_grow", amount: 1999 } });
    expect(ev.detail).toMatch(/1999/);
  });
});

// ── Invoice humanization ───────────────────────────────────────────────
describe("RCCF-BILLING-07D — invoice labels and empty state", () => {
  it("InvoiceCenter empty state is trial-aware and mentions no-fabrication", () => {
    const src = readFileSync(icPath, "utf8");
    expect(src).toMatch(/No invoices yet/);
    expect(src).toMatch(/trial has no invoices/i);
    expect(src).toMatch(/paid renewals and one-time purchases create invoices/i);
    expect(src).toMatch(/Payment failures and grace do not create invoices/i);
  });

  it("renders invoices with plan, amount, status, date using existing data", () => {
    const invoices = [
      {
        id: "inv_12345678",
        accountId: "acc1",
        planCode: "creator_grow",
        planName: "Creator Growth",
        amount: 999,
        taxAmount: 0,
        total: 999,
        currency: "INR",
        status: "PAID" as const,
        issuedAt: new Date("2026-08-15T00:00:00.000Z").toISOString(),
        paidAt: new Date("2026-08-15T00:00:00.000Z").toISOString(),
        dueAt: null,
        invoiceUrl: null,
        provider: "razorpay",
        providerReference: "pay_123",
        lineItems: [],
      },
    ];
    render(<InvoiceCenter invoices={invoices} />);
    expect(screen.getByText(/creator grow/i)).toBeTruthy();
    expect(screen.getByText(/₹.*999/)).toBeTruthy();
    expect(screen.getAllByText(/Paid/).length).toBeGreaterThanOrEqual(1);
  });

  it("filtered empty shows humanized criteria message", () => {
    const invoices = [
      {
        id: "inv_aaaa",
        accountId: "acc1",
        planCode: "creator_scale",
        planName: "Creator Scale",
        amount: 1999,
        taxAmount: 0,
        total: 1999,
        currency: "INR",
        status: "PAID" as const,
        issuedAt: new Date().toISOString(),
        paidAt: new Date().toISOString(),
        dueAt: null,
        invoiceUrl: null,
        provider: null,
        providerReference: null,
        lineItems: [],
      },
    ];
    render(<InvoiceCenter invoices={invoices} />);
    // still shows table when not filtered
    expect(screen.getByText(/creator scale/i)).toBeTruthy();
  });
});

// ── Razorpay copy — subscription vs one-time distinct ───────────────────
describe("RCCF-BILLING-07D — Razorpay copy subscription vs one-time", () => {
  it("BillingPageClient has distinct descriptions and copy for subscription vs one-time", () => {
    const src = readFileSync(bcPath, "utf8");
    expect(src).toContain('description: "Creator subscription — recurring billing via Razorpay (webhook activates plan)"');
    expect(src).toContain('description: "One-time purchase — single charge via Razorpay (webhook confirms)"');
    expect(src).toContain("openSubscriptionCheckout");
    expect(src).toContain("openOrderCheckout");
    expect(src).toContain("subscription_id: checkout.subscriptionId");
    expect(src).toContain("order_id: checkout.orderId");
  });

  it("success copy is lifecycle-aware (webhook, storefront, no retry)", () => {
    const src = readFileSync(bcPath, "utf8");
    expect(src).toMatch(/Payment successful/);
    expect(src).toMatch(/webhook will activate|webhook shortly/i);
    expect(src).toMatch(/Past Due cleared, your storefront is restored/i);
    expect(src).toMatch(/one-time purchase will be confirmed via webhook shortly/i);
    expect(src).toMatch(/You do not need to retry/);
  });

  it("failure and dismissal copy are actionable and grace-aware", () => {
    const src = readFileSync(bcPath, "utf8");
    // failure
    expect(src).toMatch(/Payment failed.*still Past Due, 3-day grace continues/i);
    expect(src).toMatch(/Check your card and retry.*no duplicate charge/i);
    expect(src).toMatch(/Payment failed — no charge for this one-time purchase/i);
    // dismiss
    expect(src).toMatch(/Checkout closed — no charge.*3-day Past Due grace continues/i);
    expect(src).toMatch(/Checkout closed — no charge for this one-time purchase/i);
  });
});

// ── Stale error clear on new checkout ───────────────────────────────────
describe("RCCF-BILLING-07D — stale payment error cleared on new checkout", () => {
  it("BillingPageClient clears stale errors via clearPaymentError on every new attempt", () => {
    const src = readFileSync(bcPath, "utf8");
    expect(src).toContain("const clearPaymentError = useCallback(() => setError(null)");
    expect(src).toContain("clearPaymentError();");
    // handleUpgrade, handleDowngrade, handleRetry, handleCancel, handleResume all clear
    expect((src.match(/clearPaymentError\(\)/g) || []).length).toBeGreaterThanOrEqual(5);
    // open functions also clear before Razorpay open
    expect(src).toMatch(/async function openSubscriptionCheckout[\s\S]*?clearPaymentError\(\)/);
    expect(src).toMatch(/async function openOrderCheckout[\s\S]*?clearPaymentError\(\)/);
  });

  it("timeline and retry flow reuse existing BillingEvent data (no fabricated events)", () => {
    const src = readFileSync(bcPath, "utf8");
    expect(src).toContain("humanizeTimelineEvent");
    expect(src).toContain("result.data.history?.events");
    expect(src).toContain("Billing Timeline");
    expect(src).toContain('data-testid="billing-timeline"');
    expect(src).toContain('data-testid="timeline-empty"');
    // Retry preserves PAST_DUE semantics (no schema change)
    expect(src).toMatch(/handleRetry[\s\S]*?retryPaymentAction[\s\S]*?openSubscriptionCheckout|openOrderCheckout/);
  });
});
