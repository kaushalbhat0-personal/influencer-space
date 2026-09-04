"use client";

import type { CreatorAcquisitionAdapter } from "@/lib/acquisition/types";
import { Globe, ShieldCheck, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function StrategyCard({
  adapter,
  active,
  onClick,
}: {
  adapter: CreatorAcquisitionAdapter;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = adapter.icon || Globe;
  const needsReview = adapter.requiresManualReview;
  const isHighConfidence = adapter.typicalConfidence >= 70;
  const isMediumConfidence = adapter.typicalConfidence >= 40;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-all duration-200 w-full",
        active
          ? "border-[var(--brand-primary)]/50 bg-[var(--brand-primary)]/10 shadow-[0_0_20px_rgba(99,102,241,0.08)]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]",
      )}
      aria-pressed={active}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          active ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "bg-white/[0.04] text-zinc-500",
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white">{adapter.label}</span>
            {needsReview && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Review
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{adapter.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-zinc-600">
        <span className={cn(
          "inline-flex items-center gap-1",
          isHighConfidence && "text-emerald-400",
          isMediumConfidence && !isHighConfidence && "text-amber-400",
          !isMediumConfidence && "text-zinc-500",
        )}>
          <ShieldCheck className="h-3 w-3" />
          {adapter.typicalConfidence}% confidence
        </span>
        {isHighConfidence && (
          <span className="inline-flex items-center gap-1 text-[var(--brand-primary)]">
            <Sparkles className="h-3 w-3" />
            Recommended
          </span>
        )}
      </div>
    </button>
  );
}
