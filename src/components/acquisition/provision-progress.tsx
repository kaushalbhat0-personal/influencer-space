"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStage {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
}

export function ProvisionProgress({
  stages,
  currentLabel,
}: {
  stages: ProgressStage[];
  currentLabel?: string;
}) {
  const completed = stages.filter((s) => s.status === "completed").length;
  const total = stages.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Creating Your Storefront</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {currentLabel || `${percent}% complete`}
        </p>
      </div>

      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="space-y-1">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3 transition-all",
              stage.status === "completed" && "text-zinc-300",
              stage.status === "running" && "bg-white/[0.03]",
              stage.status === "failed" && "bg-red-500/5",
            )}
          >
            {stage.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : stage.status === "running" ? (
              <Loader2 className="h-4 w-4 text-[var(--brand-primary)] animate-spin shrink-0" />
            ) : stage.status === "failed" ? (
              <span className="h-4 w-4 rounded-full bg-red-500/20 shrink-0" />
            ) : (
              <span className="h-4 w-4 rounded-full border border-zinc-700 shrink-0" />
            )}
            <span className="text-sm">{stage.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
