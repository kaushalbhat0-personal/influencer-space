"use client";

import { cn } from "@/lib/utils";
import { MotionDiv } from "@/components/ui/MotionSafe";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export function Progress({ value, max = 100, className, showLabel = false }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="flex-1 h-1.5 rounded-full bg-[var(--surface-hover)] overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${Math.round(percentage)}% complete`}
      >
        <MotionDiv
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full bg-[var(--brand-primary)]"
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono text-[var(--text-muted)] tabular-nums min-w-[3ch] text-right">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
