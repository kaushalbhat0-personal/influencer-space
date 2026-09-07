"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ContentContainer, PageSection, DashboardGrid, DashboardGridMain, DashboardGridSide } from "@/components/layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { BillingDashboard } from "./BillingDashboard";
import { SubscriptionManager } from "./SubscriptionManager";
import { InvoiceCenter } from "./InvoiceCenter";
import { PaymentMethodManager } from "./PaymentMethodManager";
import { BRAND } from "@/lib/marketing/messaging";
import { UsageDashboard } from "./UsageDashboard";
import { changePlanAction, cancelSubscriptionAction, resumeSubscriptionAction, retryPaymentAction, getBillingDashboard } from "@/actions/billing.actions";
import type { BillingDashboard as BillingDashboardData, BillingPlan } from "@/lib/billing";
import { PaymentStrategyCard, type PaymentStrategyCardProps } from "./PaymentStrategyCard";

interface BillingPageClientProps {
  billingData: BillingDashboardData;
  availablePlans: BillingPlan[];
  workspaceId: string;
  tenantId: string;
  paymentStrategy?: PaymentStrategyCardProps;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "plans", label: "Plans" },
  { key: "invoices", label: "Invoices" },
  { key: "payment", label: "Billing payment methods" },
  { key: "usage", label: "Usage" },
] as const;

// RCCF-BILLING-07D — humanize billing history using only existing BillingEvent data (type + payload + date)
// No fabricated events; distinguishes trial, renewal, payment failure, cancellation, expiry, resumed, checkout
export function humanizeTimelineEvent(e: { type: string; payload?: Record<string, unknown> }): { label: string; detail: string } {
  const planCode = (e.payload?.planCode as string) || (e.payload?.plan as string) || "";
  const planLabel = planCode ? planCode.replace(/_/g, " ") : "";
  const rawAmount = e.payload?.amount as number | undefined;
  const amountLabel = typeof rawAmount === "number" && Number.isFinite(rawAmount) ? ` · ₹${rawAmount}` : "";
  switch (e.type) {
    case "SUBSCRIPTION_CREATED":
      return { label: "Subscription created — Trial", detail: planLabel ? `${planLabel} · 15-day trial` : "15-day free trial" };
    case "CHECKOUT_STARTED":
      return { label: "Checkout started", detail: planLabel ? `${planLabel}${amountLabel}` : "" };
    case "SUBSCRIPTION_ACTIVATED":
      // planCode distinguishes Launch trial vs paid activation using existing payload
      return {
        label: planLabel.includes("launch") ? "Trial activated" : "Subscription activated",
        detail: planLabel ? `${planLabel}${amountLabel}` : "Active",
      };
    case "SUBSCRIPTION_RENEWED":
      return { label: "Renewal successful", detail: planLabel ? `${planLabel}${amountLabel} · Active restored` : "Active restored" };
    case "PAYMENT_SUCCEEDED":
    case "PAYMENT_CAPTURED":
      return { label: "Payment succeeded", detail: planLabel ? `${planLabel}${amountLabel}` : "Payment confirmed — webhook will activate" };
    case "PAYMENT_FAILED":
      return { label: "Payment failed — Past Due", detail: planLabel ? `${planLabel} · 3-day grace started` : "3-day grace started" };
    case "SUBSCRIPTION_PAUSED":
      return { label: "Payment paused — Past Due", detail: planLabel ? `${planLabel} · retry to restore` : "Retry to restore" };
    case "SUBSCRIPTION_CANCELLED":
      return { label: "Subscription cancelled", detail: planLabel ? `${planLabel} · storefront 404 until upgrade` : "" };
    case "SUBSCRIPTION_EXPIRED":
      return { label: "Expired — storefront 404", detail: planLabel ? `${planLabel} · grace elapsed` : "Grace elapsed — upgrade to restore" };
    case "SUBSCRIPTION_RESUMED":
      return { label: "Subscription resumed", detail: planLabel ? `${planLabel} → Active` : "Active restored" };
    case "RECONCILIATION_REQUIRED":
      return { label: "Payment flagged for reconciliation", detail: planLabel || "Support will reconcile" };
    case "INVOICE_ISSUED":
    case "INVOICE_PAID":
      return { label: e.type === "INVOICE_PAID" ? "Invoice paid" : "Invoice issued", detail: planLabel ? `${planLabel}${amountLabel}` : "" };
    default: {
      // Fallback: humanize raw type without fabricating
      const pretty = e.type.replace(/_/g, " ").toLowerCase();
      return { label: pretty.charAt(0).toUpperCase() + pretty.slice(1), detail: planLabel };
    }
  }
}

let rzpLoaded = false;
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.Razorpay || rzpLoaded) return resolve();
    rzpLoaded = true;
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    document.body.appendChild(s);
  });
}

export function BillingPageClient({ billingData, availablePlans, workspaceId, tenantId, paymentStrategy }: BillingPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  type TimelineEvent = { type: string; createdAt: string; payload?: Record<string, unknown> };
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [planCode, setPlanCode] = useState<string>(billingData.plan.code);

  const showNotification = useCallback((msg?: string) => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const refresh = useCallback(async () => {
    const result = await getBillingDashboard(workspaceId, tenantId);
    if (result.success && result.data) {
      setCapabilities(result.data.capabilities);
      setTimeline(
        (result.data.history?.events ?? []).map((e: { type: string; createdAt: string; payload?: Record<string, unknown> }) => ({
          type: e.type,
          createdAt: e.createdAt,
          payload: (e.payload as Record<string, unknown>) ?? undefined,
        }))
      );
      setPlanCode(result.data.planCode);
    }
  }, [workspaceId, tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // RCCF-BILLING-07D — clear stale payment errors before any new checkout
  const clearPaymentError = useCallback(() => setError(null), []);

  async function openSubscriptionCheckout(checkout: { subscriptionId: string; keyId: string }) {
    clearPaymentError();
    if (!checkout.subscriptionId || !checkout.keyId) {
      setError("Checkout could not be initialized — please retry or contact support.");
      return;
    }
    const isPastDue = billingData.subscription.status === "PAST_DUE";
    await loadRazorpayScript();
    const options: Record<string, unknown> = {
      key: checkout.keyId,
      subscription_id: checkout.subscriptionId,
      name: BRAND.name,
      description: "Creator subscription — recurring billing via Razorpay (webhook activates plan)",
      handler: () => {
        showNotification(
          isPastDue
            ? "Payment successful — Past Due cleared, your storefront is restored. Webhook will mark Active shortly. You do not need to retry."
            : "Payment successful — your subscription will activate via webhook shortly. Storefront restored once Active. You do not need to retry."
        );
        void refresh();
      },
      modal: {
        ondismiss: () => {
          setError(
            isPastDue
              ? "Checkout closed — no charge. Your 3-day Past Due grace continues (storefront still live). Retry before grace ends to restore Active."
              : "Checkout closed — no charge. Your current plan is still active. You can retry anytime."
          );
          setLoading(null);
        },
      },
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      if (rzp && typeof rzp.on === "function") {
        rzp.on("payment.failed", () => {
          setError(
            isPastDue
              ? "Payment failed — still Past Due, 3-day grace continues (storefront live). Check your card and retry — no duplicate charge."
              : "Payment failed — no charge, still on current plan. Check your card and retry, or try a different payment method."
          );
          setLoading(null);
        });
      }
      rzp.open();
    } catch {
      setError("Checkout could not be opened. Please refresh and retry.");
      setLoading(null);
    }
  }

  // RCCF-BILLING-07C — one-time Partner checkout (order_id, never subscription_id)
  async function openOrderCheckout(checkout: { orderId: string; keyId: string }) {
    clearPaymentError();
    if (!checkout.orderId || !checkout.keyId) {
      setError("Checkout could not be initialized — please retry or contact support.");
      return;
    }
    await loadRazorpayScript();
    const options: Record<string, unknown> = {
      key: checkout.keyId,
      order_id: checkout.orderId,
      name: BRAND.name,
      description: "One-time purchase — single charge via Razorpay (webhook confirms)",
      handler: () => {
        showNotification("Payment successful — your one-time purchase will be confirmed via webhook shortly. No renewal needed. You do not need to retry.");
        void refresh();
      },
      modal: {
        ondismiss: () => {
          setError("Checkout closed — no charge for this one-time purchase. You can retry anytime.");
          setLoading(null);
        },
      },
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay(options);
      if (rzp && typeof rzp.on === "function") {
        rzp.on("payment.failed", () => {
          setError("Payment failed — no charge for this one-time purchase. Check your card and retry with a different method.");
          setLoading(null);
        });
      }
      rzp.open();
    } catch {
      setError("Checkout could not be opened. Please refresh and retry.");
      setLoading(null);
    }
  }

  const handleUpgrade = useCallback(async (target: string) => {
    setLoading(target);
    clearPaymentError();
    try {
      const result = await changePlanAction(workspaceId, tenantId, target);
      if (result.success) {
        if (result.checkout?.subscriptionId && result.checkout?.keyId) {
          await openSubscriptionCheckout({ subscriptionId: result.checkout.subscriptionId, keyId: result.checkout.keyId });
        } else if (result.checkout?.orderId && result.checkout?.keyId) {
          await openOrderCheckout({ orderId: result.checkout.orderId, keyId: result.checkout.keyId });
        } else if (!result.checkout?.subscriptionId && !result.checkout?.orderId) {
          // Free downgrade (Launch) — no Razorpay, already active
          showNotification("Plan updated — your new plan is now active.");
          await refresh();
        } else {
          setError("Checkout could not be initialized — please retry or contact support.");
        }
      } else {
        setError(result.error ?? "Upgrade failed — please check your plan and retry. Your current plan is still active.");
      }
    } finally {
      setLoading(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, tenantId]);

  const handleDowngrade = useCallback(async (target: string) => {
    setLoading(target);
    clearPaymentError();
    try {
      const result = await changePlanAction(workspaceId, tenantId, target);
      if (result.success) {
        if (result.checkout?.subscriptionId && result.checkout?.keyId) {
          await openSubscriptionCheckout({ subscriptionId: result.checkout.subscriptionId, keyId: result.checkout.keyId });
        } else if (result.checkout?.orderId && result.checkout?.keyId) {
          await openOrderCheckout({ orderId: result.checkout.orderId, keyId: result.checkout.keyId });
        } else {
          // Free Launch downgrade — no payment, immediate activation (webhook not needed)
          showNotification(target === "creator_launch" ? "Downgraded to Creator Launch — free plan is now active. No payment required." : "Plan updated — your new plan is now active.");
          await refresh();
        }
      } else {
        setError(result.error ?? "Downgrade failed — your current plan is still active. Please retry or contact support.");
      }
    } finally {
      setLoading(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, tenantId]);

  const handleCancel = useCallback(async () => {
    if (!window.confirm("Cancel your subscription? Premium capabilities will be removed at the end of the period.")) return;
    setLoading("cancel");
    clearPaymentError();
    try {
      const result = await cancelSubscriptionAction(workspaceId, tenantId);
      if (result.success) {
        showNotification("Subscription cancelled.");
        await refresh();
      } else {
        setError(result.error ?? "Cancellation failed");
      }
    } finally {
      setLoading(null);
    }
  }, [workspaceId, tenantId, refresh, showNotification]);

  const handleResume = useCallback(async () => {
    setLoading("resume");
    clearPaymentError();
    try {
      const result = await resumeSubscriptionAction(workspaceId, tenantId);
      if (result.success) {
        showNotification("Subscription resumed.");
        await refresh();
      } else {
        setError(result.error ?? "Resume failed");
      }
    } finally {
      setLoading(null);
    }
  }, [workspaceId, tenantId, refresh, showNotification]);

  const handleRetry = useCallback(async () => {
    setLoading("retry");
    clearPaymentError();
    try {
      const result = await retryPaymentAction(workspaceId, tenantId, planCode);
      if (result.success && result.checkout) {
        if (result.checkout.subscriptionId && result.checkout.keyId) {
          await openSubscriptionCheckout({ subscriptionId: result.checkout.subscriptionId, keyId: result.checkout.keyId });
        } else if (result.checkout.orderId && result.checkout.keyId) {
          await openOrderCheckout({ orderId: result.checkout.orderId, keyId: result.checkout.keyId });
        } else {
          setError(result.error ?? "Retry failed — please retry or contact support.");
        }
      } else {
        setError(result.error ?? "Retry failed");
      }
    } finally {
      setLoading(null);
    }
  }, [workspaceId, tenantId, planCode]);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let newIndex = index;
    switch (e.key) {
      case "ArrowRight":
        newIndex = (index + 1) % TABS.length;
        break;
      case "ArrowLeft":
        newIndex = (index - 1 + TABS.length) % TABS.length;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "End":
        newIndex = TABS.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    setActiveTab(TABS[newIndex].key);
    const tab = document.getElementById(`billing-tab-${TABS[newIndex].key}`);
    tab?.focus();
  }, []);

  return (
    <ContentContainer>
      <PageHeader
        title="Billing"
        description="Manage your subscription, invoices, and payment methods"
        breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Billing" }]}
        status={saved ? { label: "Updated!", variant: "success" } : undefined}
      />
      {error && (
        <div role="alert" aria-live="assertive" aria-atomic="true" tabIndex={-1} className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 motion-reduce:transition-none" data-testid="billing-error">
          {error}
        </div>
      )}
      {/* RCCF-BILLING-07F — live region for success/polite announcements, no focus trap */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="billing-live-region">
        {saved ? "Billing updated successfully" : ""}
      </div>
      {/* RCCF-PAYMENTS-UX-01C: canonical sales-readiness card */}
      <PaymentStrategyCard {...(paymentStrategy ?? { strategy: null, readiness: null })} />
      <nav className="mb-6 flex gap-1 border-b border-[var(--border)] overflow-x-auto" aria-label="Billing sections" role="tablist">
        {TABS.map((tab, index) => (
          <button
            key={tab.key}
            id={`billing-tab-${tab.key}`}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`billing-panel-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            onKeyDown={(e) => handleTabKeyDown(e, index)}
            tabIndex={activeTab === tab.key ? 0 : -1}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div
        id="billing-panel-overview"
        role="tabpanel"
        aria-labelledby="billing-tab-overview"
        hidden={activeTab !== "overview"}
      >
        {activeTab === "overview" && (
          <DashboardGrid>
            <DashboardGridMain>
              <PageSection>
                <BillingDashboard data={billingData} />
              </PageSection>
              <PageSection>
                <InvoiceCenter invoices={billingData.invoices} />
              </PageSection>
              <PageSection>
                <div className="admin-card p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Billing Timeline</h3>
                  {timeline.length > 0 ? (
                    <ol className="space-y-2 text-xs" data-testid="billing-timeline">
                      {timeline.map((e, i) => {
                        const h = humanizeTimelineEvent(e);
                        return (
                          <li
                            key={`${e.type}-${i}`}
                            data-testid={`timeline-item-${e.type}`}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-md bg-white/[0.03] px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-[var(--text-primary)]">{h.label}</p>
                              {h.detail && <p className="text-[11px] text-[var(--text-muted)]">{h.detail}</p>}
                            </div>
                            <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{new Date(e.createdAt).toLocaleString()}</span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]" data-testid="timeline-empty">
                      No billing activity yet — your 15-day trial is active. Renewals, payment failures, and cancellations will appear here with plan and amount.
                    </p>
                  )}
                </div>
              </PageSection>
            </DashboardGridMain>
            <DashboardGridSide>
              <PageSection>
                <UsageDashboard usage={billingData.usage} />
              </PageSection>
              <PageSection>
                <div className="admin-card p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button onClick={() => setActiveTab("plans")} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] text-left">
                      Change Plan
                    </button>
                    <button onClick={() => setActiveTab("payment")} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] text-left">
                      Manage Payment Methods
                    </button>
                    <button onClick={() => setActiveTab("invoices")} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] text-left">
                      View All Invoices
                    </button>
                    <a href="/admin/settings" className="block rounded-lg border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2 text-sm text-[var(--brand-primary)] hover:bg-[var(--surface-card-hover)]">
                      Settings \u2192
                    </a>
                  </div>
                </div>
              </PageSection>
            </DashboardGridSide>
          </DashboardGrid>
        )}
      </div>

      <div
        id="billing-panel-plans"
        role="tabpanel"
        aria-labelledby="billing-tab-plans"
        hidden={activeTab !== "plans"}
      >
        {activeTab === "plans" && (
          <SubscriptionManager
            currentPlan={billingData.plan}
            subscription={billingData.subscription}
            availablePlans={availablePlans}
            onUpgrade={handleUpgrade}
            onDowngrade={handleDowngrade}
            onCancel={handleCancel}
            onResume={handleResume}
            onRetry={handleRetry}
            capabilities={capabilities}
            loading={loading !== null}
          />
        )}
      </div>

      <div
        id="billing-panel-invoices"
        role="tabpanel"
        aria-labelledby="billing-tab-invoices"
        hidden={activeTab !== "invoices"}
      >
        {activeTab === "invoices" && (
          <InvoiceCenter invoices={billingData.invoices} />
        )}
      </div>

      <div
        id="billing-panel-payment"
        role="tabpanel"
        aria-labelledby="billing-tab-payment"
        hidden={activeTab !== "payment"}
      >
        {activeTab === "payment" && (
          <PaymentMethodManager methods={billingData.paymentMethods} />
        )}
      </div>

      <div
        id="billing-panel-usage"
        role="tabpanel"
        aria-labelledby="billing-tab-usage"
        hidden={activeTab !== "usage"}
      >
        {activeTab === "usage" && (
          <UsageDashboard usage={billingData.usage} />
        )}
      </div>
    </ContentContainer>
  );
}
