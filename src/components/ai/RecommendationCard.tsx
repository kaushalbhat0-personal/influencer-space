"use client";

import { cn } from "@/lib/utils";
import { Lightbulb, Clock } from "lucide-react";

interface RecommendationCardProps {
  message: string;
  estimatedMinutes?: number;
  priority?: "high" | "medium" | "low";
  action?: React.ReactNode;
  className?: string;
}

const PRIORITY_COLORS = {
  high: "border-amber-500/30 bg-amber-500/10",
  medium: "border-s8ul-cyan/30 bg-s8ul-cyan/5",
  low: "border-white/10 bg-white/5",
};

export function RecommendationCard({
  message,
  estimatedMinutes,
  priority = "medium",
  action,
  className,
}: RecommendationCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-3",
        PRIORITY_COLORS[priority],
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Lightbulb
          className={cn(
            "h-5 w-5 flex-shrink-0 mt-0.5",
            priority === "high" && "text-amber-400",
            priority === "medium" && "text-s8ul-cyan",
            priority === "low" && "text-zinc-400"
          )}
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="text-sm text-white">{message}</p>
          {estimatedMinutes !== undefined && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-zinc-500">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Estimated setup time: ~{estimatedMinutes} minute{estimatedMinutes !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex justify-end">{action}</div>}
    </div>
  );
}
