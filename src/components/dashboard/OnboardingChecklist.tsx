"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";

export interface ChecklistStep {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
  estimatedMinutes: number;
}

interface OnboardingChecklistProps {
  steps: ChecklistStep[];
  creatorName?: string;
  className?: string;
}

export function OnboardingChecklist({ steps, creatorName, className }: OnboardingChecklistProps) {
  const completedCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allDone = completedCount === totalCount;

  if (allDone) return null;

  return (
    <div className={cn("rounded-xl border border-white/10 bg-white/[0.03] p-5", className)}>
      <div className="flex items-start gap-3 mb-4">
        <div className="rounded-full bg-[var(--surface-hover)] p-2 shrink-0">
          <Sparkles className="h-5 w-5 text-[var(--brand-primary)]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">
            {creatorName ? `${creatorName}, finish setting up your store` : "Finish setting up your store"}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {completedCount} of {totalCount} tasks complete
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-[var(--text-secondary)]">{percentComplete}%</span>
          <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all group",
              step.done ? "opacity-50" : "hover:bg-white/5",
            )}
          >
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-[var(--text-muted)] shrink-0 group-hover:text-[var(--text-secondary)]" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm truncate",
                step.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)] group-hover:text-[var(--text-primary)]",
              )}>
                {step.label}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{step.description}</p>
            </div>
            {!step.done && (
              <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0 group-hover:text-[var(--brand-primary)]" />
            )}
            <span className="text-[10px] text-[var(--text-muted)] shrink-0">{step.estimatedMinutes} min</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
