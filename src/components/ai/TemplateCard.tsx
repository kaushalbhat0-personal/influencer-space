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
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/50",
          selected
            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 shadow-[var(--shadow-card)]"
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
            selected ? "bg-[var(--brand-primary)]/20" : "bg-white/5"
          )}
        >
          {loading ? (
            <div className="h-6 w-6 rounded bg-white/10 animate-pulse" />
          ) : (
            <Icon
              className={cn("h-6 w-6", selected ? "text-[var(--brand-primary)]" : "text-zinc-400")}
              aria-hidden="true"
            />
          )}
        </MotionDiv>
        <div>
          <p
            className={cn(
              "text-sm font-semibold",
              selected ? "text-[var(--brand-primary)]" : "text-white"
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
