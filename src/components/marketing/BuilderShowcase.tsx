"use client";

import { Layout, Eye, Palette, MousePointerClick, Smartphone, Globe } from "lucide-react";
import Link from "next/link";

const BUILDER_FEATURES = [
  {
    icon: MousePointerClick,
    title: "Drag & Drop",
    body: "Move sections, rearrange blocks, and build your layout visually. No code required.",
  },
  {
    icon: Layout,
    title: "Section Library",
    body: "Choose from hero, products, gallery, testimonials, CTA, and more. Add what you need.",
  },
  {
    icon: Palette,
    title: "Theme & Style",
    body: "Customize colors, fonts, spacing, and backgrounds. Your brand, your rules.",
  },
  {
    icon: Eye,
    title: "Real-Time Preview",
    body: "See every change instantly as you edit. What you see is exactly what you get.",
  },
  {
    icon: Smartphone,
    title: "Responsive by Default",
    body: "Every layout works beautifully on desktop, tablet, and mobile — automatically.",
  },
  {
    icon: Globe,
    title: "One-Click Publish",
    body: "Publish your storefront to your domain and take it live in seconds — no downtime.",
  },
];

export function BuilderShowcase() {

  return (
    <section id="builder" className="relative px-4 py-20 sm:px-8 sm:py-28 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.04),transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Powerful{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              visual builder
            </span>
          </h2>
          <p className="mt-3 text-zinc-500 max-w-2xl mx-auto">
            Your storefront is built from your profile. You make it yours. Drag, drop, and
            customize every detail with our visual builder.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BUILDER_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-6 transition-all hover:border-white/[0.12]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {feature.body}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/signup?persona=creator"
            className="btn-primary inline-flex text-sm"
          >
            Try the Builder Free
          </Link>
        </div>
      </div>
    </section>
  );
}
