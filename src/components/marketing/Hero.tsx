import { HeroInput } from "./HeroInput";

/**
 * RCCF-MKT-02-R1 — positioning hero.
 * Core idea: "Your presence. Your business." — CreatorStore is a professional
 * home online (website, portfolio, links, storefront, business), not just a
 * checkout page. CTA architecture (HeroInput → /signup) is unchanged.
 *
 * RCCF-MKT-03: the preview uses the certified SPower Gaming capture
 * (RCCF-MKT-02/R2/R3) as product demonstration — no endorsement framing.
 */
export function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden px-4 pt-32 pb-20 sm:px-8 sm:pt-44 sm:pb-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.08),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.05),transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left — Copy + Input */}
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Your presence.
              <br />
              Your{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                business
              </span>
              .
            </h1>
            <p className="mt-4 max-w-lg text-base text-zinc-400 sm:text-lg leading-relaxed">
              A professional home for everything you create, share, showcase,
              and sell — one place you own online.
            </p>

            {/* What your home can hold — outcomes, not a feature list. */}
            <ul className="mt-5 grid max-w-lg gap-2 sm:grid-cols-2" role="list">
              {[
                "Your own website, on your domain",
                "Showcase work, links & products",
                "Sell and keep 100% of every sale",
                "Built for Indian creators",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="mt-0.5 text-emerald-400 flex-shrink-0">✓</span>
                  {point}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <HeroInput />
            </div>

            {/* Trust line */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                15-day free trial
              </span>
            </div>
          </div>

          {/* Right — Site preview */}
          <div className="hidden lg:block">
            <div className="relative rounded-2xl border border-white/[0.08] bg-[var(--surface-base)] p-4 shadow-2xl">
              <div className="mb-3 flex items-center gap-1.5 border-b border-white/[0.06] pb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                <span className="ml-3 text-[10px] font-medium text-zinc-600">
                  Your home on the web
                </span>
              </div>
              {/* Certified example capture (RCCF-MKT-02/R2) — demonstration only */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing-assets/storefront/01-desktop.png"
                alt="A CreatorStore site generated from a creator's profile"
                className="w-full rounded-lg"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
