"use client";

interface ChartEmptyProps {
  message?: string;
  hint?: string;
  className?: string;
}

export function ChartEmpty({ message, hint, className }: ChartEmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 text-center ${className ?? ""}`} role="status">
      <p className="text-sm text-[var(--text-muted)]">{message || "No data available for this period."}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}
