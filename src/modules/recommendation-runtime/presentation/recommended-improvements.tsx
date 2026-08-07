"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, X } from "lucide-react";
import type { Recommendation } from "../domain/types";
import { activeImpacts } from "../application/impact";
import { groupByCategory } from "../application/categories";
import {
  getRecommendations,
  dismissRecommendation,
  completeRecommendation,
} from "@/actions/recommendation.actions";

interface Props {
  initial: Recommendation[];
}

export function RecommendedImprovements({ initial }: Props) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await getRecommendations();
    if (result.success) setRecommendations(result.data ?? []);
  }, []);

  const run = async (id: string, fn: () => Promise<{ success: boolean }>) => {
    if (busy) return;
    setBusy(id);
    try {
      const result = await fn();
      if (result.success) await refresh();
    } finally {
      setBusy(null);
    }
  };

  const groups = groupByCategory(recommendations);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-400">
        No improvements needed — your profile is premium-ready.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recommended improvements</p>
        <span className="text-xs text-zinc-600">{recommendations.length} ordered by impact</span>
      </div>
      <p className="mt-0.5 text-[11px] text-zinc-600">
        The highest-impact actions for your business, computed from your profile, goals and storefront.
      </p>

      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.category}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((recommendation) => {
                const impacts = activeImpacts(recommendation.expectedImpact);
                return (
                  <div
                    key={recommendation.id}
                    className="group rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{recommendation.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{recommendation.description}</p>
                        {recommendation.reasons.length > 0 && (
                          <p className="mt-1 text-[10px] text-zinc-600">{recommendation.reasons[0]}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => run(recommendation.id, () => completeRecommendation(recommendation.id))}
                          disabled={busy === recommendation.id}
                          className="rounded p-1 text-zinc-600 hover:text-emerald-400 disabled:opacity-40"
                          title="Mark done"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => run(recommendation.id, () => dismissRecommendation(recommendation.id))}
                          disabled={busy === recommendation.id}
                          className="rounded p-1 text-zinc-600 hover:text-rose-400 disabled:opacity-40"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {impacts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {impacts.slice(0, 4).map((impact) => (
                          <span key={impact.id} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">
                            {impact.label} <span className="font-semibold text-emerald-400">+{impact.delta}%</span>
                          </span>
                        ))}
                        <Link
                          href={recommendation.actions.dashboard.href}
                          className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-s8ul-cyan opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          Open <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
