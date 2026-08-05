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
  ...rest
}: ExperienceSectionProps) {
  const override = resolveOverride(experience, variant);
  const dividerKind: ExperienceDivider = override.divider ?? experience.divider;
  const decoration: ExperienceDecorationPack = override.decoration ?? experience.decoration;
  const motion: ExperienceMotion = override.motion ?? experience.motion;
  const surface: ExperienceSurface = override.surface ?? experience.surface;
  const background = mergeBackground(experience.background, override.background);

  const dividerPosition = divider ?? "bottom";
  const useDivider = dividerPosition !== "none";

  return (
    <section
      id={id}
      className={`relative overflow-hidden ${motionClass(motion)} ${alternateSurfaceClass(index, experience.alternateSurface === true)} ${className}`}
      {...rest}
    >
      <ExperienceBackground background={background} />
      {!override.reducedDecorations && <DecorationLayer pack={decoration} />}
      {override.heroBlend && (
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-40"
          style={{ background: "linear-gradient(to bottom, transparent, var(--surface-root, #0A0A0B))" }}
        />
      )}
      {useDivider && dividerPosition === "top" && <SectionDivider kind={dividerKind} position="top" />}
      <div className={`relative z-10 ${surfaceClass(surface)}`}>{children}</div>
      {useDivider && dividerPosition === "bottom" && <SectionDivider kind={dividerKind} position="bottom" />}
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
