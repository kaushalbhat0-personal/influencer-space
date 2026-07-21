import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  trend?: { direction: "up" | "down"; value: string };
  loading?: boolean;
  className?: string;
}

export function MetricCard({ label, value, subtext, icon: Icon, trend, loading, className }: MetricCardProps) {
  if (loading) {
    return (
      <div className={cn("admin-card p-5", className)}>
        <div className="h-4 w-24 rounded bg-white/5 animate-pulse mb-2" />
        <div className="h-8 w-16 rounded bg-white/5 animate-pulse mb-1" />
        <div className="h-3 w-20 rounded bg-white/5 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("admin-card p-5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white tabular-nums font-display">{value}</p>
          {trend && (
            <p className={cn(
              "mt-1 text-xs font-medium flex items-center gap-0.5",
              trend.direction === "up" ? "text-green-400" : "text-red-400"
            )}>
              {trend.direction === "up" ? "↑" : "↓"} {trend.value}
            </p>
          )}
          {subtext && !trend && <p className="mt-1 text-xs text-zinc-500">{subtext}</p>}
        </div>
        {Icon && (
          <div className="flex-shrink-0 rounded-xl bg-s8ul-cyan/10 p-3">
            <Icon className="h-5 w-5 text-s8ul-cyan" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
