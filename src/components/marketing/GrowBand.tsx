import { ArrowDown } from "lucide-react";

/**
 * RCCF-MKT-02-R1 — Section 7: Grow.
 * "Build it once. Grow it over time." The platform journey as a conceptual
 * progression — deliberately NOT another feature grid. Each stage maps to a
 * real capability that already exists on the platform.
 */
const STAGES = [
  { label: "Presence", note: "Claim your home on the web" },
  { label: "Showcase", note: "Fill it with your work" },
  { label: "Sell", note: "Open your store when you're ready" },
  { label: "Promote", note: "Bring your audience back to one place" },
  { label: "Grow", note: "Guidance, insights, and room to expand" },
] as const;

export function GrowBand() {
  return (
    <section id="grow" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Build it once.{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Grow it over time.
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            Start with presence and add the rest when it matters — your home
            grows the way your work does.
          </p>
        </div>

        {/* Conceptual progression line */}
        <ol className="mx-auto flex max-w-3xl flex-col items-center gap-1 lg:flex-row lg:justify-between lg:gap-0">
          {STAGES.map((stage, i) => (
            <li key={stage.label} className="flex flex-col items-center text-center lg:flex-1">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold ${
                  i === STAGES.length - 1
                    ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-300"
                    : "border-white/[0.08] bg-[var(--surface-base)] text-zinc-400"
                }`}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <p className={`mt-3 text-sm font-semibold ${i === STAGES.length - 1 ? "text-indigo-300" : "text-white"}`}>
                {stage.label}
              </p>
              <p className="mt-1 hidden max-w-[160px] text-xs leading-relaxed text-zinc-500 sm:block">{stage.note}</p>
              {i < STAGES.length - 1 && (
                <>
                  <ArrowDown className="my-1 h-4 w-4 text-zinc-700 lg:hidden" aria-hidden="true" />
                  <span className="mx-3 mt-5 hidden h-px w-full min-w-8 self-start bg-white/[0.08] lg:block" aria-hidden="true" />
                </>
              )}
            </li>
          ))}
        </ol>

        <p className="mx-auto mt-12 max-w-xl text-center text-sm leading-relaxed text-zinc-500">
          Readiness checks, next-step guidance, and improvement suggestions are
          built in — so there&rsquo;s always a clear next move.
        </p>
      </div>
    </section>
  );
}
