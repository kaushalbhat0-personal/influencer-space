"use client";

import Link from "next/link";
import { Check } from "lucide-react";

/**
 * RCCF-MKT-02-R1 — Section 6: Build.
 * "Build a site that feels like yours." Website-builder capability stated in
 * the builder's own terms (drag & drop sections, themes, real-time preview,
 * responsive, one-click publish) — no invented features. Checklist layout
 * replaces the old 6-card icon grid.
 */
const BUILDER_POINTS = [
  {
    title: "Drag and drop sections",
    body: "Hero, products, gallery, testimonials, FAQ — arrange your pages visually. No code.",
  },
  {
    title: "Themes and styles",
    body: "Colors, fonts, spacing, and backgrounds tuned to your brand — with real-time preview.",
  },
  {
    title: "Responsive by default",
    body: "Every layout works on desktop, tablet, and mobile automatically.",
  },
  {
    title: "One-click publish",
    body: "Publish to your CreatorStore domain, or connect your own with free SSL on eligible plans.",
  },
] as const;

export function BuilderShowcase() {
  return (
    <section id="builder" className="relative px-4 py-20 sm:px-8 sm:py-28 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.04),transparent_60%)]" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Build a site that{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                feels like yours
              </span>
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
              Your home starts from your profile — then the visual builder puts
              every section in your hands. CreatorStore is more than a checkout
              page; it&rsquo;s a website you actually own.
            </p>
            <div className="mt-8">
              <Link href="/signup?persona=creator" className="btn-primary inline-flex text-sm">
                Try the Builder Free
              </Link>
            </div>
          </div>

          {/* Capability checklist */}
          <ul className="space-y-4" role="list" aria-label="Builder capabilities">
            {BUILDER_POINTS.map((point) => (
              <li
                key={point.title}
                className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/40 p-5"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{point.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{point.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
