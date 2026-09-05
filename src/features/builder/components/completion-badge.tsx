"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  /** WebsiteHealthEngine overallScore (0-100). Null means still loading — shows skeleton, never 0% flash. */
  pct?: number | null;
  /** Canonical alias — prefer healthScore. Kept for backward compat. */
  healthScore?: number | null;
  large?: boolean;
  /** When true, renders a non-zero skeleton instead of 0% while async health resolves. */
  isLoading?: boolean;
}

export function CompletionBadge({ pct, healthScore, large, isLoading }: Props) {
  const raw = healthScore ?? pct ?? null;
  const loading = isLoading ?? raw === null;
  // Health, not builder completion — never fabricate or animate to 100.
  const score = raw ?? 0;

  if (loading) {
    return (
      <span
        role="status"
        aria-busy="true"
        aria-label="Loading health score"
        data-testid="health-badge-loading"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/50 shrink-0 animate-pulse",
          large ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]",
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
        <span className="h-3 w-16 rounded bg-zinc-700" aria-hidden="true" />
        <span className="sr-only">Loading health</span>
      </span>
    );
  }

  const color = score >= 80 ? "text-emerald-400 border-emerald-500/30" : score >= 50 ? "text-amber-400 border-amber-500/30" : "text-zinc-500 border-zinc-700";

  return (
    <Link
      href="/admin/dashboard"
      data-testid={large ? "health-badge-large" : "health-badge"}
      aria-label={`Health ${score} percent — view dashboard health`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium hover:opacity-80 transition-opacity shrink-0",
        large ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]",
        color,
      )}
      title="View dashboard health"
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-zinc-600")} />
      Health {score}%
    </Link>
  );
}

// Backward compat alias
export const HealthBadge = CompletionBadge;
