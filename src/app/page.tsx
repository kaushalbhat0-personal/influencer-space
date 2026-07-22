import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { CreatorFeatures } from "@/components/marketing/CreatorFeatures";
import { AgencyFeatures } from "@/components/marketing/AgencyFeatures";
import { StoreExamples } from "@/components/marketing/StoreExamples";
import { WhyCreatorStore } from "@/components/marketing/WhyCreatorStore";
import { Pricing } from "@/components/marketing/Pricing";
import { showcaseService } from "@/lib/showcase/service";
import { getPlatformConfig } from "@/lib/config/platform";
import type { StoreExample } from "@/components/marketing/StoreExamples/data";

export const dynamic = "force-dynamic";

const GRADIENTS = ["from-indigo-900 via-zinc-900 to-zinc-950", "from-emerald-900 via-zinc-900 to-zinc-950", "from-blue-900 via-zinc-900 to-zinc-950", "from-violet-900 via-zinc-900 to-zinc-950", "from-amber-900 via-zinc-900 to-zinc-950", "from-rose-900 via-zinc-900 to-zinc-950"];

async function getDemoStoreExamples(): Promise<StoreExample[]> {
  try {
    const sites = await showcaseService.getPublished();
    if (sites.length === 0) return [];
    return sites.slice(0, 6).map((s, i) => ({
      id: s.id, name: s.name, category: s.category, description: s.description,
      placeholder: GRADIENTS[i % GRADIENTS.length],
    }));
  } catch {
    return [];
  }
}

export default async function MarketingPage() {
  const demoExamples = await getDemoStoreExamples();
  return (
    <main id="main-content" className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-4 pt-32 pb-20 sm:px-8 sm:pt-44 sm:pb-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.08),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.05),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left — Copy */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-400">
                AI-Powered Creator Platform
              </div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Your content built<br />
                the audience.
                <br />
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  We build the business.
                </span>
              </h1>
              <p className="mt-5 max-w-lg text-base text-zinc-400 sm:text-lg leading-relaxed">
                Paste your YouTube or Instagram link. CreatorStore builds your
                storefront, products, gallery, and checkout — ready to sell in
                under two minutes.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="btn-primary px-8 py-3.5 text-sm"
                >
                  Start Free
                </Link>
                <Link
                  href="#features"
                  className="btn-secondary px-8 py-3.5 text-sm"
                >
                  See how it works
                </Link>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  AI-powered
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  2-minute setup
                </span>
              </div>
            </div>

            {/* Right — Product Preview */}
            <div className="hidden lg:block">
              <div className="relative rounded-2xl border border-white/[0.08] bg-[var(--surface-base)] p-4 shadow-2xl">
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 mb-3 pb-3 border-b border-white/[0.06]">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
                  <span className="ml-3 text-[10px] text-zinc-600 font-medium">creator.{getPlatformConfig().baseDomain}</span>
                </div>

                {/* AI Pipeline visual */}
                <div className="space-y-3">
                  {/* URL input */}
                  <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[var(--surface-root)] px-3 py-2.5">
                    <svg className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                    <span className="text-xs text-zinc-600">youtube.com/@creator</span>
                    <span className="ml-auto rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">Analyze</span>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <svg className="h-4 w-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  </div>

                  {/* AI Analysis */}
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse-warm" />
                      <span className="text-[10px] font-medium text-amber-400">AI Analysis</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="h-1.5 rounded bg-amber-500/20 w-3/4" />
                      <div className="h-1.5 rounded bg-amber-500/10 w-2/3" />
                      <div className="h-1.5 rounded bg-amber-500/20 w-1/2" />
                      <div className="h-1.5 rounded bg-amber-500/10 w-3/4" />
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <svg className="h-4 w-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  </div>

                  {/* Generated Website */}
                  <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="h-3 w-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span className="text-[10px] font-medium text-emerald-400">Website Ready</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-5 rounded bg-indigo-500/20 flex items-center px-2">
                        <span className="text-[10px] text-indigo-400 font-medium">Creator Store</span>
                      </div>
                      <div className="h-2 rounded bg-white/[0.06] w-3/4" />
                      <div className="h-2 rounded bg-white/[0.06] w-1/2" />
                      <div className="grid grid-cols-3 gap-1.5 mt-2">
                        <div className="h-8 rounded bg-white/[0.04]" />
                        <div className="h-8 rounded bg-white/[0.04]" />
                        <div className="h-8 rounded bg-white/[0.04]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />

      <CreatorFeatures />

      <AgencyFeatures />

      <StoreExamples demos={demoExamples.length > 0 ? demoExamples : undefined} />

      <WhyCreatorStore />

      <Pricing />

      {/* ─── Final CTA ─── */}
      <section className="relative px-4 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-zinc-900/50 to-transparent px-6 py-14 backdrop-blur-sm sm:px-12 sm:py-20">
            <h2 className="text-3xl font-bold font-display sm:text-4xl">
              Ready to Build?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-zinc-400">
              Whether you&apos;re a solo creator or an agency with 20 clients — your
              storefront is minutes away.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/admin/login"
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-s8ul-cyan to-s8ul-pink px-10 py-3.5 text-sm font-bold text-black transition-all hover:shadow-[0_0_30px_rgba(0,245,255,0.4)] sm:w-auto"
              >
                Create Your Store — Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 px-4 py-10 text-center text-xs text-zinc-600 sm:text-sm">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-zinc-500">
            <a href="mailto:support@influencerspace.in" className="transition-colors hover:text-s8ul-cyan">
              support@influencerspace.in
            </a>
            <span className="hidden sm:inline">·</span>
            <span>Pune, Maharashtra, India</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/terms" className="transition-colors hover:text-zinc-400">Terms</Link>
            <Link href="/privacy" className="transition-colors hover:text-zinc-400">Privacy</Link>
            <Link href="/refund" className="transition-colors hover:text-zinc-400">Refunds</Link>
            <Link href="/contact" className="transition-colors hover:text-zinc-400">Contact</Link>
            <Link href="/admin/login" className="transition-colors hover:text-zinc-400">Admin</Link>
          </div>
          <p className="mt-4">© {new Date().getFullYear()} CreatorStore. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
