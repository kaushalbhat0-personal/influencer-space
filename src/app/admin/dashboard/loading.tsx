export default function DashboardLoading() {
  return (
    <div className="p-6 max-w-6xl animate-pulse space-y-6" role="status" aria-label="Loading dashboard">
      <div className="h-8 w-48 bg-[var(--surface-hover)] rounded-lg" />
      {/* Hero — platform-card-primary elevation */}
      <div className="h-64 bg-[var(--surface-hover)] rounded-[var(--radius-card-elevated)] border border-[var(--border)]" />
      {/* Getting Started — platform-card-secondary */}
      <div className="h-40 bg-[var(--surface-hover)] rounded-[var(--radius-card)] border border-[var(--border)]" />
      {/* Storefront */}
      <div className="h-32 bg-[var(--surface-hover)] rounded-[var(--radius-card)] border border-[var(--border)]" />
      {/* MetricGrid — secondary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-[var(--surface-hover)] rounded-[var(--radius-card)] border border-[var(--border)]" />
        ))}
      </div>
      {/* Quick Actions — secondary, 12 cols */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-16 bg-[var(--surface-hover)] rounded-[var(--radius-card)] border border-[var(--border-subtle)]" />
        ))}
      </div>
      <span className="sr-only">Loading dashboard...</span>
    </div>
  );
}
