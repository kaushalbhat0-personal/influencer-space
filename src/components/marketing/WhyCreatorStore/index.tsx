import Link from "next/link";
import { COMPARISON } from "./data";
import { ArrowRight, Sparkles } from "lucide-react";

export function WhyCreatorStore() {
  return (
    <section className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Why{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              CreatorStore
            </span>
            ?
          </h2>
          <p className="mt-3 text-zinc-500">
            One platform instead of six subscriptions. AI that does the heavy lifting.
          </p>
        </div>

        {/* Desktop: two-column comparison */}
        <div className="hidden sm:block">
          {/* Header row */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-6 mb-4">
            <div className="rounded-xl border border-white/[0.05] bg-[var(--surface-base)]/50 px-5 py-3">
              <p className="text-sm font-medium text-zinc-500">Without CreatorStore</p>
            </div>
            <div className="flex items-center justify-center w-10">
              <span className="sr-only">becomes</span>
            </div>
            <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/[0.03] px-5 py-3">
              <p className="text-sm font-medium text-indigo-400">With CreatorStore</p>
            </div>
          </div>

          {/* Comparison rows */}
          <div className="space-y-2">
            {COMPARISON.map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr,auto,1fr] gap-6 group">
                {/* Without */}
                <div className="rounded-xl border border-white/[0.05] bg-[var(--surface-base)]/30 px-5 py-4 transition-colors group-hover:border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-600 w-24">
                      {row.label}
                    </span>
                    <span className="text-sm text-zinc-500">{row.without}</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center w-10">
                  <ArrowRight className="h-4 w-4 text-zinc-700 group-hover:text-indigo-400 transition-colors" aria-hidden="true" />
                </div>

                {/* With */}
                <div className="rounded-xl border border-indigo-500/[0.06] bg-indigo-500/[0.02] px-5 py-4 transition-colors group-hover:border-indigo-500/15 group-hover:bg-indigo-500/[0.04]">
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 text-xs font-semibold uppercase tracking-wider text-indigo-400 w-24">
                      {row.label}
                    </span>
                    <span className="text-sm text-zinc-300">{row.with}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: stacked comparison */}
        <div className="sm:hidden space-y-4">
          {COMPARISON.map((row) => (
            <div key={row.id} className="rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {row.label}
              </span>
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-zinc-800 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                  </span>
                  <span className="text-sm text-zinc-500">{row.without}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex-shrink-0 h-4 w-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Sparkles className="h-2.5 w-2.5 text-indigo-400" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-zinc-300">{row.with}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link href="/signup" className="btn-primary px-10 py-3.5 text-sm">
            Start with One Platform
          </Link>
        </div>
      </div>
    </section>
  );
}
