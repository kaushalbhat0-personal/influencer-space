import type { ReactNode } from "react";
import type { ThemeExperience, SectionVariant, SectionExperienceOverride, ExperienceDivider, ExperienceDecorationPack, ExperienceSurface, ExperienceMotion } from "./theme-experience";
import type { ExperienceBackground as BackgroundConfig } from "./theme-experience";
import { ExperienceBackground } from "./background-runtime";
import { DecorationLayer } from "./decoration-runtime";
import { SectionDivider } from "./divider-runtime";
import { motionClass, surfaceClass, alternateSurfaceClass } from "./motion-runtime";

export interface ExperienceSectionProps {
  experience: ThemeExperience;
  children: ReactNode;
  index?: number;
  className?: string;
  id?: string;
  /** Section variant for per-section experience overrides (hero, footer, commerce, etc.) */
  variant?: SectionVariant;
  /** Force a divider position for the first (hero) section. */
  divider?: "top" | "bottom" | "none";
  /** RCCF-BUILDER-05B: semantic flow for this section (shared/bleed/overlap/softSeparator/isolated). */
  flow?: import("./theme-experience").SectionFlow;
  "data-testid"?: string;
}

function resolveOverride(experience: ThemeExperience, variant?: SectionVariant): SectionExperienceOverride {
  const overrides = variant ? experience.sections?.[variant] : undefined;
  return overrides ?? {};
}

function mergeBackground(base: BackgroundConfig, override?: Partial<BackgroundConfig>): BackgroundConfig {
  if (!override) return base;
  return { ...base, ...override, colors: override.colors ?? base.colors, glow: override.glow !== undefined ? override.glow : base.glow, pattern: override.pattern !== undefined ? override.pattern : base.pattern };
}

/**
 * ExperienceSection (IMPLEMENTATION-45/IMPLEMENTATION-48.1) — section-aware
 * composable that layers a theme's background, decoration, motion, surface and
 * divider. Each SectionVariant can override the base experience for unique
 * per-section treatments (hero blends, footer minimalism, commerce/gallery
 * decoration variety).
 */
export function ExperienceSection({
  experience,
  children,
  index = 0,
  className = "",
  id,
  divider,
  variant,
  flow,
  ...rest
}: ExperienceSectionProps) {
  const override = resolveOverride(experience, variant);
  const dividerKind: ExperienceDivider = override.divider ?? experience.divider;
  const decoration: ExperienceDecorationPack = override.decoration ?? experience.decoration;
  const motion: ExperienceMotion = override.motion ?? experience.motion;
  const surface: ExperienceSurface = override.surface ?? experience.surface;
  const background = mergeBackground(experience.background, override.background);
  // RCCF-BUILDER-05B: semantic flow — theme-family default via experience.defaultFlow, per-variant override via sections[Variant].flow, or explicit prop (renderingHints)
  const effectiveFlow = (flow as string) ?? (override as { flow?: string }).flow ?? (experience as { defaultFlow?: string }).defaultFlow ?? "shared";
  const isShared = effectiveFlow === "shared";
  const isBleed = effectiveFlow === "bleed";
  const isOverlap = effectiveFlow === "overlap";
  const isSoftSeparator = effectiveFlow === "softSeparator";
  const isIsolated = effectiveFlow === "isolated";
  // RCCF-BUILDER-06D: background ownership — PAGE owns the ambient background.
  // Sections are transparent by default (shared/bleed/softSeparator/overlap) and
  // only isolated sections paint their own background box.
  const shouldRenderBackground = isIsolated;
  const shouldRenderDecoration = isIsolated && !override.reducedDecorations;
  // Flow determines whether section surface is isolated (card-like) or shares page surface
  const useSurface = isIsolated || (!isShared && !isBleed && !isSoftSeparator && !isOverlap);
  const effectiveDivider: ExperienceDivider = isShared || isBleed ? "none" : isSoftSeparator ? "soft" : isOverlap ? "none" : dividerKind;
  const dividerPosition = divider ?? "bottom";
  const useDivider = dividerPosition !== "none" && effectiveDivider !== "none";

  // Bounded overlap: desktop <=2rem, mobile <=1rem (no arbitrary negative margins, no viewport overflow)
  const overlapStyle = isOverlap
    ? {
        marginTop: "clamp(-2rem, calc(var(--section-spacing, 3rem) * -0.5), -1rem)",
      } as React.CSSProperties
    : undefined;

  // RCCF-BUILDER-06D: fullBleed must remain horizontally safe — w-full only, never viewport hacks
  const fullBleed = (override as { fullBleed?: boolean }).fullBleed === true && isBleed;

  return (
    <section
      id={id}
      className={`relative ${fullBleed ? "w-full" : ""} overflow-hidden ${motionClass(motion)} ${isIsolated ? alternateSurfaceClass(index, experience.alternateSurface === true) : ""} ${className}`}
      style={overlapStyle}
      {...rest}
    >
      {shouldRenderBackground && <ExperienceBackground background={background} />}
      {shouldRenderDecoration && <DecorationLayer pack={decoration} />}
      {override.heroBlend && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-40"
          style={{ background: "linear-gradient(to bottom, transparent, var(--surface-root, #0A0A0B))" }}
        />
      )}
      {useDivider && dividerPosition === "top" && <SectionDivider kind={effectiveDivider} position="top" />}
      <div className={`relative z-10 ${useSurface ? surfaceClass(surface) : ""} ${fullBleed ? "mx-auto w-full max-w-none" : ""}`}>{children}</div>
      {useDivider && dividerPosition === "bottom" && <SectionDivider kind={effectiveDivider} position="bottom" />}
    </section>
  );
}

/** Hero variant — no top divider, blends into the next section. Fades vertically. */
export function ExperienceHeroSection({
  experience,
  ...rest
}: Omit<ExperienceSectionProps, "divider" | "variant">) {
  return <ExperienceSection {...rest} experience={experience} variant="hero" divider="bottom" index={0} />;
}
