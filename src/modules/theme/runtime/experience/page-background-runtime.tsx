import type { ReactNode } from "react";
import type { ThemeExperience } from "./theme-experience";
import { ExperienceBackground } from "./background-runtime";
import { DecorationLayer } from "./decoration-runtime";

/**
 * RCCF-BUILDER-06D — Page-level experience background.
 *
 * Paints the page background, ambient decoration and texture ONCE per page.
 * Sections compose transparently over this layer via their flow contract.
 *
 * Ownership:
 *   PAGE  → background / ambient decoration / global texture / image
 *   SECTION → flow composition (shared/bleed/softSeparator/overlap/isolated)
 *   CONTENT → cards where semantically required
 *
 * Decorative layers remain aria-hidden + pointer-events-none.
 */
export function PageExperienceBackground({ experience }: { experience: ThemeExperience }) {
  return (
    <div
      aria-hidden
      data-testid="page-experience-background"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <ExperienceBackground background={experience.background} />
      <DecorationLayer pack={experience.decoration} />
    </div>
  );
}

export function PageExperience({
  experience,
  children,
  className = "",
}: {
  experience: ThemeExperience;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-testid="page-experience" className={`relative ${className}`}>
      <PageExperienceBackground experience={experience} />
      <div className="relative z-0">{children}</div>
    </div>
  );
}
