"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Clock, X, Sparkles } from "lucide-react";
import type { Recommendation } from "../domain/types";
import { activeImpacts } from "../application/impact";
import {
  getTopRecommendation,
  dismissRecommendation,
  completeRecommendation,
} from "@/actions/recommendation.actions";

interface Props {
  initialRecommendation: Recommendation | null;
  total: number;
}

export function NextBestStepCard({ initialRecommendation, total }: Props) {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(initialRecommendation);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await getTopRecommendation();
    if (result.success) setRecommendation(result.data ?? null);
  }, []);

  if (!recommendation) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <p className="text-sm font-medium text-white">You&apos;re all caught up</p>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          No recommendations right now — your storefront is in great shape.
        </p>
      </div>
    );
  }

  const impacts = activeImpacts(recommendation.expectedImpact);

  const run = async (fn: () => Promise<{ success: boolean }>, key: string) => {
    if (busy) return;
    setBusy(true);
    setAction(key);
    try {
      const result = await fn();
      if (result.success) await refresh();
    } finally {
      setBusy(false);
      setAction(null);
    }
  };

  return (
    <div className="rounded-xl border border-s8ul-cyan/20 bg-s8ul-cyan/[0.04] p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-s8ul-cyan" />
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Today&apos;s Best Next Step
        </p>
        <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">
          {recommendation.categoryLabel} · {total} total
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold text-white">{recommendation.title}</p>
          <p className="mt-1 text-xs text-zinc-400">{recommendation.description}</p>

          {recommendation.reasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recommendation.reasons.slice(0, 3).map((reason) => (
                <span key={reason} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300">
            <Clock className="h-3.5 w-3.5 text-s8ul-cyan" />
            {recommendation.estimatedTime} min
          </span>
          <Link
            href={recommendation.actions.dashboard.href}
            className="inline-flex items-center gap-1.5 rounded-lg bg-s8ul-cyan px-3.5 py-2 text-xs font-semibold text-black hover:opacity-90 transition-opacity"
          >
            {recommendation.actions.dashboard.label}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {impacts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {impacts.map((impact) => (
            <span key={impact.id} className="rounded-lg border border-white/10 bg-zinc-900/60 px-2.5 py-1.5 text-xs">
              <span className="text-zinc-500">{impact.label}</span>{" "}
              <span className="font-semibold text-emerald-400">+{impact.delta}%</span>
            </span>
          ))}
          <span className="rounded-lg border border-white/10 bg-zinc-900/60 px-2.5 py-1.5 text-xs">
            <span className="text-zinc-500">Storefront</span>{" "}
            <span className="font-semibold text-emerald-400">+{recommendation.storefrontLift}%</span>
          </span>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3">
        <button
          onClick={() => run(() => completeRecommendation(recommendation.id), "complete")}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:border-emerald-500/40 hover:text-emerald-300 disabled:opacity-50 transition-colors"
        >
          <Check className="h-3 w-3" />
          {action === "complete" ? "Marking…" : "Mark done"}
        </button>
        <button
          onClick={() => run(() => dismissRecommendation(recommendation.id), "dismiss")}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:border-rose-500/40 hover:text-rose-300 disabled:opacity-50 transition-colors"
        >
          <X className="h-3 w-3" />
          {action === "dismiss" ? "Dismissing…" : "Not now"}
        </button>
        <span className="ml-auto text-[10px] text-zinc-600">Priority score {recommendation.score}</span>
      </div>
    </div>
  );
}
