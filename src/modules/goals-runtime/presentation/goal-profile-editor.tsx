"use client";

import { useCallback, useMemo, useState } from "react";
import { Sparkles, Loader2, Target, Trash2 } from "lucide-react";
import { GOAL_REGISTRY } from "../domain/registry";
import type { GoalId } from "../domain/types";
import type { GoalsRuntimePayload } from "@/actions/goals.actions";
import { saveGoalProfile, applyRecommendedGoals, clearGoalProfile } from "@/actions/goals.actions";
import { goalIcon } from "./goal-icons";

interface Props {
  initial: GoalsRuntimePayload;
  onSaved: () => void;
}

/**
 * Business Goals editor (Phase 12). Goals are a WEIGHTED profile — primary =
 * highest weight — so a creator can evolve (coaching-first → products-first)
 * by adjusting weights, never by replacing the goal model.
 */
export function GoalProfileEditor({ initial, onSaved }: Props) {
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const goal of GOAL_REGISTRY) map[goal.id] = 0;
    for (const weight of initial.profile?.weights ?? []) map[weight.goalId] = weight.weight;
    return map;
  });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => Object.values(weights).reduce((sum, w) => sum + w, 0), [weights]);
  const activeCount = useMemo(() => Object.values(weights).filter((w) => w > 0).length, [weights]);

  const setWeight = useCallback((goalId: string, weight: number) => {
    setWeights((prev) => ({ ...prev, [goalId]: Math.max(0, Math.min(100, weight)) }));
  }, []);

  const refresh = useCallback(async () => {
    onSaved();
  }, [onSaved]);

  const persist = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      if (!result.success) setError(result.error ?? "Could not save.");
      else {
        setNotice("Saved — your storefront, Builder and dashboard now adapt to these goals.");
        refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    const goals = GOAL_REGISTRY
      .filter((g) => weights[g.id] > 0)
      .map((g) => ({ goalId: g.id as GoalId, weight: weights[g.id] }));
    if (goals.length === 0) {
      setError("Select at least one goal.");
      return;
    }
    void persist(() => saveGoalProfile({ weights: goals, source: "manual" }));
  };

  const recommend = () => {
    void persist(async () => {
      const result = await applyRecommendedGoals();
      if (result.success && result.data) {
        setWeights((prev) => {
          const next = { ...prev };
          for (const g of GOAL_REGISTRY) next[g.id] = 0;
          for (const r of result.data!.activeProfile.weights) next[r.goalId] = r.weight;
          return next;
        });
      }
      return { success: result.success, error: result.error };
    });
  };

  const clear = () => {
    void persist(async () => {
      const result = await clearGoalProfile();
      if (result.success) {
        setWeights((prev) => {
          const next = { ...prev };
          for (const g of GOAL_REGISTRY) next[g.id] = 0;
          return next;
        });
      }
      return { success: result.success, error: result.error };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        <div>
          <p className="text-sm font-medium text-white">How should goals work?</p>
          <p className="mt-1 text-xs text-zinc-500">
            Goals are a weighted profile — the highest weight is your primary goal. Adjust weights as your business evolves; the runtime re-orders your site, Builder hints and dashboard automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={recommend}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:border-s8ul-cyan/40 hover:text-white transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-s8ul-cyan" />
            Use recommendations
          </button>
          <button
            onClick={clear}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:border-rose-500/40 hover:text-rose-300 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {GOAL_REGISTRY.map((goal) => {
          const Icon = goalIcon(goal.icon);
          const active = weights[goal.id] > 0;
          return (
            <div
              key={goal.id}
              className={`rounded-xl border p-4 transition-colors ${active ? "border-s8ul-cyan/40 bg-s8ul-cyan/[0.04]" : "border-white/10 bg-zinc-900/50"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-1.5 ${active ? "bg-s8ul-cyan/15" : "bg-white/5"}`}>
                  <Icon className={`h-4 w-4 ${active ? "text-s8ul-cyan" : "text-zinc-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">{goal.label}</p>
                    <span className="text-[10px] text-zinc-600 uppercase">{goal.category}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{goal.description}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setWeight(goal.id, active ? 0 : 50)}
                  className={`h-5 w-9 rounded-full transition-colors ${active ? "bg-s8ul-cyan" : "bg-zinc-700"}`}
                  aria-pressed={active}
                >
                  <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                {active && (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={weights[goal.id]}
                      onChange={(e) => setWeight(goal.id, Number(e.target.value))}
                      className="flex-1 accent-[#00e5ff]"
                    />
                    <span className="w-10 text-right text-xs font-semibold text-s8ul-cyan tabular-nums">
                      {weights[goal.id]}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-s8ul-cyan" />
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Weight distribution</p>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            {activeCount} active goal{activeCount === 1 ? "" : "s"} · {total}/100 allocated {total > 100 ? "— over the limit" : ""}
          </p>
          <div className="mt-2 h-1.5 w-56 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all ${total > 100 ? "bg-rose-500" : "bg-gradient-to-r from-s8ul-cyan to-emerald-400"}`}
              style={{ width: `${Math.min(100, total)}%` }}
            />
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving || total > 100 || total === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-s8ul-cyan px-5 py-2 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save business goals
        </button>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}
      {notice && <p className="text-xs text-emerald-400">{notice}</p>}
    </div>
  );
}
