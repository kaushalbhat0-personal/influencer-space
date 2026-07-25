import { Star } from "lucide-react";
import type { TrustTestimonial } from "@/lib/marketing/trust/types";

interface TestimonialGridProps {
  readonly testimonials: readonly TrustTestimonial[];
  readonly columns?: 2 | 3;
}

export function TestimonialGrid({
  testimonials,
  columns = 3,
}: TestimonialGridProps) {
  if (testimonials.length === 0) return null;

  return (
    <div
      className={`grid gap-6 ${
        columns === 3
          ? "sm:grid-cols-2 lg:grid-cols-3"
          : "sm:grid-cols-2"
      }`}
    >
      {testimonials.map((t) => (
        <div
          key={t.id}
          className="flex flex-col rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/50 p-6"
        >
          {/* Rating */}
          {t.rating != null && (
            <div className="mb-3 flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < (t.rating ?? 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-zinc-700"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Quote */}
          <blockquote className="flex-1 text-sm leading-relaxed text-zinc-400">
            &ldquo;{t.quote}&rdquo;
          </blockquote>

          {/* Outcome */}
          {t.businessOutcome && (
            <div className="mt-4 inline-flex self-start rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
              {t.businessOutcome}
            </div>
          )}

          {/* Author */}
          <div className="mt-4 flex items-center gap-2.5 border-t border-white/[0.06] pt-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-400">
              {t.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{t.name}</p>
              <p className="text-xs text-zinc-500">
                {t.role}
                {t.platform && ` · ${t.platform}`}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
