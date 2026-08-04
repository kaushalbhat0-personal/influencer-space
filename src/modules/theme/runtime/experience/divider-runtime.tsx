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
          <svg key={key} aria-hidden className="pointer-events-none block h-8 w-full text-[var(--surface-root,#0A0A0B)]" viewBox="0 0 1200 32" preserveAspectRatio="none" data-testid="divider-wave">
            <path d="M0 16 Q300 0 600 16 T1200 16 V32 H0 Z" fill="currentColor" />
          </svg>
        );
      case "curve":
        return (
          <svg key={key} aria-hidden className="pointer-events-none block h-8 w-full text-[var(--surface-root,#0A0A0B)]" viewBox="0 0 1200 32" preserveAspectRatio="none" data-testid="divider-curve">
            <path d="M0 32 Q600 -16 1200 32 V32 H0 Z" fill="currentColor" />
          </svg>
        );
      case "diagonal":
        return (
          <svg key={key} aria-hidden className="pointer-events-none block h-8 w-full text-[var(--surface-root,#0A0A0B)]" viewBox="0 0 1200 32" preserveAspectRatio="none" data-testid="divider-diagonal">
            <polygon points="0,32 1200,0 1200,32" fill="currentColor" />
          </svg>
        );
      case "glow":
        return (
          <div key={key} aria-hidden className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" data-testid="divider-glow" />
        );
      case "fade":
      default:
        return (
          <div key={key} aria-hidden className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" data-testid="divider-fade" />
        );
    }
  })();

  if (position === "top") {
    return <div className="relative z-0 rotate-180">{svg}</div>;
  }
  return <div className="relative z-0">{svg}</div>;
}
