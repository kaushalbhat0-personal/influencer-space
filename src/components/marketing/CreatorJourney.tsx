import { Link2, Brain, LayoutGrid, Palette, Rocket, ShoppingBag, TrendingUp } from "lucide-react";
import { Section, SectionHeading } from "./Section";

/** RCCF-IMPLEMENTATION-73 Phase 8 — the guided creator journey. Mirrors the real
 * onboarding pipeline stages (import → understand → build → customize → publish
 * → sell → grow). No invented flow. */
const JOURNEY = [
  { icon: Link2, title: "Paste your profile", description: "Share your YouTube, Instagram, or TikTok link." },
  { icon: Brain, title: "We understand your business", description: "Your brand, audience and style are learned automatically." },
  { icon: LayoutGrid, title: "Your store is created", description: "A storefront with products, checkout and SEO — built for you." },
  { icon: Palette, title: "Make it yours", description: "Drag, drop and customize every section in the builder." },
  { icon: Rocket, title: "Launch", description: "Publish to your own domain with free SSL." },
  { icon: ShoppingBag, title: "Start selling", description: "Sell products, services, courses and bookings." },
  { icon: TrendingUp, title: "Grow", description: "Get next-step guidance as your business grows." },
];

export function CreatorJourney() {
  return (
    <Section id="creator-journey">
      <SectionHeading
        title="From profile to profit"
        subtitle="A guided path that takes you from your first profile link to your first sale — step by step."
      />
      <ol className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {JOURNEY.map((step, i) => (
          <li key={step.title} className="relative rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-5">
            <span className="absolute right-4 top-4 text-2xl font-bold text-white/[0.06]">{i + 1}</span>
            <step.icon className="h-5 w-5 text-indigo-400" aria-hidden="true" />
            <h3 className="mt-3 text-sm font-semibold text-white">{step.title}</h3>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{step.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
