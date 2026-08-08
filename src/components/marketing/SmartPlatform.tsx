import { Brain, HeartPulse, Target, TrendingUp, Sparkles, Compass } from "lucide-react";
import { Section, SectionHeading } from "./Section";

/** RCCF-IMPLEMENTATION-73 Phase 3 — Smart Platform messaging.
 * Every capability is REAL and backed by a runtime module, but presented in
 * creator language — never internal names. */
const CAPABILITIES = [
  {
    icon: Brain,
    title: "We automatically learn about your business",
    description: "Your storefront is built from your actual content — your brand, your audience, your style.",
    module: "Knowledge Runtime",
  },
  {
    icon: HeartPulse,
    title: "See how ready your store is to grow",
    description: "A live readiness check tells you exactly what's strong and what needs attention.",
    module: "Business Health Runtime",
  },
  {
    icon: Compass,
    title: "Know exactly what to do next",
    description: "Clear next steps that guide you from first product to first sale to growth.",
    module: "Customer Success Runtime",
  },
  {
    icon: Target,
    title: "Build a store that matches your goals",
    description: "Tell us your goals and your storefront is structured to help you reach them.",
    module: "Goals Runtime",
  },
  {
    icon: Sparkles,
    title: "Get personalized improvements",
    description: "Suggested improvements ranked by impact — based on your store, not a generic checklist.",
    module: "Recommendation Runtime",
  },
  {
    icon: TrendingUp,
    title: "A professional storefront, automatically optimized",
    description: "Pages, sections and conversions tuned as your business grows.",
    module: "Experience Intelligence",
  },
];

export function SmartPlatform() {
  return (
    <Section id="smart-platform" background="subtle">
      <SectionHeading
        title="A platform that works with you"
        subtitle="CreatorStore is more than a website builder — it understands your business and helps you grow it."
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((c) => (
          <div
            key={c.title}
            className="rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-6 transition-colors hover:border-white/[0.12]"
          >
            <c.icon className="h-5 w-5 text-indigo-400" aria-hidden="true" />
            <h3 className="mt-3 text-base font-semibold text-white">{c.title}</h3>
            <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{c.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
