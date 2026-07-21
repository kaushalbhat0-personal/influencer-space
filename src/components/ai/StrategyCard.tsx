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
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s8ul-cyan/50",
          selected
            ? "border-s8ul-cyan bg-s8ul-cyan/10 shadow-[0_0_20px_rgba(0,245,255,0.1)]"
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
                  selected ? "border-s8ul-cyan" : "border-zinc-600"
                )}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-s8ul-cyan" />}
              </span>
              <span
                className={cn(
                  "text-base font-semibold",
                  selected ? "text-s8ul-cyan" : "text-white"
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
            <p className="mt-1 text-sm text-zinc-400">{option.description}</p>

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
                      <p key={item} className="text-xs text-zinc-400 flex items-center gap-1">
                        <span className="text-green-400">✓</span> {item}
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-500 mb-1">Excludes</p>
                    {option.excludes.map((item) => (
                      <p key={item} className="text-xs text-zinc-600 flex items-center gap-1">
                        <span className="text-zinc-600">—</span> {item}
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
                selected ? "text-s8ul-cyan" : "text-zinc-500"
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
