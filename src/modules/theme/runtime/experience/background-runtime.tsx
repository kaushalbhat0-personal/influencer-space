"use client";

import { useId } from "react";
import type { ExperienceBackground as BackgroundConfig } from "./theme-experience";
import { BACKGROUND_ASSETS, type PatternAsset } from "./experience-assets";

/**
 * ExperienceBackground (IMPLEMENTATION-45) — renders the layered background for
 * a section: solid / gradient / mesh / radial / SVG pattern. Pure CSS + SVG
 * gradients (no raster). aria-hidden + pointer-events-none.
 */
export function ExperienceBackground({ background }: { background: BackgroundConfig }) {
  const uid = useId().replace(/:/g, "");
  if (background.kind === "none" || background.kind === "solid") {
    return <Layers glow={background.glow} pattern={background.pattern} patternId={uid} />;
  }

  if (background.kind === "radial") {
    return (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08), transparent 55%)",
          }}
        />
        <Layers glow={background.glow} pattern={background.pattern} patternId={uid} />
      </>
    );
  }

  if (background.kind === "gradient") {
    const colors = background.colors ?? ["rgba(99,102,241,0.06)", "transparent"];
    return (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(180deg, ${colors.join(", ")})` }}
        />
        <Layers glow={background.glow} pattern={background.pattern} patternId={uid} />
      </>
    );
  }

  // mesh — layered radial gradients (no raster, cheap to paint).
  const colors = background.colors ?? ["rgba(99,102,241,0.10)", "rgba(139,92,246,0.06)"];
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            `radial-gradient(ellipse 60% 50% at 20% 0%, ${colors[0]}, transparent)`,
            `radial-gradient(ellipse 50% 40% at 85% 100%, ${colors[1] ?? colors[0]}, transparent)`,
          ].join(","),
        }}
      />
      <Layers glow={background.glow} pattern={background.pattern} patternId={uid} />
    </>
  );
}

function Layers({ glow, pattern, patternId }: { glow?: string | null; pattern?: string | null; patternId: string }) {
  const asset = pattern ? (BACKGROUND_ASSETS[pattern] as PatternAsset | undefined) : undefined;
  return (
    <>
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 40% 30% at 50% ${glow === "top" ? "0%" : glow === "bottom" ? "100%" : "50%"}, rgba(99,102,241,0.05), transparent)`,
          }}
        />
      )}
      {asset && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.03]"
          dangerouslySetInnerHTML={{ __html: asset.body }}
        />
      )}
    </>
  );
}
