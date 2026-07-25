"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import type { QuickStartStep } from "@/lib/dashboard/types";

interface QuickStartGuideProps {
  steps: QuickStartStep[];
}

export function QuickStartGuide({ steps }: QuickStartGuideProps) {
  const doneCount = steps.filter((s) => s.done).length;
  const totalMinutes = steps.filter((s) => !s.done).reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const allDone = doneCount === steps.length;

  return (
    <DashboardWidget
      title="Quick Start"
      actions={<span className="text-xs text-zinc-500">{doneCount}/{steps.length} · ~{totalMinutes} min remaining</span>}
    >
      {allDone ? (
        <p className="text-sm text-zinc-500">All setup steps complete!</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length}>
              <div
                className="h-full rounded-full bg-s8ul-cyan transition-all duration-500"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            {steps.map((step) => (
              <Link
                key={step.id}
                href={step.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  step.done ? "opacity-50" : "hover:bg-white/5"
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 text-zinc-600 shrink-0" aria-hidden="true" />
                )}
                <span className={cn("flex-1", step.done ? "text-zinc-600 line-through" : "text-zinc-300")}>
                  {step.label}
                </span>
                {!step.done && (
                  <span className="flex items-center gap-1 text-xs text-zinc-600">
                    {step.estimatedMinutes} min <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </DashboardWidget>
  );
}
