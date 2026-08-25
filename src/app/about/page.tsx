import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Footer } from "@/components/marketing/Footer";
import { Section, SectionHeading } from "@/components/marketing/Section";
import { ABOUT_HERO_DATA, CREATOR_STATS } from "@/lib/marketing/content";
import { BRAND } from "@/lib/marketing/messaging";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about CreatorStore — the platform for your presence and your business. Our mission, story, and values. ${BRAND.shortDescription}`,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About — CreatorStore",
    description: "CreatorStore is a creator business platform. Learn about our mission to democratize creator commerce.",
  },
};

export default function AboutPage() {
  return (
    <main id="main-content" className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />

      {/* Hero */}
      <Section id="about-hero" background="gradient" containerClassName="text-center max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {ABOUT_HERO_DATA.title}
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          {ABOUT_HERO_DATA.subtitle}
        </p>
      </Section>

      {/* Mission */}
      <Section id="mission" background="subtle">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Our Mission</h2>
          <p className="mt-4 text-lg leading-relaxed text-zinc-400">
            {ABOUT_HERO_DATA.mission}
          </p>
        </div>
      </Section>

      {/* Stats */}
      <Section id="stats">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {CREATOR_STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-bold text-white sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-300">
                {stat.label}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Story */}
      <Section id="story" background="subtle">
        <SectionHeading title="Our Story" />
        <div className="mx-auto max-w-3xl space-y-4">
          {ABOUT_HERO_DATA.story.map((paragraph, i) => (
            <p key={i} className="text-base leading-relaxed text-zinc-400">
              {paragraph}
            </p>
          ))}
        </div>
      </Section>

      {/* Values */}
      <Section id="values">
        <SectionHeading title="Our Values" />
        <div className="grid gap-6 sm:grid-cols-2">
          {ABOUT_HERO_DATA.values.map((value) => (
            <div
              key={value.title}
              className="rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-6"
            >
              <h3 className="text-lg font-semibold text-white">
                {value.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <Section containerClassName="text-center">
        <div className="rounded-3xl border border-white/5 bg-gradient-to-b from-zinc-900/50 to-transparent px-6 py-14 backdrop-blur-sm sm:px-12 sm:py-20">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to build your creator business?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-zinc-400">
            Turn your presence into a real business on {BRAND.name} — your
            website, your work, and your offers in one place you own.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/signup?persona=creator" className="btn-primary text-sm">
              Start Free
            </Link>
            <Link href="/features" className="btn-secondary text-sm">
              View Features
            </Link>
          </div>
        </div>
      </Section>

      <Footer />
    </main>
  );
}
