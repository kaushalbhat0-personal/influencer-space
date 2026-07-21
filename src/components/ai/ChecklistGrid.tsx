"use client";

import { cn } from "@/lib/utils";
import { MotionDiv } from "@/components/ui/MotionSafe";
import { Check, AlertTriangle, Info } from "lucide-react";

export interface ChecklistItem {
  id: string;
  label: string;
  status: "detected" | "missing" | "warning";
  category?: string;
}

interface ChecklistGridProps {
  items: ChecklistItem[];
  variant?: "grid" | "list";
  columns?: 1 | 2;
  className?: string;
  title?: string;
}

export function ChecklistGrid({
  items,
  variant = "grid",
  columns = 2,
  className,
  title,
}: ChecklistGridProps) {
  const detected = items.filter((i) => i.status === "detected");
  const missing = items.filter((i) => i.status === "missing");
  const warnings = items.filter((i) => i.status === "warning");

  const gridClass = cn(
    variant === "grid" && columns === 2 && "grid grid-cols-1 sm:grid-cols-2 gap-2",
    variant === "grid" && columns === 1 && "grid grid-cols-1 gap-2",
    variant === "list" && "flex flex-col gap-1.5"
  );

  return (
    <div className={cn("", className)}>
      <div className="mb-3 flex items-center gap-4 text-xs font-medium">
        <span className="flex items-center gap-1 text-green-400">
          <Check className="h-3 w-3" aria-hidden="true" /> {detected.length} detected
        </span>
        <span className="flex items-center gap-1 text-amber-400">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {warnings.length + missing.length} issues
        </span>
      </div>

      <div className={gridClass} role="list" aria-label={title ?? "Checklist"}>
        {items.map((item) => (
          <MotionDiv
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              item.status === "detected" && "bg-green-500/10 border border-green-500/20",
              item.status === "missing" && "bg-amber-500/10 border border-amber-500/20",
              item.status === "warning" && "bg-amber-500/5 border border-amber-500/10"
            )}
            role="listitem"
          >
            {item.status === "detected" && (
              <Check className="h-4 w-4 text-green-400 flex-shrink-0" aria-hidden="true" />
            )}
            {item.status === "missing" && (
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
            )}
            {item.status === "warning" && (
              <Info className="h-4 w-4 text-amber-500 flex-shrink-0" aria-hidden="true" />
            )}
            <span
              className={cn(
                item.status === "detected" && "text-green-300",
                item.status === "missing" && "text-amber-300",
                item.status === "warning" && "text-amber-400"
              )}
            >
              {item.label}
            </span>
          </MotionDiv>
        ))}
      </div>
    </div>
  );
}
