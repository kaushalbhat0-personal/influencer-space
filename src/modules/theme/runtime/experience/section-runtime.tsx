import type { ReactNode } from "react";
import type { ThemeExperience } from "./theme-experience";
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
  /** Force a divider position for the first (hero) section. */
  divider?: "top" | "bottom" | "none";
  "data-testid"?: string;
}

/**
 * ExperienceSection (IMPLEMENTATION-45) — the single composable that layers a
 * theme's background, decoration, motion, surface and divider onto a section.
 * Pages never hardcode decorations; everything is configuration-driven.
 */
export function ExperienceSection({
  experience,
  children,
  index = 0,
  className = "",
  id,
  divider,
  ...rest
}: ExperienceSectionProps) {
  const dividerPosition = divider ?? "bottom";
  const useDivider = dividerPosition !== "none";

  return (
    <section
      id={id}
      className={`relative overflow-hidden ${motionClass(experience.motion)} ${alternateSurfaceClass(index, experience.alternateSurface === true)} ${className}`}
      {...rest}
    >
      <ExperienceBackground background={experience.background} />
      <DecorationLayer pack={experience.decoration} />
      {useDivider && dividerPosition === "top" && <SectionDivider kind={experience.divider} position="top" />}
      <div className={`relative z-10 ${surfaceClass(experience.surface)}`}>{children}</div>
      {useDivider && dividerPosition === "bottom" && <SectionDivider kind={experience.divider} position="bottom" />}
    </section>
  );
}

/** Hero variant — no divider at the top, merges into the next section. */
export function ExperienceHeroSection(props: Omit<ExperienceSectionProps, "divider">) {
  return <ExperienceSection {...props} divider="bottom" index={0} />;
}
