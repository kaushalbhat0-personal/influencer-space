import { Link2, Brain, Layout, Palette, Rocket } from "lucide-react";

/**
 * RCCF-MKT-02-R1 — Section: how it works.
 * One semantic <ol> timeline (merges the old HowItWorks + CreatorJourney
 * bands). The old component rendered desktop AND mobile timelines
 * simultaneously, duplicating headings in the DOM — this renders a single
 * list whose orientation is CSS-only. Steps mirror the real onboarding
 * pipeline; no internal jargon and no overclaims.
 */
const STEPS = [
  {
    icon: Link2,
    title: "Paste your profile",
    body: "Drop in your YouTube channel, Instagram, or any link you already share. Your content, colors, and audience tell us who you are.",
  },
  {
    icon: Brain,
    title: "We learn your brand",
    body: "Your niche, style, and audience shape a site built from who you actually are — not a template.",
  },
  {
    icon: Layout,
    title: "Your home is built",
    body: "Pages, navigation, products, checkout, SEO, and social links come together as one complete site.",
  },
  {
    icon: Palette,
    title: "Make it yours",
    body: "Drag, drop, and tune every section in the visual builder. What you see is what you get.",
  },
  {
    icon: Rocket,
    title: "Launch and grow",
    body: "Publish to your own domain in one click, then add showcase, store, and links as you grow.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From profile to{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              home on the web
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            Minutes to launch. You stay in control of everything after.
          </p>
        </div>

        {/* Single timeline — horizontal on lg+, vertical below */}
        <ol className="relative mx-auto grid max-w-5xl gap-10 lg:grid-cols-5 lg:gap-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative flex gap-5 lg:flex-col lg:items-center lg:text-center">
              {/* Connector line (decorative) */}
              {i < STEPS.length - 1 && (
                <span
                  className="absolute left-[27px] top-14 h-[calc(100%-2rem)] w-px bg-white/[0.06] lg:left-auto lg:top-7 lg:h-px lg:w-[calc(100%+1.5rem)]"
                  aria-hidden="true"
                />
              )}
              <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                <step.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="pt-1 lg:pt-0">
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
