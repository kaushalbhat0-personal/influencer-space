"use client";

interface ChartSkeletonProps {
  rows?: number;
  className?: string;
}

export function ChartSkeleton({ rows = 4, className }: ChartSkeletonProps) {
  return (
    <div className={`admin-card p-5 ${className ?? ""}`} role="status" aria-label="Loading chart">
      <div className="h-4 w-24 rounded bg-white/5 animate-pulse mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 rounded bg-white/5 animate-pulse mb-2 last:mb-0" />
      ))}
      <span className="sr-only">Loading chart data...</span>
    </div>
  );
}
