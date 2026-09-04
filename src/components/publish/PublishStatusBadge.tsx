"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertTriangle, Loader2, Eye } from "lucide-react";

export type PublishStatusValue = "draft" | "preview" | "publishing" | "published" | "outdated" | "unavailable";

interface PublishStatusBadgeProps {
  status: PublishStatusValue;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<PublishStatusValue, {
  label: string;
  icon: typeof Clock;
  color: string;
  bg: string;
}> = {
  draft: { label: "Draft", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/20" },
  preview: { label: "Preview", icon: Eye, color: "text-blue-400", bg: "bg-blue-500/20" },
  publishing: { label: "Publishing", icon: Loader2, color: "text-[var(--brand-primary)]", bg: "bg-[var(--brand-primary)]/20" },
  published: { label: "Live", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/20" },
  outdated: { label: "Changes pending", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/20" },
  unavailable: { label: "Not published", icon: Clock, color: "text-zinc-500", bg: "bg-zinc-800" },
};

export function PublishStatusBadge({ status, size = "md", showLabel = true, className }: PublishStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unavailable;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        config.bg, config.color,
        sizeClasses[size],
        className,
      )}
    >
      <Icon className={cn(
        size === "sm" ? "h-2.5 w-2.5" : size === "md" ? "h-3 w-3" : "h-4 w-4",
        status === "publishing" && "animate-spin",
      )} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
