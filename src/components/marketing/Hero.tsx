import { HeroInput } from "./HeroInput";
import { HERO_OUTPUT_LINES } from "@/lib/marketing/messaging";

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
              Turn your content<br />
              into a{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                business
              </span>
              .
            </h1>
            <p className="mt-4 max-w-lg text-base text-zinc-400 sm:text-lg leading-relaxed">
              Paste your YouTube, Instagram, TikTok, or creator profile. Our AI
              builds your entire business — storefront, products, checkout,
              analytics, SEO, and a visual builder — ready in under two minutes.
            </p>

            <div className="mt-6">
              <HeroInput />
            </div>

            {/* Output preview */}
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
              {HERO_OUTPUT_LINES.map((line) => (
                <span
                  key={line}
                  className="flex items-center gap-1.5 text-xs text-zinc-400"
                >
                  <svg
                    className="h-3 w-3 text-emerald-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {line}
                </span>
              ))}
            </div>

            {/* Trust line */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                2-minute setup
              </span>
            </div>
          </div>

          {/* Right — Storefront Preview */}
          <div className="hidden lg:block">
            <div className="relative rounded-2xl border border-white/[0.08] bg-[var(--surface-base)] p-4 shadow-2xl">
              <div className="mb-3 flex items-center gap-1.5 border-b border-white/[0.06] pb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                <span className="ml-3 text-[10px] font-medium text-zinc-600">
                  creatorstore.app/your-store
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex h-20 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-transparent">
                  <span className="text-sm font-medium text-indigo-400">
                    Your Storefront
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 rounded-lg bg-white/[0.04]" />
                  <div className="h-16 rounded-lg bg-white/[0.04]" />
                  <div className="h-16 rounded-lg bg-white/[0.04]" />
                </div>
                <div className="h-3 w-3/4 rounded bg-white/[0.04]" />
                <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
