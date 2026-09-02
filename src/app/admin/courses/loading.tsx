export default function CoursesLoading() {
  return (
    <div className="p-6 max-w-6xl space-y-6 animate-pulse" role="status" aria-label="Loading courses">
      <div className="h-8 w-40 rounded bg-[var(--surface-hover)]" />
      <div className="h-4 w-64 rounded bg-[var(--surface-hover)]" />
      <div className="admin-card p-5">
        <div className="mb-4 h-10 w-full rounded bg-[var(--surface-hover)]" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded bg-[var(--surface-hover)]" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading courses...</span>
    </div>
  );
}
