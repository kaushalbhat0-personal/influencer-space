"use client";

/** Hero renderer — used by hero.default, hero.gaming, hero.fitness, hero.education */
export function HeroRenderer({ props }: { props: Record<string, unknown> }) {
  const p = props as Record<string, string>;
  return (
    <div className="relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-4">
      <div className="relative z-10 max-w-2xl text-center">
        {Boolean(p.showLiveBadge) && (
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-sm font-semibold uppercase tracking-wider text-red-400">Live</span>
          </div>
        )}
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">{p.title || ""}</h1>
        {p.subtitle && <p className="mt-4 text-lg text-zinc-400">{p.subtitle}</p>}
        {p.cta && (
          <div className="mt-8">
            <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-secondary,#00f5ff)] px-6 py-3 text-sm font-semibold text-black">{p.cta}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** About renderer */
export function AboutRenderer({ props }: { props: Record<string, unknown> }) {
  const p = props as Record<string, string>;
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="text-2xl font-bold text-white">{p.title || "About"}</h2>
      {p.content && <p className="mt-4 text-zinc-400">{p.content}</p>}
      {p.imageUrl && <img src={p.imageUrl} alt="" className="mx-auto mt-6 h-32 w-32 rounded-full object-cover" />}
    </div>
  );
}

/** Footer renderer */
export function FooterRenderer({ props }: { props: Record<string, unknown> }) {
  const p = props as Record<string, string>;
  return (
    <footer className="border-t border-white/10 py-8 text-center text-sm text-zinc-600">
      <p>{p.copyright || "© All rights reserved"}</p>
    </footer>
  );
}
