/**
 * StorefrontShowcase — real screenshot-driven visual proof.
 * Images are captured from the live seeded /snax storefront via Playwright.
 */
export function StorefrontShowcase() {
  return (
    <section className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your storefront,{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              live in 2 minutes
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            AI generates your complete storefront — products, checkout, SEO, and mobile-optimized
            design. Paste your profile URL and watch it build.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="group rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 overflow-hidden">
            <img
              src="/marketing-assets/screenshots/storefront/01-desktop.png"
              alt="CreatorStore storefront — desktop view"
              className="w-full h-auto"
              loading="lazy"
            />
            <div className="px-4 py-3 border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-xs text-zinc-500">Desktop storefront</span>
              <span className="text-[10px] text-zinc-600">1440×900</span>
            </div>
          </div>
          <div className="group rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 overflow-hidden">
            <img
              src="/marketing-assets/screenshots/storefront/02-mobile.png"
              alt="CreatorStore storefront — mobile view"
              className="w-full h-auto"
              loading="lazy"
            />
            <div className="px-4 py-3 border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-xs text-zinc-500">Mobile storefront</span>
              <span className="text-[10px] text-zinc-600">390×844</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
