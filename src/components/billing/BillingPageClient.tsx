"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ContentContainer, PageSection, DashboardGrid, DashboardGridMain, DashboardGridSide } from "@/components/layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { BillingDashboard } from "./BillingDashboard";
import { SubscriptionManager } from "./SubscriptionManager";
import { InvoiceCenter } from "./InvoiceCenter";
import { PaymentMethodManager } from "./PaymentMethodManager";
import { UsageDashboard } from "./UsageDashboard";
import { changePlanAction, cancelSubscriptionAction, resumeSubscriptionAction, retryPaymentAction, getBillingDashboard } from "@/actions/billing.actions";
import type { BillingDashboard as BillingDashboardData, BillingPlan } from "@/lib/billing";

interface BillingPageClientProps {
  billingData: BillingDashboardData;
  availablePlans: BillingPlan[];
  workspaceId: string;
  tenantId: string;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "plans", label: "Plans" },
  { key: "invoices", label: "Invoices" },
  { key: "payment", label: "Payment Methods" },
  { key: "usage", label: "Usage" },
] as const;

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

export function BillingPageClient({ billingData, availablePlans, workspaceId, tenantId }: BillingPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<Array<{ type: string; createdAt: string }>>([]);
  const [planCode, setPlanCode] = useState<string>(billingData.plan.code);

  const showNotification = useCallback((msg?: string) => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const refresh = useCallback(async () => {
    const result = await getBillingDashboard(workspaceId, tenantId);
    if (result.success && result.data) {
      setCapabilities(result.data.capabilities);
      setTimeline((result.data.history?.events ?? []).map((e: { type: string; createdAt: string }) => ({ type: e.type, createdAt: e.createdAt })));
      setPlanCode(result.data.planCode);
    }
  }, [workspaceId, tenantId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function openSubscriptionCheckout(checkout: { subscriptionId?: string; keyId?: string; orderId?: string }) {
    if (!checkout.subscriptionId || !checkout.keyId) {
      setError("Checkout could not be initialized.");
      return;
    }
    await loadRazorpayScript();
    const options = {
      key: checkout.keyId,
      subscription_id: checkout.subscriptionId,
      name: "CreatorStore",
      description: "Subscription",
      handler: () => {
        showNotification("Subscription started — you will be notified once it activates.");
        void refresh();
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (window as any).Razorpay(options).open();
  }

  const handleUpgrade = useCallback(async (target: string) => {
    setLoading(target);
    setError(null);
    try {
      const result = await changePlanAction(workspaceId, tenantId, target);
      if (result.success && result.checkout) {
        await openSubscriptionCheckout(result.checkout);
      } else {
        setError(result.error ?? "Upgrade failed");
      }
    } finally {
      setLoading(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, tenantId]);

  const handleDowngrade = useCallback(async (target: string) => {
    setLoading(target);
    setError(null);
    try {
      const result = await changePlanAction(workspaceId, tenantId, target);
      if (result.success && result.checkout) {
        await openSubscriptionCheckout(result.checkout);
      } else {
        setError(result.error ?? "Downgrade failed");
      }
    } finally {
      setLoading(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, tenantId]);

  const handleCancel = useCallback(async () => {
    if (!window.confirm("Cancel your subscription? Premium capabilities will be removed at the end of the period.")) return;
    setLoading("cancel");
    setError(null);
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
    setError(null);
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
    setError(null);
    try {
      const result = await retryPaymentAction(workspaceId, tenantId, planCode);
      if (result.success && result.checkout) {
        await openSubscriptionCheckout(result.checkout);
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
        <div role="alert" className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400" data-testid="billing-error">
          {error}
        </div>
      )}
      <nav className="mb-6 flex gap-1 border-b border-white/10 overflow-x-auto" aria-label="Billing sections" role="tablist">
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
                ? "border-s8ul-cyan text-s8ul-cyan"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
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
              {timeline.length > 0 && (
                <PageSection>
                  <div className="admin-card p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">Billing Timeline</h3>
                    <ol className="space-y-1.5 text-xs" data-testid="billing-timeline">
                      {timeline.map((e, i) => (
                        <li key={`${e.type}-${i}`} className="flex items-center justify-between text-zinc-400">
                          <span>{e.type}</span>
                          <span className="text-zinc-600">{new Date(e.createdAt).toLocaleString()}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </PageSection>
              )}
            </DashboardGridMain>
            <DashboardGridSide>
              <PageSection>
                <UsageDashboard usage={billingData.usage} />
              </PageSection>
              <PageSection>
                <div className="admin-card p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <button onClick={() => setActiveTab("plans")} className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 text-left">
                      Change Plan
                    </button>
                    <button onClick={() => setActiveTab("payment")} className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 text-left">
                      Manage Payment Methods
                    </button>
                    <button onClick={() => setActiveTab("invoices")} className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 text-left">
                      View All Invoices
                    </button>
                    <a href="/admin/settings" className="block rounded-lg bg-white/5 px-3 py-2 text-sm text-s8ul-cyan hover:bg-white/10">
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
