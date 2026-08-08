import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Footer } from "@/components/marketing/Footer";
import { Section, SectionHeading } from "@/components/marketing/Section";
import { PLATFORM_CAPABILITIES, VALUE_PROPOSITIONS, BRAND } from "@/lib/marketing/messaging";

export const metadata: Metadata = {
  title: "Features",
  description: `Everything you need to run your creator business: AI storefront generation, visual builder, commerce, analytics, SEO, and agency tools. ${BRAND.shortDescription}`,
  openGraph: {
    title: "Features â€” CreatorStore",
    description: "AI-powered storefront generation, visual drag-and-drop builder, native UPI commerce, analytics, SEO, and agency platform â€” all in one.",
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
          builder, and agency tools â€” all in one platform.
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

      {/* Platform Capabilities */}
      {PLATFORM_CAPABILITIES.map((category) => (
        <Section
          key={category.category}
          id={`features-${category.category.toLowerCase()}`}
          background="subtle"
        >
          <SectionHeading
            title={category.category}
            align="left"
          />
          <ul className="grid gap-3 sm:grid-cols-2" role="list">
            {category.items.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 text-sm text-zinc-300"
              >
                <svg
                  className="h-4 w-4 flex-shrink-0 text-emerald-400"
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
                {item}
              </li>
            ))}
          </ul>
        </Section>
      ))}

      {/* Final CTA */}
      <Section containerClassName="text-center">
        <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-zinc-900/50 to-transparent px-6 py-14 backdrop-blur-sm sm:px-12 sm:py-20">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to build your creator business?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-zinc-400">
            Paste your profile URL. AI builds your storefront in under two
            minutes. Free to start.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="btn-primary text-sm"
            >
              Generate My Storefront â€” Free
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
