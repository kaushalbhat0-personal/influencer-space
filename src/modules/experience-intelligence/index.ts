// ── Experience Intelligence (RCCF-EPIC-08) ──────────────────
// Extends the existing Experience System so every section is aware of Business
// Health, Goals, Knowledge, Commerce, Trust, Theme, Device and page context —
// controlling appearance + behavior + composition + conversion hierarchy.
// Deterministic; consumes the Runtime Context only.

// Domain
export { SECTION_INTELLIGENCE_REGISTRY, getSectionIntelligence, isRegisteredSection } from "./domain/section-registry";
export { computeTrustProfile, type TrustInput } from "./domain/trust-runtime";
export { ctaFor, ctaForProfile } from "./domain/cta";
export { themeEmphasisFor } from "./domain/theme-intelligence";
export type {
  SectionBase,
  SectionContent,
  SectionIntelligenceDefinition,
  SectionPlanEntry,
  CTAPlan,
  TrustSource,
  TrustProfile,
  ConversionDimensionId,
  ConversionDimension,
  ConversionScore,
  ThemeEmphasis,
  MobilePlan,
  ExperienceIntelligence,
} from "./domain/types";

// Application
export {
  computeExperienceIntelligence,
  baseOf,
  type ExperienceIntelligenceOptions,
} from "./application/runtime";
export {
  computeConversionScore,
  CONVERSION_DIMENSIONS,
  trustInputFrom,
} from "./application/conversion-score";
export {
  contentFromSnapshot,
  contentFromAggregate,
  resolveAdaptiveVisibility,
  resolveHomepageOrder,
} from "./application/composition";
export {
  computeExperienceAnalytics,
  type ExperienceAnalyticsReport,
} from "./application/analytics";
