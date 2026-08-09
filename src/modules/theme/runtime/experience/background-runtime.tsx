"use client";

import type { ExperienceBackground as BackgroundConfig } from "./theme-experience";
import { BACKGROUND_ASSETS, type PatternAsset } from "./experience-assets";

export function ExperienceBackground({ background }: { background: BackgroundConfig }) {
  const kind = background.kind;
  const colors = background.colors ?? [];

  // RCCF-LAUNCH-TRACK-07 (RC10a): fallback tints derive from the theme's
  // --brand-primary so backgrounds stay connected to the selected theme instead
  // of a fixed indigo. Experience-declared colors still win.
  const fallback = "color-mix(in srgb, var(--brand-primary,#6366F1) 8%, transparent)";

  if (kind === "none" || kind === "solid") {
    return <Layers glow={background.glow} pattern={background.pattern} />;
  }

  if (kind === "radial") {
    return (
      <>
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(ellipse at 50% 0%, ${fallback}, transparent 55%)` }} />
        <Layers glow={background.glow} pattern={background.pattern} />
      </>
    );
  }

  if (kind === "gradient") {
    const stops = colors.length > 0 ? colors.join(", ") : `${fallback}, transparent`;
    return (
      <>
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(180deg, ${stops})` }} />
        <Layers glow={background.glow} pattern={background.pattern} />
      </>
    );
  }

  if (kind === "multi-radial") {
    const c = (i: number) => colors[i] || colors[0] || fallback;
    return (
      <>
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: [
            `radial-gradient(ellipse 50% 30% at 15% 0%, ${c(0)}, transparent)`,
            `radial-gradient(ellipse 40% 25% at 85% 10%, ${c(1)}, transparent)`,
            `radial-gradient(ellipse 55% 35% at 50% 100%, ${c(2)}, transparent)`,
          ].join(",") }} />
        <Layers glow={background.glow} pattern={background.pattern} />
      </>
    );
  }

  if (kind === "aurora") {
    const c = (i: number) => colors[i] || fallback;
    return (
      <>
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: [
            `radial-gradient(ellipse 60% 40% at 20% 15%, ${c(0)}, transparent)`,
            `radial-gradient(ellipse 40% 30% at 80% 0%, ${c(1)}, transparent)`,
            `radial-gradient(ellipse 50% 35% at 40% 80%, ${c(2)}, transparent)`,
            `radial-gradient(ellipse 30% 25% at 90% 70%, ${c(3)}, transparent)`,
          ].join(",") }} />
        <Layers glow={background.glow} pattern={background.pattern} />
      </>
    );
  }

  if (kind === "pattern") {
    return <Layers glow={background.glow} pattern={background.pattern} />;
  }

  // mesh — layered dual radial
  const c = (i: number) => colors[i] || fallback;
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: [
          `radial-gradient(ellipse 60% 50% at 20% 0%, ${c(0)}, transparent)`,
          `radial-gradient(ellipse 50% 40% at 85% 100%, ${c(1) || c(0)}, transparent)`,
        ].join(",") }} />
      <Layers glow={background.glow} pattern={background.pattern} />
    </>
  );
}

function Layers({ glow, pattern }: { glow?: string | null; pattern?: string | null }) {
  const asset = pattern ? (BACKGROUND_ASSETS[pattern] as PatternAsset | undefined) : undefined;
  return (
    <>
      {glow && (
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(ellipse 40% 30% at 50% ${glow === "top" ? "0%" : glow === "bottom" ? "100%" : "50%"}, color-mix(in srgb, var(--brand-primary,#6366F1) 5%, transparent), transparent)` }} />
      )}
      {asset && (
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]"
          dangerouslySetInnerHTML={{ __html: asset.body }} />
      )}
    </>
  );
}
