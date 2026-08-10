"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import type { GoalsRuntimePayload } from "@/actions/goals.actions";
import { getGoalsRuntime } from "@/actions/goals.actions";
import { GoalProfileEditor } from "./goal-profile-editor";
import { GoalAlignmentCard } from "./goal-alignment-card";

interface Props {
  initial: GoalsRuntimePayload;
}

export function GoalsSettingsPage({ initial }: Props) {
  const router = useRouter();
  const [payload, setPayload] = useState<GoalsRuntimePayload>(initial);

  const refresh = useCallback(async () => {
    const result = await getGoalsRuntime();
    if (result.success && result.data) setPayload(result.data);
    router.refresh();
  }, [router]);

  return (
    <FeaturePage
      title="Business Goals"
      description="Goals answer what you're trying to achieve. They guide your website order, navigation, Builder recommendations and dashboard — and compose with what we already know about you."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <GoalProfileEditor initial={payload} onSaved={refresh} />
        </div>
        <div className="lg:col-span-2">
          <div className="space-y-6">
            <GoalAlignmentCard alignment={payload.alignment} />

            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Recommended for you</p>
              <p className="mt-1 text-[11px] text-zinc-600">Determined from your profile and what you already have — no AI.</p>
              <div className="mt-3 space-y-2">
                {payload.recommendations.map((rec) => (
                  <div key={rec.goalId} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-200">{rec.goalId.replace(/_/g, " ")}</p>
                      <p className="mt-0.5 truncate text-[10px] text-zinc-500">{rec.reason}</p>
                    </div>
                    <span className="ml-3 text-xs font-semibold text-s8ul-cyan tabular-nums">{rec.weight}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Goal milestones</p>
              <p className="mt-1 text-[11px] text-zinc-600">Progress toward your primary goal.</p>
              <div className="mt-3 space-y-1.5">
                {payload.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${milestone.done ? "bg-emerald-500" : "bg-zinc-700"}`} />
                    <span className={`${milestone.done ? "text-zinc-500 line-through" : "text-zinc-300"}`}>{milestone.label}</span>
                  </div>
                ))}
                {payload.milestones.length === 0 && (
                  <p className="text-xs text-zinc-500">Select a goal to see its milestone path.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </FeaturePage>
  );
}
