import type { Metadata } from "next";
import Link from "next/link";
import { Hammer, LayoutGrid, ShoppingBag, Megaphone, TrendingUp, Briefcase } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Footer } from "@/components/marketing/Footer";
import { Section, SectionHeading } from "@/components/marketing/Section";
import { PLATFORM_CAPABILITIES, AGENCY_CAPABILITIES, VALUE_PROPOSITIONS, BRAND } from "@/lib/marketing/messaging";

/**
 * RCCF-MKT-03: the seven repetitive capability sections are collapsed into one
 * bento of five conceptual pillars (Build · Showcase · Sell · Promote · Grow).
 * Partner-only capabilities live in their own clearly-labelled card so they
 * are never implied to be part of ordinary creator plans.
 */
const PILLAR_ICONS = {
  Build: Hammer,
  Showcase: LayoutGrid,
  Sell: ShoppingBag,
  Promote: Megaphone,
  Grow: TrendingUp,
} as const;

export const metadata: Metadata = {
  title: "Features",
  description: `Everything you need to run your creator business: profile-built storefronts, visual builder, commerce, order analytics, SEO, and agency tools. ${BRAND.shortDescription}`,
  alternates: { canonical: "/features" },
  openGraph: {
    title: "Features — CreatorStore",
    description: "Profile-built storefronts, visual drag-and-drop builder, native UPI commerce, order analytics, SEO, and agency platform — all in one.",
  },
};

export default function FeaturesPage() {
  return (
    <main id="main-content" className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />

      <Section
        id="features-hero"
        background="gradient"
        containerClassName="text-center max-w-3xl"
      >
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Everything you need to run your{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            creator business
          </span>
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          {BRAND.shortDescription} Storefront, products, payments, analytics,
          builder, and agency tools — all in one platform.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/signup" className="btn-primary text-sm">
            Start Free
          </Link>
          <Link href="/pricing" className="btn-secondary text-sm">
            See Pricing
          </Link>
        </div>
      </Section>

      {/* Value Propositions */}
      <Section id="value-props">
        <SectionHeading
          title="Why CreatorStore?"
          subtitle="Seven reasons creators choose us over templates, link-in-bio tools, and website builders."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {VALUE_PROPOSITIONS.map((vp) => (
            <div
              key={vp.id}
              className="rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-6"
            >
              <h3 className="text-lg font-semibold text-white">
                {vp.headline}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {vp.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Capability pillars — one composed grid, not a stack of sections */}
      <Section id="capabilities">
        <SectionHeading
          title="One home, everything under one roof"
          subtitle="The capabilities of your CreatorStore site — grouped by what they help you do."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_CAPABILITIES.map((category) => {
            const Icon = PILLAR_ICONS[category.category as keyof typeof PILLAR_ICONS] ?? LayoutGrid;
            return (
              <div
                key={category.category}
                className="rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-6"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-semibold text-white">
                    {category.category}
                  </h3>
                </div>
                <ul className="mt-4 space-y-2.5" role="list">
                  {category.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Partner-only capabilities — clearly separated from creator plans */}
          <div className="rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                <Briefcase className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="text-lg font-semibold text-white">For agencies &amp; partners</h3>
            </div>
            <ul className="mt-4 space-y-2.5" role="list">
              {AGENCY_CAPABILITIES.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-zinc-500">
              Available on Partner plans — creators on Creator plans keep every
              capability above for their own site.
            </p>
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <Section containerClassName="text-center">
        <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-zinc-900/50 to-transparent px-6 py-14 backdrop-blur-sm sm:px-12 sm:py-20">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to build your home online?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-zinc-400">
            Start from your profile, make it yours in the visual builder, and
            add showcase, store, and links when you&apos;re ready — one place
            you own. Free to start.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="btn-primary text-sm"
            >
              Start Free
            </Link>
            <Link
              href="/pricing"
              className="btn-secondary text-sm"
            >
              Compare Plans
            </Link>
          </div>
        </div>
      </Section>

      <Footer />
    </main>
  );
}
