"use client";

import Link from "next/link";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, formatSubscriptionStatus } from "@/lib/billing";
import type { BillingPlan, BillingSubscription } from "@/lib/billing";
import { RENEWAL_GRACE_DAYS } from "@/lib/billing/constants";
import { getGracePeriodEndDate } from "@/lib/billing/subscription-engine";
import { capabilityEngine } from "@/lib/capabilities/engine";
import { cn } from "@/lib/utils";
import { CreditCard, ArrowUp, ArrowDown, Check, X, AlertTriangle } from "lucide-react";

interface SubscriptionManagerProps {
  currentPlan: BillingPlan;
  subscription: BillingSubscription;
  availablePlans: BillingPlan[];
  onUpgrade: (planCode: string) => void;
  onDowngrade: (planCode: string) => void;
  onCancel: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  capabilities?: string[];
  loading?: boolean;
  error?: string;
}

function FeatureCheck({ included }: { included: boolean }) {
  return included
    ? <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
    : <X className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />;
}

const FEATURE_LABELS: Record<string, string> = {
  max_products: "Products",
  custom_domain: "Custom Domain",
  custom_branding: "Custom Branding",
  max_websites: "Websites",
  max_team_members: "Team Members",
  analytics_advanced: "Advanced Analytics",
  api_access: "API Access",
  priority_support: "Priority Support",
  ai_automation: "AI Automation",
  storage_mb: "Storage",
  max_clients: "Clients",
  white_label: "White Label",
  hero_video_enabled: "Hero Video",
};

function formatFeatureValue(val: number | boolean | string): string {
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return val === -1 ? "Unlimited" : String(val);
  return String(val);
}

export function SubscriptionManager({
  currentPlan, subscription, availablePlans,
  onUpgrade, onDowngrade, onCancel, onResume, onRetry, capabilities, loading, error,
}: SubscriptionManagerProps) {
  const statusInfo = formatSubscriptionStatus(subscription.status);

  // RCCF-BILLING-07B — derived grace/trial context (reuse canonical helpers, no new logic)
  const isPastDue = subscription.status === "PAST_DUE";
  const isExpired = subscription.status === "EXPIRED";
  const isCancelled = subscription.status === "CANCELLED";
  const renewsAtDate = subscription.renewsAt ? new Date(subscription.renewsAt) : null;
  const graceEndDate = isPastDue && renewsAtDate ? getGracePeriodEndDate(renewsAtDate, RENEWAL_GRACE_DAYS) : null;
  const remainingMs = graceEndDate ? graceEndDate.getTime() - Date.now() : null;
  const remainingDays = remainingMs !== null ? Math.ceil(remainingMs / (1000 * 60 * 60 * 24)) : null;

  const allFeatures = Array.from(
    new Set(availablePlans.flatMap((p) => Object.keys(p.features))),
  ).filter((f) => f !== "storage_gb"); // RCCF-59: creators render storage via storage_mb

  return (
    <DashboardWidget
      title="Subscription"
      icon={CreditCard}
      description={`${currentPlan.name} \u00b7 ${statusInfo.label}`}
      actions={
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      }
      loading={loading}
      error={error}
    >
      <div className="space-y-4">
        {/* RCCF-BILLING-07B — PAST_DUE grace transparency */}
        {isPastDue && (
          <div role="status" aria-live="polite" data-testid="submgr-past-due" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-red-300">Payment failed — Past Due</p>
                {graceEndDate ? (
                  <p className="mt-1 text-xs leading-relaxed text-red-200/80">
                    Your storefront stays live during the {RENEWAL_GRACE_DAYS}-day grace period until <span className="font-semibold text-red-200">{formatDate(graceEndDate.toISOString())}</span>
                    {remainingDays !== null && remainingDays > 0 ? ` — ${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining` : remainingDays === 0 ? " — expires today" : ""}. Successful payment restores Active instantly.
                  </p>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-red-200/80">
                    Your storefront stays live during the {RENEWAL_GRACE_DAYS}-day grace period. Successful payment during grace restores access; after grace your site returns 404.
                  </p>
                )}
                {onRetry && (
                  <Button size="sm" variant="default" onClick={onRetry} disabled={loading} aria-label="Retry payment" className="mt-3" data-testid="submgr-retry-cta">
                    Retry Payment
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RCCF-BILLING-07B — EXPIRED distinct from CANCELLED */}
        {isExpired && (
          <div role="status" aria-live="polite" data-testid="submgr-expired" className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-300">Storefront unavailable — Expired</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
                  Your public storefront is returning 404 — the {RENEWAL_GRACE_DAYS}-day Past Due grace has elapsed. This is different from Cancelled (you cancelled) — Expired means the renewal never recovered. Upgrade to Creator Grow to restore instantly. Preview still works via <code className="rounded bg-amber-500/20 px-1 py-0.5 text-[10px]">?preview=true</code>.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="default" onClick={() => onUpgrade("creator_grow")} disabled={loading} data-testid="submgr-upgrade-grow" aria-label="Upgrade to Creator Grow to restore storefront">
                    Upgrade to Creator Grow
                  </Button>
                  <Link href="/pricing" className="inline-flex items-center rounded-lg border border-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/10" data-testid="submgr-pricing-link">
                    View pricing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {isCancelled && (
          <div role="status" data-testid="submgr-cancelled" className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-medium text-zinc-300">Subscription cancelled</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">You cancelled this subscription. Use Resume to reactivate, or upgrade to a paid plan. Your storefront 404s until a paid plan is Active.</p>
          </div>
        )}

        <div className="rounded-lg bg-white/5 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[var(--text-muted)] text-xs">Plan</p>
              <p className="text-white font-semibold mt-0.5">{currentPlan.name}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-xs">Price</p>
              <p className="text-white font-semibold mt-0.5">{formatCurrency(currentPlan.price, currentPlan.currency)}<span className="text-xs text-[var(--text-muted)]">/{currentPlan.cycle}</span></p>
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-xs">Renewal</p>
              <p className="text-white font-semibold mt-0.5">{formatDate(subscription.renewsAt)}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-xs">Status</p>
              <p className="text-white font-semibold mt-0.5">{statusInfo.label}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="grid" aria-label="Plan comparison">
            <thead>
              <tr className="border-b border-white/10">
                <th scope="col" className="text-left py-2 px-2 text-xs text-[var(--text-muted)] font-medium">Feature</th>
                {availablePlans.map((plan) => (
                  <th key={plan.code} scope="col" className={cn("text-center py-2 px-2 text-xs font-medium", plan.code === currentPlan.code ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]")}>
                    {plan.name}
                    {plan.recommended && <Badge variant="cyan" size="sm" className="ml-1">Popular</Badge>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((feature) => (
                <tr key={feature} className="border-b border-white/5">
                  <td className="py-2 px-2 text-[var(--text-primary)] text-xs">{FEATURE_LABELS[feature] ?? feature}</td>
                  {availablePlans.map((plan) => {
                    const val = plan.features[feature];
                    const currentVal = currentPlan.features[feature];
                    const isBetter = typeof val === "number" && typeof currentVal === "number" && val > currentVal && currentVal !== -1;
                    return (
                      <td key={plan.code} className={cn("text-center py-2 px-2", isBetter && "text-emerald-400")}>
                        {typeof val === "boolean"
                          ? <FeatureCheck included={val} />
                          : feature === "storage_mb"
                            ? `${val} MB`
                            : formatFeatureValue(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {availablePlans.map((plan) => {
            const isCurrent = plan.code === currentPlan.code;
            if (isCurrent) {
              return (
                <span key={plan.code} className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]" aria-label={`Current plan: ${plan.name}`}>
                  ✓ Current — {plan.name}
                </span>
              );
            }
            // 06E/07C: Launch is a 15-day signup trial — not a downgrade target for paid creators.
            // Render as disabled informational state, not a hidden/misleading CTA.
            if (plan.code === "creator_launch" && currentPlan.code !== "creator_launch") {
              return (
                <span
                  key={plan.code}
                  data-testid="cta-launch-disabled"
                  aria-disabled="true"
                  title="Creator Launch is a 15-day free trial at signup — not a permanent free plan and not available as a downgrade. To leave a paid plan, cancel or contact support."
                  className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]"
                >
                  <span aria-hidden="true">⊘</span> Creator Launch — 15-day trial only
                </span>
              );
            }

            // RCCF-BILLING-07C — capability-only classification; price is never a fallback.
            const cmp = capabilityEngine.comparePlans(currentPlan.code, plan.code);
            const rev = capabilityEngine.comparePlans(plan.code, currentPlan.code);
            const hasTrueUpgrade = cmp ? (cmp.addedFeatures.length > 0 || cmp.upgradedLimits.some((l) => (l as {to:number;from:number}).to === -1 || ((l as {to:number;from:number}).from !== -1 && (l as {to:number;from:number}).to > (l as {to:number;from:number}).from))) : false;
            const hasTrueReverse = rev ? (rev.addedFeatures.length > 0 || rev.upgradedLimits.some((l) => (l as {to:number;from:number}).to === -1 || ((l as {to:number;from:number}).from !== -1 && (l as {to:number;from:number}).to > (l as {to:number;from:number}).from))) : false;
            const isUpgrade = hasTrueUpgrade;
            const isDowngrade = !isUpgrade && hasTrueReverse;
            const isNeutral = !isUpgrade && !isDowngrade;

            const label = isUpgrade ? `Upgrade to ${plan.name}` : isDowngrade ? `Downgrade to ${plan.name}` : `Switch to ${plan.name}`;
            const capDiff = cmp ? cmp.addedFeatures.length : 0;

            return (
              <Button
                key={plan.code}
                size="sm"
                variant={isUpgrade ? "default" : "outline"}
                onClick={() => {
                  if (isUpgrade) onUpgrade(plan.code);
                  else if (isDowngrade) onDowngrade(plan.code);
                  else onUpgrade(plan.code);
                }}
                disabled={loading}
                aria-label={`${isUpgrade ? "Upgrade" : isDowngrade ? "Downgrade" : "Switch"} to ${plan.name} plan — ${isUpgrade ? `${capDiff} new capabilities` : isDowngrade ? "fewer capabilities" : "capability-neutral switch"}`}
                title={isUpgrade ? `Unlock ${capDiff} new capabilities` : isDowngrade ? `Move to ${plan.name} — fewer capabilities` : label}
                data-testid={isUpgrade ? `cta-upgrade-${plan.code}` : isDowngrade ? `cta-downgrade-${plan.code}` : `cta-switch-${plan.code}`}
              >
                {isUpgrade ? <ArrowUp className="h-3.5 w-3.5 mr-1" /> : isDowngrade ? <ArrowDown className="h-3.5 w-3.5 mr-1" /> : null}
                {label}
              </Button>
            );
          })}
          {subscription.status !== "CANCELLED" && subscription.status !== "EXPIRED" && (
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={loading} className="text-red-400 hover:text-red-300" aria-label="Cancel subscription">
              Cancel Subscription
            </Button>
          )}
          {(subscription.status === "CANCELLED" || subscription.status === "PAST_DUE") && onResume && (
            <Button size="sm" variant="outline" onClick={onResume} disabled={loading} aria-label="Resume subscription">
              Resume Subscription
            </Button>
          )}
          {subscription.status === "PAST_DUE" && onRetry && (
            <Button size="sm" variant="default" onClick={onRetry} disabled={loading} aria-label="Retry payment">
              Retry Payment
            </Button>
          )}
        </div>

        {capabilities && capabilities.length > 0 && (
          <div className="rounded-lg bg-white/[0.03] p-4">
            <p className="text-xs text-[var(--text-secondary)] font-medium mb-2">Capabilities Granted</p>
            <div className="flex flex-wrap gap-1.5" data-testid="billing-capabilities">
              {capabilities.map((cap) => (
                <span key={cap} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-[var(--text-primary)]">
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardWidget>
  );
}
