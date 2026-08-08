export { experienceRegistry } from "./experience-registry";
export type { ThemeInfo } from "./experience-registry";
export { ExperienceBackground } from "./background-runtime";
export { DecorationLayer, IllustrationLayer } from "./decoration-runtime";
export { SectionDivider } from "./divider-runtime";
export { ExperienceSection, ExperienceHeroSection } from "./section-runtime";
export type { ExperienceSectionProps } from "./section-runtime";
export { ThemedPlaceholder } from "./themed-placeholder";
export { motionClass, surfaceClass } from "./motion-runtime";
export { getDecorationPack, DECORATION_PACKS, CATEGORY_DECORATION } from "./category-decoration-packs";
export type { DecorationPack } from "./category-decoration-packs";
export { THEME_EXPERIENCES, THEME_TO_EXPERIENCE, EXPERIENCE_PACKS, EXPERIENCE_MIN_PLAN, isExperienceAvailableForPlan } from "./theme-experience";
// RCCF-LAUNCH-POLISH-06: canonical theme-capability helpers (Capability Runtime).
export {
  THEME_CAPABILITY,
  BACKGROUND_KIND_CAP,
  requiredCapabilitiesForExperience,
  experienceAvailableForPlan,
  canUseCapability,
  resolveExperienceForCapabilities,
} from "./capabilities";
export type { ThemeCapability } from "./capabilities";
export type {
  ThemeExperience,
  ExperienceBackground as ExperienceBackgroundConfig,
  ExperienceDecorationPack,
  ExperienceMotion,
  ExperienceDivider,
  ExperienceSurface,
  SectionVariant,
  SectionExperienceOverride,
} from "./theme-experience";
