"use client";

import { cn } from "@/lib/utils";
import { MotionDiv } from "@/components/ui/MotionSafe";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/Progress";

export interface DeploymentStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed";
  durationMs?: number;
  error?: string;
}

interface DeploymentCardProps {
  title?: string;
  subtitle?: string;
  steps: DeploymentStep[];
  elapsedSeconds?: number;
  className?: string;
}

export function DeploymentCard({
  title = "Deploying",
  subtitle,
  steps,
  elapsedSeconds,
  className,
}: DeploymentCardProps) {
  const completed = steps.filter((s) => s.status === "completed").length;
  const total = steps.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = completed === total;
  const hasFailed = steps.some((s) => s.status === "failed");

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 p-6",
        className
      )}
      role="status"
      aria-label={`${title}: ${completed} of ${total} complete`}
    >
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white">
          {allDone ? "✨ Complete!" : hasFailed ? "⚠️ Issues Detected" : `🚀 ${title}`}
        </h3>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>

      <Progress value={progress} className="mb-4" />

      <div className="space-y-1.5">
        {steps.map((step) => (
          <MotionDiv
            key={step.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              step.status === "completed" && "text-green-300",
              step.status === "running" && "bg-s8ul-cyan/10 text-s8ul-cyan",
              step.status === "failed" && "bg-red-500/10 text-red-300",
              step.status === "pending" && "text-zinc-600"
            )}
          >
            {step.status === "completed" && (
              <Check className="h-4 w-4 text-green-400 flex-shrink-0" aria-hidden="true" />
            )}
            {step.status === "running" && (
              <Loader2 className="h-4 w-4 text-s8ul-cyan animate-spin flex-shrink-0" aria-hidden="true" />
            )}
            {step.status === "failed" && (
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" aria-hidden="true" />
            )}
            {step.status === "pending" && (
              <span className="h-4 w-4 flex-shrink-0 rounded-full border border-zinc-700" aria-hidden="true" />
            )}
            <span
              className={cn(
                "flex-1",
                step.status === "completed" && "line-through text-green-400/60"
              )}
            >
              {step.label}
            </span>
            {step.durationMs && step.status === "completed" && (
              <span className="text-xs text-zinc-600 font-mono">{(step.durationMs / 1000).toFixed(1)}s</span>
            )}
            {step.status === "failed" && step.error && (
              <span className="text-xs text-red-400/70 max-w-[200px] truncate">{step.error}</span>
            )}
          </MotionDiv>
        ))}
      </div>

      {elapsedSeconds !== undefined && (
        <p className="mt-4 text-center text-xs text-zinc-600">
          Elapsed: {elapsedSeconds.toFixed(1)}s
        </p>
      )}
    </div>
  );
}
