"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { TrustTestimonial } from "@/lib/marketing/trust/types";
import { Section } from "@/components/marketing/Section";

interface TestimonialCarouselProps {
  readonly testimonials: readonly TrustTestimonial[];
  readonly title?: string;
  readonly subtitle?: string;
}

export function TestimonialCarousel({
  testimonials,
  title = "What creators are saying",
  subtitle = "Real stories from creators who built their business with CreatorStore.",
}: TestimonialCarouselProps) {
  const [current, setCurrent] = useState(0);
  const total = testimonials.length;

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + total) % total);
  }, [total]);

  if (total === 0) return null;

  const t = testimonials[current];

  return (
    <Section id="testimonials" background="subtle">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 text-zinc-500 max-w-xl mx-auto">{subtitle}</p>
      </div>

      <div className="relative mt-12 mx-auto max-w-3xl">
        <div className="rounded-2xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-8 sm:p-10">
          {/* Rating */}
          {t.rating != null && (
            <div className="mb-4 flex gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < (t.rating ?? 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-zinc-700"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Quote */}
          <blockquote className="text-base leading-relaxed text-zinc-300 sm:text-lg">
            &ldquo;{t.quote}&rdquo;
          </blockquote>

          {/* Outcome */}
          {t.businessOutcome && (
            <div className="mt-4 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              {t.businessOutcome}
            </div>
          )}

          {/* Author */}
          <div className="mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
              {t.name.charAt(0)}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white">{t.name}</p>
              <p className="text-xs text-zinc-500">
                {t.role}
                {t.platform && ` · ${t.platform}`}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={prev}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.06] text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 w-2 rounded-full transition-all ${
                  i === current
                    ? "bg-indigo-400 w-5"
                    : "bg-zinc-700 hover:bg-zinc-600"
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.06] text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Section>
  );
}
