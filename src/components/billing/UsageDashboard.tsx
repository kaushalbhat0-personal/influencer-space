"use client";

import { DashboardWidget } from "@/components/ui/DashboardWidget";
import type { UsageQuota } from "@/lib/billing";
import { getUsagePercentage, getUsageStatus, formatUsageDisplay, getMetricsOverLimit, getMetricsAtWarning } from "@/lib/billing";
import { cn } from "@/lib/utils";
import { Package, Image, HardDrive, ShoppingCart, MessageSquare, AlertTriangle } from "lucide-react";

interface UsageDashboardProps {
  usage: UsageQuota[];
  loading?: boolean;
  error?: string;
}

const METRIC_ICONS: Record<string, React.ElementType> = {
  products: Package,
  gallery: Image,
  storage: HardDrive,
  orders: ShoppingCart,
  messages: MessageSquare,
};

function UsageBar({ used, limit, label, unit }: UsageQuota) {
  const percentage = getUsagePercentage(used, limit);
  const status = getUsageStatus(used, limit);
  const displayText = formatUsageDisplay(used, limit, unit);

  const barColor = status === "over_limit" ? "bg-red-500"
    : status === "warning" ? "bg-amber-500"
    : "bg-s8ul-cyan";

  const textColor = status === "over_limit" ? "text-red-400"
    : status === "warning" ? "text-amber-400"
    : "text-[var(--text-muted)]";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className={cn("text-xs", textColor)}>{displayText}</span>
      </div>
      {(limit !== Infinity && limit !== -1) && (
        <div
          className="h-2 rounded-full bg-[var(--surface-hover)] overflow-hidden"
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuetext={`${label}: ${used} of ${limit} ${unit} used`}
          aria-label={`${label} usage`}
        >
          <div
            className={cn("h-full rounded-full transition-all duration-500", barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function UsageDashboard({ usage, loading, error }: UsageDashboardProps) {
  if (usage.length === 0 && !loading && !error) {
    return <DashboardWidget title="Usage" icon={Package} empty emptyMessage="No usage data available yet."><></></DashboardWidget>;
  }

  const overLimitMetrics = getMetricsOverLimit(usage);
  const warningMetrics = getMetricsAtWarning(usage);
  const hasAlerts = overLimitMetrics.length > 0 || warningMetrics.length > 0;

  return (
    <DashboardWidget title="Usage & Quotas" icon={Package} description="Monthly usage across your workspace" loading={loading} error={error}>
      <div className="space-y-4" role="list" aria-label="Usage metrics">
        {usage.map((item) => {
          const Icon = METRIC_ICONS[item.metric] ?? Package;
          return (
            <div key={item.metric} className="flex items-start gap-3" role="listitem">
              <div className="rounded-lg bg-[var(--surface-hover)] p-2 border border-[var(--border)]">
                <Icon className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <UsageBar {...item} />
              </div>
            </div>
          );
        })}
      </div>
      {hasAlerts && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300" role="alert">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <div>
            <p>You are approaching or exceeding usage limits.</p>
            {overLimitMetrics.length > 0 && (
              <ul className="mt-1 list-disc list-inside">
                {overLimitMetrics.map((m) => (
                  <li key={m.metric}>{m.label}: {m.used} / {m.limit} {m.unit} (over limit)</li>
                ))}
              </ul>
            )}
            <p className="mt-1">Consider upgrading your plan to avoid disruptions.</p>
          </div>
        </div>
      )}
    </DashboardWidget>
  );
}
