import Link from "next/link";
import { ClipboardList, Sparkles, Wand2, Rocket } from "lucide-react";

const STEPS = [
  {
    step: 1,
    icon: ClipboardList,
    title: "Paste your link",
    body: "Drop in a YouTube channel, Instagram profile, or any creator URL. That's all we need to get started.",
    accent: "text-indigo-400",
    accentBg: "bg-indigo-500/10",
    accentBorder: "border-indigo-500/20",
  },
  {
    step: 2,
    icon: Sparkles,
    title: "AI understands",
    body: "We extract your brand, content, products, links, and identity. No forms. No manual entry.",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/20",
  },
  {
    step: 3,
    icon: Wand2,
    title: "AI builds",
    body: "Your storefront, products, gallery, checkout, and SEO are generated — ready to customize.",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "border-amber-500/20",
  },
  {
    step: 4,
    icon: Rocket,
    title: "Launch & grow",
    body: "Publish with one click. Sell products, track orders, and grow your audience. All from one dashboard.",
    accent: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/20",
  },
];

export function HowItWorks() {
  return (
    <section className="relative px-4 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              CreatorStore
            </span>{" "}
            works
          </h2>
          <p className="mt-3 text-zinc-500">
            From link to live storefront in under two minutes.
          </p>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="relative hidden lg:block">
          {/* Connecting line */}
          <div className="absolute top-12 left-[12.5%] right-[12.5%] h-px bg-white/[0.06]" />

          <div className="grid grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.step} className="relative flex flex-col items-center text-center group">
                {/* Step number + icon */}
                <div
                  className={`relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${step.accentBg} border ${step.accentBorder} transition-all group-hover:scale-105`}
                >
                  <step.icon className={`h-5 w-5 ${step.accent}`} aria-hidden="true" />
                </div>

                {/* Content */}
                <span className={`mb-2 text-xs font-semibold uppercase tracking-wider ${step.accent}`}>
                  Step {step.step}
                </span>
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile/Tablet: vertical timeline */}
        <div className="relative lg:hidden">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-white/[0.06]" />

          <div className="space-y-8">
            {STEPS.map((step) => (
              <div key={step.step} className="relative flex gap-5">
                {/* Step indicator */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${step.accentBg} border ${step.accentBorder}`}
                  >
                    <step.icon className={`h-5 w-5 ${step.accent}`} aria-hidden="true" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1.5">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${step.accent}`}>
                    Step {step.step}
                  </span>
                  <h3 className="mt-0.5 text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <Link href="/signup" className="btn-primary px-10 py-3.5 text-sm">
            Start Building Free
          </Link>
        </div>
      </div>
    </section>
  );
}
