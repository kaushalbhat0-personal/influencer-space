import { Link2, Sparkles, Layout, Globe } from "lucide-react";

const STEPS = [
  {
    step: 1,
    icon: Link2,
    title: "Paste your URL",
    body: "Drop in a YouTube channel, Instagram profile, or any creator link. We analyze your content, niche, brand colors, audience, and social presence.",
    accent: "text-indigo-400",
    accentBg: "bg-indigo-500/10",
    accentBorder: "border-indigo-500/20",
  },
  {
    step: 2,
    icon: Sparkles,
    title: "Your brand, understood",
    body: "We identify your niche, style, and audience, then plan a storefront tailored to your content. Every site is built from who you actually are — not a template.",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/20",
  },
  {
    step: 3,
    icon: Layout,
    title: "Everything generated",
    body: "Hero, navigation, products, checkout, SEO, and social links are composed into a complete business platform. The Planner DAG ensures every piece fits together perfectly for your niche.",
    accent: "text-violet-400",
    accentBg: "bg-violet-500/10",
    accentBorder: "border-violet-500/20",
  },
  {
    step: 4,
    icon: Globe,
    title: "Customize & Publish",
    body: "Use the visual drag-and-drop builder to make it yours. Rearrange sections, change themes, add products. Publish to your own domain with one click.",
    accent: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/20",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              CreatorStore
            </span>{" "}
            works
          </h2>
          <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
            From social profile to complete business platform in under two
            minutes. The heavy lifting is handled — you stay in control.
          </p>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="relative hidden lg:block">
          <div className="absolute top-12 left-[12.5%] right-[12.5%] h-px bg-white/[0.06]" />
          <div className="grid grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.step} className="relative flex flex-col items-center text-center group">
                <div className={`relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-xl ${step.accentBg} border ${step.accentBorder} transition-all group-hover:scale-105`}>
                  <step.icon className={`h-6 w-6 ${step.accent}`} aria-hidden="true" />
                </div>
                <span className={`mb-2 text-xs font-semibold uppercase tracking-wider ${step.accent}`}>
                  Step {step.step}
                </span>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400 max-w-xs">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile/Tablet: vertical timeline */}
        <div className="relative lg:hidden">
          <div className="absolute left-7 top-0 bottom-0 w-px bg-white/[0.06]" />
          <div className="space-y-10">
            {STEPS.map((step) => (
              <div key={step.step} className="relative flex gap-5">
                <div className="relative z-10 flex-shrink-0">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${step.accentBg} border ${step.accentBorder}`}>
                    <step.icon className={`h-6 w-6 ${step.accent}`} aria-hidden="true" />
                  </div>
                </div>
                <div className="flex-1 pt-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${step.accent}`}>Step {step.step}</span>
                  <h3 className="mt-1 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
