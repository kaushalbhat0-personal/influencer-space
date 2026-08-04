export { experienceRegistry } from "./experience-registry";
export type { ThemeInfo } from "./experience-registry";
export { ExperienceBackground } from "./background-runtime";
export { DecorationLayer } from "./decoration-runtime";
export { SectionDivider } from "./divider-runtime";
export { ExperienceSection, ExperienceHeroSection } from "./section-runtime";
export type { ExperienceSectionProps } from "./section-runtime";
export { motionClass, surfaceClass } from "./motion-runtime";
export { getDecorationPack, DECORATION_PACKS, CATEGORY_DECORATION } from "./category-decoration-packs";
export type { DecorationPack } from "./category-decoration-packs";
export { THEME_EXPERIENCES, THEME_TO_EXPERIENCE, EXPERIENCE_PACKS } from "./theme-experience";
export type {
  ThemeExperience,
  ExperienceBackground as ExperienceBackgroundConfig,
  ExperienceDecorationPack,
  ExperienceMotion,
  ExperienceDivider,
  ExperienceSurface,
} from "./theme-experience";
