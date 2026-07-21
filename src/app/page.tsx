import Link from "next/link";
import { PricingCTA } from "@/components/marketing/pricing-cta";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { CreatorFeatures } from "@/components/marketing/CreatorFeatures";
import { AgencyFeatures } from "@/components/marketing/AgencyFeatures";
import { StoreExamples } from "@/components/marketing/StoreExamples";
import { WhyCreatorStore } from "@/components/marketing/WhyCreatorStore";

const pricingPlans = [
  {
    name: "Solo Creator",
    price: "₹0",
    period: "/mo",
    description: "One store. Your brand. Zero platform fees.",
    seats: null,
    highlight: false,
    accent: "from-s8ul-cyan to-s8ul-pink",
    features: [
      "1 fully customizable store",
      "Unlimited products",
      "UPI, cards & net banking",
      "Custom domain (with Pro upgrade)",
      "Social feed auto-sync",
      "10% transaction fee",
    ],
    cta: "Start Free",
    planId: "solo",
  },
  {
    name: "Freelancer Agency",
    price: "₹1,999",
    period: "/mo",
    description: "For solo devs and small teams building stores for creators.",
    seats: "5 managed seats",
    highlight: true,
    accent: "from-purple-500 to-s8ul-cyan",
    features: [
      "5 managed creator stores",
      "Multi-tenant dashboard",
      "Automated revenue splitting",
      "Default theme assignment",
      "Creator permission controls",
      "7% platform fee on creator sales",
      "Email support",
    ],
    cta: "Start for Free",
    planId: "freelancer",
  },
  {
    name: "Growth Agency",
    price: "₹4,999",
    period: "/mo",
    description: "For established agencies scaling their creator portfolio.",
    seats: "20 managed seats",
    highlight: false,
    accent: "from-amber-400 to-amber-600",
    features: [
      "20 managed creator stores",
      "Everything in Freelancer",
      "Custom rev-share % per creator",
      "White-label agency dashboard",
      "Priority WhatsApp support",
      "API access",
      "5% platform fee on creator sales",
    ],
    cta: "Contact Sales",
    planId: "growth",
  },
];

export default function MarketingPage() {
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
                  <span className="ml-3 text-[10px] text-zinc-600 font-medium">creator.creatorspace.app</span>
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

      <StoreExamples />

      <WhyCreatorStore />

      {/* ─── Pricing ─── */}
      <section id="pricing" className="relative px-4 py-20 sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,245,255,0.04),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold font-display sm:text-4xl">
              Plans for Every Stage
            </h2>
            <p className="mt-3 text-zinc-500">
              Start free as a creator. Scale to an agency when you&apos;re ready.
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 backdrop-blur-sm transition-all ${
                  plan.highlight
                    ? "border-purple-500/30 bg-gradient-to-b from-purple-500/5 to-zinc-900/80 shadow-[0_0_40px_rgba(168,85,247,0.1)]"
                    : "border-white/5 bg-zinc-900/50 hover:border-white/10"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-s8ul-cyan px-4 py-0.5 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{plan.description}</p>
                </div>
                <div className="mt-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-zinc-500">{plan.period}</span>
                </div>
                {plan.seats && (
                  <p className="mt-1 text-sm font-medium text-purple-400">{plan.seats}</p>
                )}
                <ul className="mt-6 flex-1 space-y-3" role="list">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-zinc-300">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-s8ul-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <PricingCTA
                  planId={plan.planId}
                  label={plan.cta}
                  className={`mt-8 flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold transition-all ${
                    plan.highlight
                      ? `bg-gradient-to-r ${plan.accent} text-white hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]`
                      : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

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
