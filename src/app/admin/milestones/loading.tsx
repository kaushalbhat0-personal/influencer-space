export default function MilestonesLoading() {
  return (
    <div className="p-6 max-w-6xl space-y-6 animate-pulse" role="status" aria-label="Loading milestones">
      <div className="h-8 w-40 rounded bg-[var(--surface-hover)]" />
      <div className="h-4 w-64 rounded bg-[var(--surface-hover)]" />
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-[var(--surface-hover)]" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl border border-[var(--border)] bg-[var(--surface-card)]" />
        ))}
      </div>
      <span className="sr-only">Loading milestones...</span>
    </div>
  );
}
