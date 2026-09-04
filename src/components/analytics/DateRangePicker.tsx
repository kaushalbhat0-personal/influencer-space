"use client";

import { cn } from "@/lib/utils";
import { DATE_RANGE_PRESETS, type DatePreset } from "@/lib/analytics/date";

interface DateRangePickerProps {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap" role="radiogroup" aria-label="Date range">
      {DATE_RANGE_PRESETS.map((preset) => (
        <button
          key={preset.value}
          onClick={() => onChange(preset.value)}
          role="radio"
          aria-checked={value === preset.value}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            value === preset.value
              ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5",
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
