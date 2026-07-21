import Link from "next/link";
import { PILLARS } from "./data";

const ACCENT_MAP = {
  indigo: {
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-400",
    border: "border-indigo-500/20",
    hover: "hover:border-indigo-500/30",
  },
  amber: {
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    border: "border-amber-500/20",
    hover: "hover:border-amber-500/30",
  },
  emerald: {
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/20",
    hover: "hover:border-emerald-500/30",
  },
};

export function CreatorFeatures() {
  return (
    <section className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything your{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              creator business
            </span>{" "}
            needs
          </h2>
          <p className="mt-3 text-zinc-500">
            Build, sell, and grow — all from one platform. No code. No plugins. No complexity.
          </p>
        </div>

        {/* Desktop: three columns */}
        <div className="hidden lg:grid grid-cols-3 gap-8">
          {PILLARS.map((pillar) => (
            <div key={pillar.id} className="rounded-2xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-6">
              <h3 className="text-lg font-semibold text-white">{pillar.label}</h3>
              <p className="mt-1 text-sm text-zinc-500">{pillar.description}</p>

              <div className="mt-5 space-y-3">
                {pillar.items.map((item) => {
                  const a = ACCENT_MAP[item.accent];
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="group flex gap-3 rounded-xl border border-transparent p-3 transition-all hover:bg-white/[0.03] hover:border-white/[0.06] cursor-default"
                    >
                      <div className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg ${a.iconBg}`}>
                        <Icon className={`h-4 w-4 ${a.iconColor}`} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{item.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile/Tablet: stacked accordion-like cards */}
        <div className="lg:hidden space-y-6">
          {PILLARS.map((pillar) => (
            <details key={pillar.id} className="group rounded-2xl border border-white/[0.06] bg-[var(--surface-base)]/50" open={pillar.id === "build"}>
              <summary className="flex cursor-pointer items-center justify-between px-6 py-5 list-none">
                <div>
                  <h3 className="text-base font-semibold text-white">{pillar.label}</h3>
                  <p className="mt-0.5 text-sm text-zinc-500">{pillar.description}</p>
                </div>
                <svg className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-5 space-y-2">
                {pillar.items.map((item) => {
                  const a = ACCENT_MAP[item.accent];
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-3 rounded-xl p-3">
                      <div className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg ${a.iconBg}`}>
                        <Icon className={`h-4 w-4 ${a.iconColor}`} aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{item.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link href="/signup" className="btn-primary px-10 py-3.5 text-sm">
            Explore Everything
          </Link>
        </div>
      </div>
    </section>
  );
}
