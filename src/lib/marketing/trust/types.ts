export interface TrustTestimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  platform?: string;
  category?: string;
  quote: string;
  businessOutcome?: string;
  revenue?: string;
  rating?: number;
  storefrontUrl?: string;
  featured: boolean;
}

export interface TrustMetric {
  id: string;
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  description: string;
  category: "growth" | "performance" | "trust" | "commerce";
  sortOrder: number;
}

export interface TrustCaseStudy {
  id: string;
  title: string;
  creatorName: string;
  creatorAvatar: string;
  creatorPlatform: string;
  niche: string;
  before: string;
  after: string;
  timeSaved: string;
  productsLaunched: number;
  trafficIncrease: string;
  conversionImprovement: string;
  revenueIncrease?: string;
  storefrontUrl?: string;
  quote: string;
  cta: string;
  ctaHref: string;
  featured: boolean;
}

export interface TrustLogo {
  id: string;
  name: string;
  url?: string;
  category: "platform" | "payment" | "tool" | "customer";
}

export interface TrustAward {
  id: string;
  title: string;
  issuer: string;
  year: number;
  category: string;
  url?: string;
}

export interface TrustIntegration {
  id: string;
  name: string;
  category: "platform" | "payment" | "analytics" | "marketing" | "shipping";
  description: string;
}

export interface ComparisonCompetitor {
  id: string;
  name: string;
}

export interface ComparisonFeature {
  id: string;
  label: string;
  category: "storefront" | "commerce" | "content" | "marketing" | "management" | "agency";
  description: string;
}

export interface ComparisonEntry {
  feature: string;
  creatorStore: boolean | string;
  competitorA: boolean | string;
  competitorB: boolean | string;
  competitorC?: boolean | string;
}

export interface ComparisonConfig {
  id: string;
  title: string;
  creatorStoreLabel: string;
  competitors: ComparisonCompetitor[];
  features: ComparisonEntry[];
}

export interface TrustCTA {
  id: string;
  label: string;
  href: string;
  variant: "primary" | "secondary" | "ghost";
  icon?: string;
  audience: "creator" | "agency" | "enterprise" | "general";
  description?: string;
}

export interface CTADefinition {
  creator: TrustCTA;
  agency: TrustCTA;
  enterprise: TrustCTA;
  demo: TrustCTA;
  contact: TrustCTA;
}

export type TrustDataSource = "seed" | "analytics" | "database" | "crm" | "api";

export interface TrustDataProvider<T> {
  readonly source: TrustDataSource;
  readonly name: string;
  fetch(): T[] | Promise<T[]>;
}

export interface TrustRegistryConfig {
  enableTestimonials: boolean;
  enableMetrics: boolean;
  enableCaseStudies: boolean;
  enableComparison: boolean;
  enableAwards: boolean;
  enableIntegrations: boolean;
}

export const DEFAULT_TRUST_REGISTRY_CONFIG: TrustRegistryConfig = {
  enableTestimonials: true,
  enableMetrics: true,
  enableCaseStudies: true,
  enableComparison: true,
  enableAwards: false,
  enableIntegrations: true,
};
