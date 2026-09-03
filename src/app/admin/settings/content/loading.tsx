export default function ContentFeedLoading() {
  return (
    <div className="p-6 max-w-6xl space-y-6 animate-pulse" role="status" aria-label="Loading content feed">
      <div className="h-8 w-48 rounded bg-[var(--surface-hover)]" />
      <div className="h-4 w-64 rounded bg-[var(--surface-hover)]" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-card)] p-4">
            <div className="h-14 w-14 rounded-lg bg-[var(--surface-hover)]" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading content feed...</span>
    </div>
  );
}
