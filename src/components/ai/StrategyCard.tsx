"use client";

import { cn } from "@/lib/utils";
import { MotionDiv } from "@/components/ui/MotionSafe";
import { Badge } from "@/components/ui/Badge";
import { forwardRef } from "react";

export interface StrategyOption {
  id: string;
  label: string;
  description: string;
  timeEstimate: string;
  recommended?: boolean;
  includes: string[];
  excludes: string[];
}

interface StrategyCardProps {
  option: StrategyOption;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
}

export const StrategyCard = forwardRef<HTMLButtonElement, StrategyCardProps>(
  function StrategyCard({ option, selected, disabled, onSelect, className }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={() => onSelect?.(option.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect?.(option.id);
          }
        }}
        className={cn(
          "w-full text-left rounded-xl border p-5 transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/50",
          selected
            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 shadow-[var(--shadow-card)]"
            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10",
          disabled && "opacity-40 cursor-not-allowed",
          className
        )}
        aria-pressed={selected}
        role="radio"
        aria-checked={selected}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
                  selected ? "border-[var(--brand-primary)]" : "border-zinc-600"
                )}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />}
              </span>
              <span
                className={cn(
                  "text-base font-semibold",
                  selected ? "text-[var(--brand-primary)]" : "text-white"
                )}
              >
                {option.label}
              </span>
              {option.recommended && (
                <Badge variant="cyan" size="sm">
                  Recommended
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{option.description}</p>

            {selected && (
              <MotionDiv
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.2 }}
                className="mt-4 overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                  <div>
                    <p className="text-xs font-medium text-green-400 mb-1">Includes</p>
                    {option.includes.map((item) => (
                      <p key={item} className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                        <span className="text-green-400">✓</span> {item}
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[var(--text-muted)] mb-1">Excludes</p>
                    {option.excludes.map((item) => (
                      <p key={item} className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <span className="text-[var(--text-muted)]">—</span> {item}
                      </p>
                    ))}
                  </div>
                </div>
              </MotionDiv>
            )}
          </div>

          <div className="flex-shrink-0 text-right">
            <span
              className={cn(
                "text-xs font-mono",
                selected ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"
              )}
            >
              {option.timeEstimate}
            </span>
          </div>
        </div>
      </button>
    );
  }
);
