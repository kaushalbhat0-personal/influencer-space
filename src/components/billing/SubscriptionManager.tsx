"use client";

import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, formatSubscriptionStatus, getUpgradePath } from "@/lib/billing";
import type { BillingPlan, BillingSubscription } from "@/lib/billing";
import { cn } from "@/lib/utils";
import { CreditCard, ArrowUp, ArrowDown, Check, X } from "lucide-react";

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
    : <X className="h-4 w-4 text-zinc-600" aria-hidden="true" />;
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
        <div className="rounded-lg bg-white/5 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-zinc-500 text-xs">Plan</p>
              <p className="text-white font-semibold mt-0.5">{currentPlan.name}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Price</p>
              <p className="text-white font-semibold mt-0.5">{formatCurrency(currentPlan.price, currentPlan.currency)}<span className="text-xs text-zinc-500">/{currentPlan.cycle}</span></p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Renewal</p>
              <p className="text-white font-semibold mt-0.5">{formatDate(subscription.renewsAt)}</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs">Status</p>
              <p className="text-white font-semibold mt-0.5">{statusInfo.label}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="grid" aria-label="Plan comparison">
            <thead>
              <tr className="border-b border-white/10">
                <th scope="col" className="text-left py-2 px-2 text-xs text-zinc-500 font-medium">Feature</th>
                {availablePlans.map((plan) => (
                  <th key={plan.code} scope="col" className={cn("text-center py-2 px-2 text-xs font-medium", plan.code === currentPlan.code ? "text-s8ul-cyan" : "text-zinc-500")}>
                    {plan.name}
                    {plan.recommended && <Badge variant="cyan" size="sm" className="ml-1">Popular</Badge>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((feature) => (
                <tr key={feature} className="border-b border-white/5">
                  <td className="py-2 px-2 text-zinc-300 text-xs">{FEATURE_LABELS[feature] ?? feature}</td>
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
            if (isCurrent) return null;

            const upgradePath = getUpgradePath(currentPlan.code);
            const isUpgrade = upgradePath.includes(plan.code);

            return (
              <Button
                key={plan.code}
                size="sm"
                variant={isUpgrade ? "default" : "outline"}
                onClick={() => isUpgrade ? onUpgrade(plan.code) : onDowngrade(plan.code)}
                disabled={loading}
                aria-label={`${isUpgrade ? "Upgrade" : "Downgrade"} to ${plan.name} plan`}
              >
                {isUpgrade ? <ArrowUp className="h-3.5 w-3.5 mr-1" /> : <ArrowDown className="h-3.5 w-3.5 mr-1" />}
                {isUpgrade ? `Upgrade to ${plan.name}` : `Downgrade to ${plan.name}`}
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
            <p className="text-xs text-zinc-400 font-medium mb-2">Capabilities Granted</p>
            <div className="flex flex-wrap gap-1.5" data-testid="billing-capabilities">
              {capabilities.map((cap) => (
                <span key={cap} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300">
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
