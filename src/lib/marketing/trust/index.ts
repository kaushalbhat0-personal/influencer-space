export { TrustRegistry } from "./registry";
export { SEED_TESTIMONIALS } from "./testimonials";
export { SEED_METRICS } from "./metrics";
export { SEED_CASE_STUDIES } from "./case-studies";
// RCCF-MKT-04-R1: SEED_COMPARISONS re-export removed — comparison.ts no longer
// ships seed data (the homepage never rendered ComparisonTable; runtime
// capabilityService remains the authority for plan feature claims).
export { SEED_CTAS } from "./cta";
export { SEED_LOGOS } from "./logos";

export type {
  TrustTestimonial,
  TrustMetric,
  TrustCaseStudy,
  TrustLogo,
  TrustAward,
  TrustIntegration,
  ComparisonConfig,
  ComparisonCompetitor,
  ComparisonFeature,
  ComparisonEntry,
  TrustCTA,
  CTADefinition,
  TrustDataProvider,
  TrustDataSource,
  TrustRegistryConfig,
} from "./types";

export { DEFAULT_TRUST_REGISTRY_CONFIG } from "./types";
