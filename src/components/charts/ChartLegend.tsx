"use client";

interface ChartLegendItem {
  label: string;
  color: string;
  value?: string | number;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
  className?: string;
}

export function ChartLegend({ items, className }: ChartLegendProps) {
  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-3 ${className ?? ""}`} role="list" aria-label="Chart legend">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-xs" role="listitem">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span className="text-[var(--text-secondary)]">{item.label}</span>
          {item.value !== undefined && (
            <span className="text-[var(--text-primary)] font-medium tabular-nums">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export type { ChartLegendItem };
