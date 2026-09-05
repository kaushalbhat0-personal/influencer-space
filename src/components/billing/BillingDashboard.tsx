"use client";

import Link from "next/link";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { formatCurrency, formatDate, formatSubscriptionStatus } from "@/lib/billing";
import type { BillingDashboard as BillingDashboardData } from "@/lib/billing";
import { RENEWAL_GRACE_DAYS } from "@/lib/billing/constants";
import { getGracePeriodEndDate } from "@/lib/billing/subscription-engine";
import { CreditCard, Package, ShoppingCart, Image, HardDrive, AlertTriangle, Clock } from "lucide-react";

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
  const isTrialActive = data.subscription.status === "TRIALING" && !!data.subscription.isTrialActive;
  const statusLabel =
    data.subscription.status === "TRIALING"
      ? isTrialActive
        ? `Trial · ends ${formatDate(data.subscription.trialEndsAt)}`
        : "Expired trial"
      : statusInfo.label;

  // RCCF-BILLING-07B — derived grace/trial context (no fabrication: only when dates exist, reuse canonical helpers)
  const isPastDue = data.subscription.status === "PAST_DUE";
  const isExpired = data.subscription.status === "EXPIRED";
  const renewsAtDate = data.subscription.renewsAt ? new Date(data.subscription.renewsAt) : null;
  const graceEndDate = isPastDue && renewsAtDate ? getGracePeriodEndDate(renewsAtDate, RENEWAL_GRACE_DAYS) : null;
  const remainingMs = graceEndDate ? graceEndDate.getTime() - Date.now() : null;
  const remainingDays = remainingMs !== null ? Math.ceil(remainingMs / (1000 * 60 * 60 * 24)) : null;
  const isGraceActive = graceEndDate ? Date.now() <= graceEndDate.getTime() : false;

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
          <span>{isTrialActive && data.subscription.trialEndsAt ? `Trial ends ${formatDate(data.subscription.trialEndsAt)}` : `Renews ${formatDate(data.subscription.renewsAt)}`}</span>
        </div>
      }
    >
      {/* RCCF-BILLING-07B — PAST_DUE grace transparency (state only, no new logic) */}
      {isPastDue && (
        <div role="status" aria-live="polite" data-testid="billing-past-due-banner" className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-red-300">Payment failed — Past Due</p>
              {graceEndDate ? (
                <p className="mt-1 text-xs leading-relaxed text-red-200/80">
                  Your storefront is still live during the {RENEWAL_GRACE_DAYS}-day grace period until <span className="font-semibold text-red-200">{formatDate(graceEndDate.toISOString())}</span>
                  {remainingDays !== null && remainingDays > 0 ? ` · ${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining` : remainingDays === 0 ? " · expires today" : ""}. Successful payment during grace restores Active instantly.
                </p>
              ) : (
                <p className="mt-1 text-xs leading-relaxed text-red-200/80">
                  Your storefront is still live during the {RENEWAL_GRACE_DAYS}-day grace period. Successful payment restores Active instantly; after grace your site returns 404 until you upgrade.
                </p>
              )}
              <p className="mt-2 text-xs text-red-300/90">Retry Payment below — no duplicate charge.</p>
            </div>
          </div>
        </div>
      )}

      {/* RCCF-BILLING-07B — EXPIRED distinct from CANCELLED */}
      {isExpired && (
        <div role="status" aria-live="polite" data-testid="billing-expired-banner" className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-300">Storefront unavailable — Expired</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
                Your public storefront is returning 404 after the {RENEWAL_GRACE_DAYS}-day grace elapsed. Upgrade to Creator Grow to restore it instantly. You can still preview your draft via <code className="rounded bg-amber-500/20 px-1 py-0.5 text-[10px]">?preview=true</code> while signed in.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/pricing" className="inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-100" data-testid="billing-expired-pricing-link">
                  View pricing
                </Link>
                <Link href="#plans" onClick={(e) => { e.preventDefault(); document.getElementById("billing-tab-plans")?.click(); document.getElementById("billing-panel-plans")?.scrollIntoView({ behavior: "smooth" }); }} className="inline-flex items-center rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/15">
                  Upgrade to Grow
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RCCF-BILLING-07B — TRIAL contextual info (no fabricated dates) */}
      {isTrialActive && data.subscription.trialEndsAt && (
        <div data-testid="billing-trial-banner" className="mb-4 rounded-lg border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/10 p-3">
          <div className="flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-[var(--brand-primary)] mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              Creator Launch is a <span className="font-semibold text-white">15-day free trial</span> — ends {formatDate(data.subscription.trialEndsAt)}. No card required. Your site stays live; after expiry preview ends and you’ll upgrade to Grow/Scale to publish.
            </p>
          </div>
        </div>
      )}

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
            <p className="text-white font-medium">{isTrialActive ? formatDate(data.subscription.trialEndsAt) || "\u2014" : formatDate(data.subscription.renewsAt) || "\u2014"}</p>
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
}
