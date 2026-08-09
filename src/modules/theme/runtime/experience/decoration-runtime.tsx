"use client";

import { useId } from "react";
import { getDecorationPack } from "./category-decoration-packs";
import type { ExperienceDecorationPack } from "./theme-experience";
import { renderDecorationElement, renderIllustrationElement, ILLUSTRATION_PACKS, type IllustrationPack } from "./experience-assets";

/**
 * DecorationLayer (IMPLEMENTATION-45) — renders a config-driven SVG decoration
 * pack at low opacity (2–6%). Each element is positioned with CSS (valid
 * percentage layout; SVG transform percentages are not). aria-hidden,
 * pointer-events-none, never contains text. Reduced-motion disables any drift
 * via the global media query.
 */
export function DecorationLayer({ pack: packKey }: { pack: ExperienceDecorationPack }) {
  const uid = useId().replace(/:/g, "");
  const pack = getDecorationPack(packKey);
  if (pack.elements.length === 0) return null;

  return (
    <div aria-hidden data-testid="decoration-layer" className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.05] text-[var(--brand-primary,#6366F1)]">
      {pack.elements.map((el, i) => (
        <svg
          key={i}
          className="absolute"
          style={{ left: el.x, top: el.y, width: el.size, height: el.size }}
          viewBox={`0 0 ${el.size} ${el.size}`}
          fill="none"
        >
          <g dangerouslySetInnerHTML={{ __html: renderDecorationElement(el.kind, el.size, `${uid}-${i}`) }} />
        </svg>
      ))}
    </div>
  );
}

/**
 * IllustrationLayer (IMPLEMENTATION-48.2) — renders a themed SVG illustration
 * pack at 2–5% opacity. Provides category-specific visual identity without
 * overlapping interactive content.
 */
export function IllustrationLayer({ packId }: { packId: string }) {
  const pack: IllustrationPack | undefined = ILLUSTRATION_PACKS[packId];
  if (!pack || pack.elements.length === 0) return null;

  return (
    <div aria-hidden data-testid="illustration-layer" className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.05] text-[var(--brand-primary,#6366F1)]">
      {pack.elements.map((el, i) => (
        <svg
          key={i}
          className="absolute"
          style={{ left: el.x, top: el.y, width: el.size, height: el.size }}
          viewBox={`0 0 ${el.size} ${el.size}`}
          fill="none"
        >
          <g dangerouslySetInnerHTML={{ __html: renderIllustrationElement(el.kind, el.size) }} />
        </svg>
      ))}
    </div>
  );
}
