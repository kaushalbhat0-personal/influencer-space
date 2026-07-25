"use client";

import { useState, useCallback } from "react";
import { ContentContainer, PageSection, DashboardGrid, DashboardGridMain, DashboardGridSide } from "@/components/layout";
import { PageHeader } from "@/components/layout/PageHeader";
import { BillingDashboard } from "./BillingDashboard";
import { SubscriptionManager } from "./SubscriptionManager";
import { InvoiceCenter } from "./InvoiceCenter";
import { PaymentMethodManager } from "./PaymentMethodManager";
import { UsageDashboard } from "./UsageDashboard";
import type { BillingDashboard as BillingDashboardData, BillingPlan } from "@/lib/billing";

interface BillingPageClientProps {
  billingData: BillingDashboardData;
  availablePlans: BillingPlan[];
  upgradeUrl?: string;
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "plans", label: "Plans" },
  { key: "invoices", label: "Invoices" },
  { key: "payment", label: "Payment Methods" },
  { key: "usage", label: "Usage" },
] as const;

export function BillingPageClient({ billingData, availablePlans, upgradeUrl }: BillingPageClientProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const showNotification = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const handleUpgrade = useCallback(async (planCode: string) => {
    setLoading(planCode);
    try {
      if (upgradeUrl) {
        window.location.href = upgradeUrl;
      }
    } finally {
      setLoading(null);
    }
  }, [upgradeUrl]);

  const handleDowngrade = useCallback(async (planCode: string) => {
    setLoading(planCode);
    try {
      showNotification();
    } finally {
      setLoading(null);
    }
  }, [showNotification]);

  const handleCancel = useCallback(async () => {
    setLoading("cancel");
    try {
      showNotification();
    } finally {
      setLoading(null);
    }
  }, [showNotification]);

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
