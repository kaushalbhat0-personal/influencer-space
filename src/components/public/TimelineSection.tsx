import type { PublicMilestoneData } from "@/services/public.service";

export function TimelineSection({
  milestones,
  colors,
}: {
  milestones: PublicMilestoneData[];
  colors: { primary: string; secondary: string; accent: string };
}) {
  if (milestones.length === 0) return null;

  const c = colors;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Journey
      </h2>
      <div className="relative space-y-6 pl-8 before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-zinc-800">
        {milestones.map((m) => (
          <div key={m.id} className="relative">
            <span className="absolute -left-5 top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[var(--secondary)] ring-4 ring-zinc-950" />
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-4">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 font-display text-xs font-bold"
                  style={{
                    backgroundColor: `${c.secondary}20`,
                    color: c.secondary,
                  }}
                >
                  {m.year}
                </span>
                {m.stats && (
                  <span
                    className="rounded-md px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: `${c.accent}20`,
                      color: c.accent,
                    }}
                  >
                    {m.stats}
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-sm font-semibold text-white">
                {m.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {m.description}
              </p>
              {m.imageUrl && (
                <img
                  src={m.imageUrl}
                  alt={m.title}
                  className="mt-3 w-full rounded-lg object-cover"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
