import { ArrowRight } from "lucide-react";

const COMPARISONS = [
  { label: "Storefront", before: "No store", after: "Profile-built store" },
  { label: "Products", before: "Nothing to sell", after: "Digital + physical products" },
  { label: "Checkout", before: "No payments", after: "UPI + Razorpay" },
  { label: "Brand", before: "Scattered links", after: "Unified presence" },
  { label: "Analytics", before: "No insights", after: "Orders + revenue metrics" },
];

export function BeforeAfter() {
  return (
    <section id="transformation" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From content creator<br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              to business owner
            </span>
          </h2>
          <p className="mt-3 text-zinc-500">
            You already have the audience. We build everything else.
          </p>
        </div>

        {/* Desktop: side-by-side */}
        <div className="hidden sm:block space-y-3">
          {COMPARISONS.map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center group">
              <div className="rounded-xl border border-white/[0.05] bg-[var(--surface-base)]/30 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600 w-20 shrink-0">{row.label}</span>
                  <span className="text-sm text-zinc-400">{row.before}</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-700 group-hover:text-indigo-400 transition-colors shrink-0" aria-hidden="true" />
              <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/[0.03] px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 w-20 shrink-0">{row.label}</span>
                  <span className="text-sm text-zinc-300">{row.after}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile: stacked */}
        <div className="sm:hidden space-y-4">
          {COMPARISONS.map((row) => (
            <div key={row.label} className="rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 p-4 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{row.label}</span>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-700 shrink-0" />
                <span className="text-zinc-400">{row.before}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-zinc-300">{row.after}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
