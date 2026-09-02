export default function GamesLoading() {
  return (
    <div className="p-6 max-w-6xl space-y-6 animate-pulse" role="status" aria-label="Loading games">
      <div className="h-8 w-40 rounded bg-[var(--surface-hover)]" />
      <div className="h-4 w-64 rounded bg-[var(--surface-hover)]" />
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-card)]">
        <div className="h-12 w-full border-b border-[var(--border)] bg-[var(--surface-hover)]" />
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-full rounded bg-[var(--surface-hover)]" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading games...</span>
    </div>
  );
}
