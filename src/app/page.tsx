import Link from "next/link";
import { PricingCTA } from "@/components/marketing/pricing-cta";
import {
  Box,
  Users,
  SplitIcon as Split,
  Palette,
  Globe,
  Zap,
  Shield,
  BarChart3,
} from "lucide-react";

const creatorFeatures = [
  {
    icon: Box,
    title: "Sell Digital & Physical Products",
    description:
      "Upload courses, presets, merch, or PDFs. UPI, cards, net banking — your fans pay however they want, and you get paid instantly.",
  },
  {
    icon: Zap,
    title: "Dynamic Social Feeds",
    description:
      "Your YouTube videos and Instagram posts auto-sync to your storefront. No manual updates — your content stays fresh 24/7.",
  },
  {
    icon: Globe,
    title: "Custom Domain & White-Label",
    description:
      "Own your brand with a custom .in or .com domain. Free SSL, one-click setup. Your fans see your name, not ours.",
  },
  {
    icon: BarChart3,
    title: "Live Analytics Dashboard",
    description:
      "Track product sales, clicks, and fan engagement in real time. Know exactly what's working and double down.",
  },
];

const agencyFeatures = [
  {
    icon: Users,
    title: "Multi-Tenant Dashboard",
    description:
      "Manage all your creator clients from one unified dashboard. Switch between stores instantly — no logging in and out.",
  },
  {
    icon: Split,
    title: "Automated Revenue Splitting",
    description:
      "Razorpay Route handles the math. Every product sale auto-splits between you and your client. No spreadsheets, no chasing payments.",
  },
  {
    icon: Palette,
    title: "White-Label Themes",
    description:
      "Set a default theme for all your clients, or let each creator customize their own. Your agency brand, front and center.",
  },
  {
    icon: Shield,
    title: "Seat-Based Billing",
    description:
      "Pay only for the seats you need. Scale from 5 to unlimited creators. If a client leaves, free up the seat — no contract lock-in.",
  },
];

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
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* ─── Navigation ─── */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <span className="bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-lg font-bold text-transparent font-display">
            CreatorStore
          </span>
          <div className="flex items-center gap-4">
            <Link href="/admin/login" className="text-sm text-gray-400 transition-colors hover:text-white">
              Sign In
            </Link>
            <Link
              href="/admin/login"
              className="rounded-lg bg-s8ul-cyan px-4 py-2 text-sm font-medium text-black transition-all hover:bg-s8ul-cyan/80"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden px-4 pt-32 pb-20 sm:px-8 sm:pt-40 sm:pb-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,245,255,0.12),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.08),transparent_50%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-s8ul-cyan/20 bg-s8ul-cyan/10 px-4 py-1.5 text-xs font-medium text-s8ul-cyan">
            🇮🇳 Built for Indian Creators &amp; Agencies
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl font-display">
            Build the Ultimate{" "}
            <span className="bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-transparent">
              Creator Storefront
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-400 sm:text-lg">
            Whether you&apos;re a solo creator selling merch, or an agency building
            Shopify-like stores for 20 clients — we handle the billing, the
            routing, and the revenue splitting so you can focus on building.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/admin/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-s8ul-cyan to-s8ul-pink px-8 py-3.5 text-sm font-bold text-black transition-all hover:shadow-[0_0_30px_rgba(0,245,255,0.4)] sm:w-auto"
            >
              Start Building Free
            </Link>
            <Link
              href="#pricing"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-medium text-zinc-300 backdrop-blur-sm transition-all hover:bg-white/10 sm:w-auto"
            >
              See Plans
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            Solo: ₹0/mo · 10% fee · Agency: ₹1,999/mo · 5 seats · No contracts · Cancel anytime
          </p>
        </div>
      </section>

      {/* ─── For Creators ─── */}
      <section className="relative px-4 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold font-display sm:text-4xl">
              For{" "}
              <span className="bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-transparent">
                Solo Creators
              </span>
            </h2>
            <p className="mt-3 text-zinc-500">
              YouTubers, Instagrammers, streamers, educators — sell products, sync socials, own your brand.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {creatorFeatures.map((feat) => (
              <div
                key={feat.title}
                className="group rounded-2xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-s8ul-cyan/20 hover:bg-zinc-900/80"
              >
                <div className="mb-4 inline-flex rounded-xl bg-s8ul-cyan/10 p-3 text-s8ul-cyan">
                  <feat.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{feat.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── For Agencies ─── */}
      <section className="relative px-4 py-20 sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.06),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold font-display sm:text-4xl">
              For{" "}
              <span className="bg-gradient-to-r from-purple-400 to-s8ul-cyan bg-clip-text text-transparent">
                Agencies &amp; Coders
              </span>
            </h2>
            <p className="mt-3 text-zinc-500">
              Build stores for your clients. Manage everything from one dashboard. Earn automated revenue share.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {agencyFeatures.map((feat) => (
              <div
                key={feat.title}
                className="group rounded-2xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-purple-500/20 hover:bg-zinc-900/80"
              >
                <div className="mb-4 inline-flex rounded-xl bg-purple-500/10 p-3 text-purple-400">
                  <feat.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{feat.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
