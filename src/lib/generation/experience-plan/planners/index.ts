import type { Planner } from "./base";
import { HeroPlanner } from "./hero-planner";
import { NavigationPlanner } from "./navigation-planner";
import { FooterPlanner } from "./footer-planner";
import { ThemePlanner } from "./theme-planner";
import { LayoutPlanner } from "./layout-planner";
import { SectionPlanner } from "./section-planner";
import { CommercePlanner } from "./commerce-planner";
import { SocialProofPlanner } from "./social-proof-planner";
import { CTAPlanner } from "./cta-planner";
import { SEOPlanner } from "./seo-planner";
import { ConversionPlanner } from "./conversion-planner";
import { GalleryPlanner } from "./gallery-planner";
import { PagePlanner } from "./page-planner";

export type { Planner } from "./base";

const ALL_PLANNERS: Planner[] = [
  new HeroPlanner(),
  new NavigationPlanner(),
  new FooterPlanner(),
  new ThemePlanner(),
  new LayoutPlanner(),
  new SectionPlanner(),
  new CommercePlanner(),
  new SocialProofPlanner(),
  new CTAPlanner(),
  new SEOPlanner(),
  new ConversionPlanner(),
  new GalleryPlanner(),
  new PagePlanner(),
];

export function createDefaultPlanners(): Planner[] {
  return ALL_PLANNERS.map((p) => p);
}
