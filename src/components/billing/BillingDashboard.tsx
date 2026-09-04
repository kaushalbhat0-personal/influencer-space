"use client";

import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { formatCurrency, formatDate, formatSubscriptionStatus } from "@/lib/billing";
import type { BillingDashboard as BillingDashboardData } from "@/lib/billing";
import { CreditCard, Package, ShoppingCart, Image, HardDrive } from "lucide-react";

interface BillingDashboardProps {
  data: BillingDashboardData;
  loading?: boolean;
  error?: string;
}

export function BillingDashboard({ data, loading, error }: BillingDashboardProps) {
  const statusInfo = formatSubscriptionStatus(data.subscription.status);
  // RCCF-33: truthful trial display — a TRIALING subscription shows its end
  // date only while the trial is actually active (server-derived), and shows
  // "Expired trial" once trialEndsAt has passed instead of a stale "Trialing".
  const statusLabel =
    data.subscription.status === "TRIALING"
      ? data.subscription.isTrialActive
        ? `Trial · ends ${formatDate(data.subscription.trialEndsAt)}`
        : "Expired trial"
      : statusInfo.label;

  const metricCards = [
    { label: "Products", value: data.activeProducts.toLocaleString(), icon: Package },
    { label: "Gallery", value: data.activeGallery.toLocaleString(), icon: Image },
    { label: "Orders", value: data.ordersProcessed.toLocaleString(), icon: ShoppingCart },
    { label: "Storage", value: `${data.storageUsed ?? 0} MB`, icon: HardDrive },
  ];

  return (
    <DashboardWidget
      title="Billing Overview"
      icon={CreditCard}
      description={`${data.plan.name} \u00b7 ${statusLabel}`}
      loading={loading}
      error={error}
      actions={
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>Renews {formatDate(data.subscription.renewsAt)}</span>
        </div>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {metricCards.map((card) => (
          <div key={card.label} className="rounded-lg bg-white/5 p-3 text-center">
            <card.icon className="h-4 w-4 text-[var(--text-secondary)] mx-auto mb-1" aria-hidden="true" />
            <p className="text-lg font-bold text-white">{card.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-white/5 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Plan Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Plan</p>
            <p className="text-white font-medium">{data.plan.name}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Price</p>
            <p className="text-white font-medium">{formatCurrency(data.plan.price, data.plan.currency)}<span className="text-xs text-[var(--text-muted)]">/{data.plan.cycle}</span></p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Status</p>
            <p className="text-white font-medium">{statusInfo.label}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Renewal</p>
            <p className="text-white font-medium">{formatDate(data.subscription.renewsAt) || "\u2014"}</p>
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
}
