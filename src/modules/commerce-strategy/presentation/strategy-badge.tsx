// ── Commerce Strategy — Presentation ─────────────────────────
// RCCF-IMPLEMENTATION-73. Read-only strategy badge for the builder, dashboard
// and super-admin surfaces.

"use client";

import { cn } from "@/lib/utils";
import type { CommerceStrategyId, StrategyReadiness } from "../domain/types";

const STYLE: Record<CommerceStrategyId, { label: string; className: string }> = {
  PLATFORM_COLLECT: { label: "Platform Collect", className: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" },
  DIRECT_CREATOR: { label: "Direct Creator", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  MARKETPLACE: { label: "Marketplace", className: "bg-violet-500/10 text-violet-300 border-violet-500/20" },
  HYBRID: { label: "Hybrid", className: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
};

const READINESS_STYLE: Record<StrategyReadiness, string> = {
  ready: "text-emerald-400",
  incomplete: "text-amber-400",
  blocked: "text-red-400",
};

export function CommerceStrategyBadge({ strategy, readiness }: { strategy: CommerceStrategyId; readiness?: StrategyReadiness }) {
  const style = STYLE[strategy] ?? STYLE.PLATFORM_COLLECT;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium", style.className)}>
      {readiness && <span className={cn("h-1.5 w-1.5 rounded-full", readiness === "ready" ? "bg-emerald-400" : readiness === "incomplete" ? "bg-amber-400" : "bg-red-400")} />}
      {style.label}
    </span>
  );
}

export { READINESS_STYLE };
