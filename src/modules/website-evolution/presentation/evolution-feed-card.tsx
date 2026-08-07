"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Clock, Sparkles, X } from "lucide-react";
import type { EvolutionOpportunity } from "../domain/types";
import { applyEvolution, setEvolutionStatus } from "@/actions/evolution.actions";

interface Props {
  initial: EvolutionOpportunity[];
}

export function EvolutionFeedCard({ initial }: Props) {
  const [opportunities, setOpportunities] = useState<EvolutionOpportunity[]>(initial);
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    const { getEvolutionFeed } = await import("@/actions/evolution.actions");
    const result = await getEvolutionFeed();
    if (result.success && result.data) setOpportunities(result.data.opportunities);
  };

  const run = async (id: string, fn: () => Promise<{ success: boolean; error?: string }>, onApplied?: string) => {
    if (busy) return;
    setBusy(id);
    try {
      const result = await fn();
      if (result.success) {
        if (onApplied) setApplied((prev) => ({ ...prev, [id]: onApplied }));
        await refresh();
      }
    } finally {
      setBusy(null);
    }
  };

  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Website Evolution</p>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Keep growing — as your business scales, new website improvements will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Website Evolution</p>
        </div>
        <span className="text-[10px] text-zinc-600">ordered by ROI</span>
      </div>

      <div className="mt-4 space-y-2">
        {opportunities.slice(0, 3).map((opportunity) => (
          <div key={opportunity.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{opportunity.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{opportunity.reason}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-[10px] text-zinc-500">
                <Clock className="h-3 w-3" /> {opportunity.estimatedEffort}m
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <LiftChip label="Health" before={opportunity.before.health} after={opportunity.after.health} />
              <LiftChip label="Conversion" before={opportunity.before.conversion} after={opportunity.after.conversion} />
              <LiftChip label="Trust" before={opportunity.before.trust} after={opportunity.after.trust} />
            </div>

            {applied[opportunity.id] ? (
              <Link
                href={opportunity.change.href}
                className="mt-3 flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
              >
                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> {applied[opportunity.id]}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => run(opportunity.id, () => applyEvolution(opportunity.id).then((r) => ({ success: r.success, error: r.error })), opportunity.change.summary)}
                  disabled={busy === opportunity.id}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1.5 text-[11px] font-semibold text-black hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" /> Apply
                </button>
                <button
                  onClick={() => run(opportunity.id, () => setEvolutionStatus(opportunity.id, "rejected"))}
                  disabled={busy === opportunity.id}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:border-rose-500/40 hover:text-rose-300 disabled:opacity-50"
                >
                  <X className="inline h-3 w-3" /> Reject
                </button>
                <button
                  onClick={() => run(opportunity.id, () => setEvolutionStatus(opportunity.id, "deferred"))}
                  disabled={busy === opportunity.id}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-500 hover:border-white/25 hover:text-white disabled:opacity-50"
                >
                  Later
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LiftChip({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before;
  return (
    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
      {label} <b className="text-zinc-300">{before}%</b>
      <span className="text-emerald-400"> → {after}%</span>
      {delta > 0 && <span className="text-emerald-400"> (+{delta})</span>}
    </span>
  );
}
