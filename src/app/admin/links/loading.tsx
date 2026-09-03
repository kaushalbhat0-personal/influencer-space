export default function LinksLoading() {
  return (
    <div className="p-6 max-w-6xl space-y-6 animate-pulse" role="status" aria-label="Loading links">
      <div className="h-8 w-24 rounded bg-[var(--surface-hover)]" />
      <div className="h-4 w-64 rounded bg-[var(--surface-hover)]" />
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-5">
        <div className="h-6 w-32 rounded bg-[var(--surface-hover)]" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-[var(--surface-hover)]" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading links...</span>
    </div>
  );
}
