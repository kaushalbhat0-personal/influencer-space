"use client";

import type { ExperienceDivider } from "./theme-experience";

/**
 * SectionDivider (IMPLEMENTATION-45) — config-driven SVG/CSS section dividers.
 * aria-hidden, pointer-events-none. Deterministic (a given divider kind always
 * renders the same markup).
 */
export function SectionDivider({ kind, position = "bottom" }: { kind: ExperienceDivider; position?: "top" | "bottom" }) {
  if (kind === "none") return null;
  const key = `xp-divider-${kind}-${position}`;

  const svg = (() => {
    switch (kind) {
      case "wave":
        return (
          <svg key={key} aria-hidden className="pointer-events-none block h-8 w-full text-[var(--surface-root,#0A0A0B)] opacity-[0.06]" viewBox="0 0 1200 32" preserveAspectRatio="none" data-testid="divider-wave">
            <path d="M0 16 Q300 0 600 16 T1200 16 V32 H0 Z" fill="currentColor" />
          </svg>
        );
      case "curve":
        return (
          <svg key={key} aria-hidden className="pointer-events-none block h-8 w-full text-[var(--surface-root,#0A0A0B)] opacity-[0.06]" viewBox="0 0 1200 32" preserveAspectRatio="none" data-testid="divider-curve">
            <path d="M0 32 Q600 -16 1200 32 V32 H0 Z" fill="currentColor" />
          </svg>
        );
      case "diagonal":
        return (
          <svg key={key} aria-hidden className="pointer-events-none block h-8 w-full text-[var(--surface-root,#0A0A0B)] opacity-[0.06]" viewBox="0 0 1200 32" preserveAspectRatio="none" data-testid="divider-diagonal">
            <polygon points="0,32 1200,0 1200,32" fill="currentColor" />
          </svg>
        );
      case "glow":
        return (
          <div key={key} aria-hidden className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent" data-testid="divider-glow" />
        );
      case "brush":
        return (
          <svg key={key} aria-hidden className="pointer-events-none block h-6 w-full text-[var(--surface-root,#0A0A0B)] opacity-[0.04]" viewBox="0 0 1200 24" preserveAspectRatio="none" data-testid="divider-brush">
            <path d="M0 16 Q150 0 300 10 T600 8 T900 12 T1200 8 V24 H0 Z" fill="currentColor" />
          </svg>
        );
      case "organic":
        return (
          <svg key={key} aria-hidden className="pointer-events-none block h-10 w-full text-[var(--surface-root,#0A0A0B)] opacity-[0.05]" viewBox="0 0 1200 40" preserveAspectRatio="none" data-testid="divider-organic">
            <path d="M0 20 Q100 0 200 15 T450 10 T700 18 T950 8 T1200 14 V40 H0 Z" fill="currentColor" />
          </svg>
        );
      case "soft":
        return (
          <div key={key} aria-hidden className="pointer-events-none h-12 w-full" data-testid="divider-soft"
            style={{ background: "linear-gradient(to bottom, rgba(99,102,241,0.03), transparent 60%)" }} />
        );
      case "fade":
      default:
        return (
          <div key={key} aria-hidden className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" data-testid="divider-fade" />
        );
    }
  })();

  if (position === "top") {
    return <div className="relative z-0 rotate-180">{svg}</div>;
  }
  return <div className="relative z-0">{svg}</div>;
}
