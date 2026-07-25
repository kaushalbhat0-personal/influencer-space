import { cn } from "@/lib/utils";
import type { WidgetProps } from "@/lib/dashboard/types";

export function DashboardWidgetSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("admin-card p-5", className)} role="status" aria-label="Loading">
      <div className="h-4 w-24 rounded bg-white/5 animate-pulse mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 rounded bg-white/5 animate-pulse mb-2 last:mb-0" />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function DashboardWidgetError({ message = "Something went wrong", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="admin-card p-6 text-center" role="alert">
      <p className="text-sm font-semibold text-white">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="admin-btn-outline mt-4 text-xs">
          Try Again
        </button>
      )}
    </div>
  );
}

export function DashboardWidgetEmpty({ message = "No data yet.", actions }: { message?: string; actions?: React.ReactNode }) {
  return (
    <div className="admin-card p-6 text-center">
      <p className="text-sm text-zinc-500">{message}</p>
      {actions && <div className="mt-3">{actions}</div>}
    </div>
  );
}

export function DashboardWidget({
  title,
  description,
  icon: Icon,
  actions,
  loading,
  error,
  empty,
  emptyMessage,
  footer,
  children,
  variant = "default",
  className,
}: WidgetProps) {
  if (loading) return <DashboardWidgetSkeleton rows={variant === "compact" ? 2 : 3} />;
  if (error) return <DashboardWidgetError message={error} />;
  if (empty) return <DashboardWidgetEmpty message={emptyMessage} />;

  return (
    <div className={cn("admin-card", variant === "compact" ? "p-4" : "p-5", className)}>
      {(title || actions) && (
        <div className={cn("flex items-center justify-between", description ? "mb-2" : "mb-4")}>
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="rounded-lg bg-s8ul-cyan/10 p-1.5">
                <Icon className="h-4 w-4 text-s8ul-cyan" aria-hidden="true" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-semibold text-white">{title}</h2>
              {description && <p className="text-xs text-zinc-500">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div>{children}</div>
      {footer && <div className="mt-4 pt-4 border-t border-white/5">{footer}</div>}
    </div>
  );
}
