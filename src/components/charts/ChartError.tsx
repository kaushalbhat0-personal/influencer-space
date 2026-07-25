"use client";

interface ChartErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function ChartError({ message = "Failed to load chart data", onRetry }: ChartErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center" role="alert">
      <p className="text-sm text-red-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-xs text-s8ul-cyan hover:underline focus:outline-none focus:ring-2 focus:ring-s8ul-cyan/50 rounded px-2 py-1">
          Try Again
        </button>
      )}
    </div>
  );
}
