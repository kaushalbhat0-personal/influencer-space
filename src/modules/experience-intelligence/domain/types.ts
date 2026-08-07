// ── Experience Intelligence — Domain Types ─────────────────
// RCCF-EPIC-08. Extends the existing Experience System so sections become
// aware of Business Health, Goals, Knowledge, Commerce, Trust, Theme, Device
// and page context — controlling appearance + behavior + composition +
// conversion hierarchy. Deterministic; consumes the Runtime Context only.

import type { HealthDimensionId } from "@/modules/business-health";
import type { GoalId } from "@/modules/goals-runtime";

export type SectionBase =
  | "hero"
  | "products"
  | "services"
  | "courses"
  | "gallery"
  | "timeline"
  | "testimonials"
  | "faq"
  | "games"
  | "contentFeed"
  | "links"
  | "newsletter"
  | "pricing"
  | "contact"
  | "footer";

/** Lightweight content counts used for adaptive visibility (no rebuild). */
export interface SectionContent {
  products: number;
  services: number;
  courses: number;
  bookings: number;
  gallery: number;
  faq: number;
  timeline: number;
  games: number;
  contentFeed: number;
  links: number;
  testimonials: number;
  offers: number;
}

export interface SectionIntelligenceDefinition {
  base: SectionBase;
  label: string;
  /** Base priority — lower = earlier on the homepage. */
  priority: number;
  /** 0-1 contribution to the conversion readiness score. */
  conversionWeight: number;
  trustWeight: number;
  commerceWeight: number;
  seoWeight: number;
  /** Business Health dimensions this section contributes to. */
  healthContribution: HealthDimensionId[];
  /** Sections that should appear first. */
  prerequisites: SectionBase[];
  /** Goals that favour this section. */
  preferredGoals: GoalId[];
  /** Entity types (knowledge packs) this section suits. */
  preferredIndustries: string[];
  pagePlacement: "home" | "home_or_page";
  /** "conditional" sections are hidden when their content is empty. */
  collapseRule: "conditional" | "always";
  /** 1 = highest priority on mobile. */
  mobilePriority: number;
  /** Whether the section collapses/stack to a compact form on mobile. */
  collapseOnMobile: boolean;
  /** Whether the section has meaningful content (drives adaptive visibility). */
  contentCheck: (content: SectionContent) => boolean;
}

export interface SectionPlanEntry {
  base: SectionBase;
  label: string;
  priority: number;
  /** Adaptive visibility — false when empty conditional content exists. */
  visible: boolean;
  collapseRule: "conditional" | "always";
  mobilePriority: number;
  collapseOnMobile: boolean;
  conversionWeight: number;
  trustWeight: number;
  commerceWeight: number;
  seoWeight: number;
}

export interface CTAPlan {
  primary: string;
  secondary: string | null;
}

export interface TrustSource {
  id: string;
  label: string;
  present: boolean;
  weight: number;
}

export interface TrustProfile {
  score: number;
  sources: TrustSource[];
}

export type ConversionDimensionId =
  | "cta"
  | "trust"
  | "commerce"
  | "content"
  | "navigation"
  | "speed"
  | "contact"
  | "seo";

export interface ConversionDimension {
  id: ConversionDimensionId;
  label: string;
  score: number;
  weight: number;
}

export interface ConversionScore {
  overall: number;
  dimensions: ConversionDimension[];
}

export interface ThemeEmphasis {
  whitespace: "compact" | "medium" | "high";
  mediaEmphasis: "low" | "medium" | "high";
  trustEmphasis: "low" | "medium" | "high";
  contentEmphasis: "low" | "medium" | "high";
}

export interface MobilePlan {
  base: SectionBase;
  mobilePriority: number;
  collapseOnMobile: boolean;
}

export interface ExperienceIntelligence {
  sectionPlan: Record<SectionBase, SectionPlanEntry>;
  /** Goal-aware homepage order (canonical bases, hero first, footer last). */
  homepageOrder: SectionBase[];
  /** Bases hidden by adaptive visibility (empty conditional content). */
  hiddenBases: SectionBase[];
  cta: CTAPlan;
  trust: TrustProfile;
  conversionScore: ConversionScore;
  themeEmphasis: ThemeEmphasis;
  mobile: MobilePlan[];
}
