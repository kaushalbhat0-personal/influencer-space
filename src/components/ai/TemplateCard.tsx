"use client";

import { cn } from "@/lib/utils";
import { MotionDiv } from "@/components/ui/MotionSafe";
import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";

export interface TemplateCardProps {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  selected?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (id: string) => void;
  className?: string;
}

export const TemplateCard = forwardRef<HTMLButtonElement, TemplateCardProps>(
  function TemplateCard(
    { id, label, description, icon: Icon, selected, disabled, loading, onClick, className },
    ref
  ) {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        onClick={() => onClick?.(id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.(id);
          }
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200 text-center",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s8ul-cyan/50",
          selected
            ? "border-s8ul-cyan bg-s8ul-cyan/10 shadow-[0_0_20px_rgba(0,245,255,0.1)]"
            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10",
          disabled && "opacity-40 cursor-not-allowed",
          loading && "animate-pulse",
          className
        )}
        aria-pressed={selected}
        aria-label={`${label}: ${description}`}
      >
        <MotionDiv
          animate={selected ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.4 }}
          className={cn(
            "rounded-lg p-3 transition-colors",
            selected ? "bg-s8ul-cyan/20" : "bg-white/5"
          )}
        >
          {loading ? (
            <div className="h-6 w-6 rounded bg-white/10 animate-pulse" />
          ) : (
            <Icon
              className={cn("h-6 w-6", selected ? "text-s8ul-cyan" : "text-zinc-400")}
              aria-hidden="true"
            />
          )}
        </MotionDiv>
        <div>
          <p
            className={cn(
              "text-sm font-semibold",
              selected ? "text-s8ul-cyan" : "text-white"
            )}
          >
            {label}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{description}</p>
        </div>
      </button>
    );
  }
);
