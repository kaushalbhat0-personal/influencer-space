import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface MetricCardTrend {
  direction: "up" | "down" | "neutral";
  value: string;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  trend?: MetricCardTrend;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  children?: ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  loading,
  error,
  empty,
  emptyMessage,
  children,
  className,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className={cn("admin-card p-5", className)} role="status" aria-label={`Loading ${label}`}>
        <div className="h-4 w-24 rounded bg-[var(--surface-hover)] animate-pulse mb-2" />
        <div className="h-8 w-16 rounded bg-[var(--surface-hover)] animate-pulse mb-1" />
        <div className="h-3 w-20 rounded bg-[var(--surface-hover)] animate-pulse" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("admin-card p-5", className)} role="alert">
        <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
        <p className="mt-1 text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className={cn("admin-card p-5", className)}>
        <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{emptyMessage ?? "No data"}</p>
      </div>
    );
  }

  if (children) {
    return (
      <div className={cn("admin-card p-5 transition-colors hover:bg-[var(--surface-hover)]", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("admin-card p-5 transition-colors hover:bg-[var(--surface-hover)]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-muted)]">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)] tabular-nums font-display">{value}</p>
          {trend && (
            <p className={cn(
              "mt-1 text-xs font-medium flex items-center gap-0.5",
              trend.direction === "up" && "text-green-400",
              trend.direction === "down" && "text-red-400",
              trend.direction === "neutral" && "text-[var(--text-muted)]",
            )}>
              {trend.direction === "up" && "↑"}
              {trend.direction === "down" && "↓"}
              {trend.direction === "neutral" && "→"}
              {" "}{trend.value}
            </p>
          )}
          {subtext && !trend && <p className="mt-1 text-xs text-[var(--text-muted)]">{subtext}</p>}
        </div>
        {Icon && (
          <div className="flex-shrink-0 rounded-xl bg-s8ul-cyan/10 p-3" aria-hidden="true">
            <Icon className="h-5 w-5 text-s8ul-cyan" />
          </div>
        )}
      </div>
    </div>
  );
}
