import Link from "next/link";

const features = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    title: "Sell Digital & Physical Products",
    description:
      "Upload digital downloads (PDFs, courses, presets) or ship physical merch — all from one dashboard. No inventory limits, no monthly app fees.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    ),
    title: "Dynamic Social Feeds",
    description:
      "Auto-sync your latest YouTube videos and Instagram posts straight to your storefront. Connect your API keys once — content stays fresh without manual updates.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    title: "Affiliate Links for Sponsors",
    description:
      "Manage sponsor deals and affiliate partnerships from a dedicated dashboard. Track clicks, conversions, and payouts — no spreadsheets needed.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    title: "Custom Domains (Pro)",
    description:
      "Own your brand with a custom .in or .com domain. Free SSL, one-click setup, and no more yourbrand.storefront.app — just your name.",
  },
];

const pricingPlans = [
  {
    name: "CreatorStore Starter",
    price: "₹0",
    period: "/mo",
    fee: "10% per transaction",
    highlight: false,
    features: [
      "Link-in-bio storefront",
      "Unlimited products",
      "UPI, cards & net banking",
      "Digital & physical products",
      "Social feed integration",
      "Community support",
    ],
    cta: "Start Free",
  },
  {
    name: "CreatorStore Pro",
    price: "₹999",
    period: "/mo",
    fee: "5% per transaction",
    highlight: true,
    features: [
      "Everything in Starter",
      "Custom domain (yourname.in)",
      "Free SSL certificate",
      "Priority WhatsApp support",
      "Advanced analytics",
      "No CreatorStore branding",
    ],
    cta: "Go Pro",
  },
];

const comparison = [
  {
    feature: "Monthly plan cost",
    us: "₹0 – ₹999",
    them: "₹1,499 ($29/mo)",
  },
  {
    feature: "Transaction fee",
    us: "5% – 10%",
    them: "2% + ₹10 (Shopify Payments)",
  },
  {
    feature: "App / plugin fees",
    us: "₹0 — all features built-in",
    them: "₹500 – ₹5,000/mo per app",
  },
  {
    feature: "Indian payment gateways",
    us: "✅ UPI, cards, net banking",
    them: "❌ Requires paid plugin",
  },
  {
    feature: "Link-in-bio page",
    us: "✅ Included",
    them: "❌ ₹350/mo (Linkpop)",
  },
  {
    feature: "Social feed integration",
    us: "✅ Built-in",
    them: "❌ Requires app",
  },
  {
    feature: "Custom domain with SSL",
    us: "✅ Included in Pro",
    them: "✅ ₹730/mo extra",
  },
  {
    feature: "Dedicated India support",
    us: "✅ Email & WhatsApp",
    them: "❌ Email only (US hours)",
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
            <Link
              href="/admin/login"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
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
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,0,229,0.06),transparent_50%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-s8ul-cyan/20 bg-s8ul-cyan/10 px-4 py-1.5 text-xs font-medium text-s8ul-cyan">
            🇮🇳 Built for Indian Creators
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl font-display">
            The Ultimate E-commerce Platform{" "}
            <span className="bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-transparent">
              for Indian Creators
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-400 sm:text-lg">
            Stop paying Shopify&apos;s high monthly fees. Build your merchandise store,
            sell digital products, and showcase your Hall of Fame for free. Native UPI
            checkout included.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/admin/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-s8ul-cyan to-s8ul-pink px-8 py-3.5 text-sm font-bold text-black transition-all hover:shadow-[0_0_30px_rgba(0,245,255,0.4)] sm:w-auto"
            >
              Start Building for Free
            </Link>
            <Link
              href="#features"
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-medium text-zinc-300 backdrop-blur-sm transition-all hover:bg-white/10 sm:w-auto"
            >
              See How It Works
            </Link>
          </div>
          <p className="mt-4 text-xs text-zinc-600">
            Starter: ₹0/mo • 10% fee • Pro: ₹999/mo • 5% fee • No setup costs • Cancel anytime
          </p>
        </div>
      </section>

      {/* ─── Built for Creators (Features Grid) ─── */}
      <section id="features" className="relative px-4 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold font-display sm:text-4xl">
              Built for{" "}
              <span className="bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-transparent">
                Creators
              </span>
            </h2>
            <p className="mt-3 text-zinc-500">
              YouTubers, Instagrammers, educators, artists, streamers — one platform to
              sell, grow, and own your brand.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="group rounded-2xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all hover:border-s8ul-cyan/20 hover:bg-zinc-900/80"
              >
                <div className="mb-4 inline-flex rounded-xl bg-s8ul-cyan/10 p-3 text-s8ul-cyan">
                  {feat.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{feat.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Side-by-Side ─── */}
      <section className="relative px-4 py-20 sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,0,229,0.03),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold font-display sm:text-4xl">
              Simple Pricing. Zero Surprises.
            </h2>
            <p className="mt-3 text-zinc-500">
              No hidden fees, no app marketplace. What you see is what you pay.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 backdrop-blur-sm transition-all ${
                  plan.highlight
                    ? "border-s8ul-cyan/30 bg-gradient-to-b from-s8ul-cyan/5 to-zinc-900/80 shadow-[0_0_40px_rgba(0,245,255,0.1)]"
                    : "border-white/5 bg-zinc-900/50 hover:border-white/10"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-s8ul-cyan to-s8ul-pink px-4 py-0.5 text-xs font-semibold text-black">
                    Best Value
                  </div>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-zinc-500">{plan.period}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{plan.fee}</p>
                <ul className="mt-6 space-y-3" role="list">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-zinc-300">
                      <svg className="h-4 w-4 shrink-0 text-s8ul-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/admin/login"
                  className={`mt-8 flex w-full items-center justify-center rounded-xl py-3 text-sm font-bold transition-all ${
                    plan.highlight
                      ? "bg-gradient-to-r from-s8ul-cyan to-s8ul-pink text-black hover:shadow-[0_0_30px_rgba(0,245,255,0.4)]"
                      : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why Us vs. Shopify ─── */}
      <section className="relative px-4 py-20 sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,245,255,0.03),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold font-display sm:text-4xl">
              Why Indian Creators Choose{" "}
              <span className="bg-gradient-to-r from-s8ul-cyan to-s8ul-pink bg-clip-text text-transparent">
                Us Over Shopify
              </span>
            </h2>
            <p className="mt-3 text-zinc-500">
              Shopify charges in dollars, adds app fees, and ignores Indian payment
              methods. We don&apos;t.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/5">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-zinc-900/80">
                  <th className="px-6 py-4 font-medium text-zinc-400">Feature</th>
                  <th className="px-6 py-4 font-semibold text-s8ul-cyan">CreatorStore</th>
                  <th className="px-6 py-4 font-medium text-zinc-600">Shopify</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-zinc-300">{row.feature}</td>
                    <td className="px-6 py-4 font-medium text-s8ul-cyan">{row.us}</td>
                    <td className="px-6 py-4 text-zinc-600">{row.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative px-4 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-zinc-900/50 to-transparent px-6 py-14 backdrop-blur-sm sm:px-12 sm:py-20">
            <h2 className="text-3xl font-bold font-display sm:text-4xl">
              Ready to Own Your Storefront?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-zinc-400">
              Join thousands of Indian creators who are done paying Silicon Valley
              prices. Start selling today — free, forever.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/admin/login"
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-s8ul-cyan to-s8ul-pink px-10 py-3.5 text-sm font-bold text-black transition-all hover:shadow-[0_0_30px_rgba(0,245,255,0.4)] sm:w-auto"
              >
                Create Your Store — Free
              </Link>
              <Link
                href="/admin/login"
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-10 py-3.5 text-sm font-medium text-zinc-300 backdrop-blur-sm transition-all hover:bg-white/10 sm:w-auto"
              >
                Sign In
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
