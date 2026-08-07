"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, RefreshCw, Sparkles, X } from "lucide-react";
import type { EvolutionOpportunity } from "../domain/types";
import { getEvolutionFeed, applyEvolution, setEvolutionStatus } from "@/actions/evolution.actions";

export function BuilderEvolutionPanel() {
  const [opportunities, setOpportunities] = useState<EvolutionOpportunity[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const result = await getEvolutionFeed();
    if (result.success && result.data) setOpportunities(result.data.opportunities);
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (id: string, fn: () => Promise<{ success: boolean; error?: string }>) => {
    if (busy) return;
    setBusy(id);
    try {
      const result = await fn();
      if (result.success) await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-white/5 bg-zinc-900/50">
      <div className="flex items-center justify-between border-b border-white/5 px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 text-[9px] font-medium text-zinc-600 uppercase tracking-wider">
          <Sparkles className="h-3 w-3 text-amber-400" /> Website Evolution
        </span>
        <button onClick={load} className="rounded p-0.5 text-zinc-600 hover:text-zinc-400" title="Refresh">
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-2 p-2">
        {opportunities === null && <p className="px-1 py-2 text-[10px] text-zinc-500">Checking growth signals…</p>}
        {opportunities?.length === 0 && (
          <p className="px-1 py-2 text-[10px] text-zinc-500">Keep growing — improvements appear as you scale.</p>
        )}

        {opportunities?.map((opportunity) => (
          <div key={opportunity.id} className="rounded-md border border-amber-500/15 bg-amber-500/[0.04] p-2">
            <p className="text-[10px] font-medium text-zinc-200">{opportunity.title}</p>
            <p className="mt-0.5 text-[9px] text-zinc-500 leading-snug">{opportunity.reason}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-emerald-400">
                Health {opportunity.before.health} → {opportunity.after.health}
              </span>
              <button
                onClick={() => run(opportunity.id, () => applyEvolution(opportunity.id).then((r) => ({ success: r.success, error: r.error })))}
                disabled={busy === opportunity.id}
                className="ml-auto inline-flex items-center gap-1 rounded bg-amber-400 px-2 py-1 text-[9px] font-semibold text-black hover:opacity-90 disabled:opacity-50"
              >
                <Check className="h-3 w-3" /> Apply
              </button>
              <button
                onClick={() => run(opportunity.id, () => setEvolutionStatus(opportunity.id, "deferred"))}
                disabled={busy === opportunity.id}
                className="rounded border border-white/10 px-1.5 py-1 text-[9px] text-zinc-500 hover:text-white disabled:opacity-50"
              >
                Later
              </button>
              <button
                onClick={() => run(opportunity.id, () => setEvolutionStatus(opportunity.id, "rejected"))}
                disabled={busy === opportunity.id}
                className="rounded border border-white/10 px-1.5 py-1 text-[9px] text-zinc-500 hover:text-rose-300 disabled:opacity-50"
              >
                <X className="inline h-3 w-3" />
              </button>
            </div>
            <span className="mt-1 block text-[9px] text-zinc-600">{opportunity.change.summary}</span>
            {opportunity.change.href && (
              <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] text-s8ul-cyan">
                Open {opportunity.change.href} <ArrowUpRight className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
