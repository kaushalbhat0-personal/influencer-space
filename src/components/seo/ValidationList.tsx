"use client";

import type { SEOValidationResult } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface ValidationListProps {
  results: SEOValidationResult[];
}

const ICONS = {
  error: XCircle,
  warning: AlertTriangle,
  info: CheckCircle,
};

const COLORS = {
  error: "text-red-400",
  warning: "text-amber-400",
  info: "text-emerald-400",
};

export function ValidationList({ results }: ValidationListProps) {
  if (results.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No validation results.</p>;
  }

  return (
    <div className="space-y-2">
      {results.map((result, i) => {
        const Icon = ICONS[result.severity];
        return (
          <div
            key={`${result.rule}-${i}`}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border p-3 text-sm",
              result.severity === "error" && "border-red-500/20 bg-red-500/5",
              result.severity === "warning" && "border-amber-500/20 bg-amber-500/5",
              result.severity === "info" && "border-emerald-500/20 bg-emerald-500/5",
            )}
          >
            <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", COLORS[result.severity])} />
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium", COLORS[result.severity])}>{result.message}</p>
              {result.recommendation && (
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{result.recommendation}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
