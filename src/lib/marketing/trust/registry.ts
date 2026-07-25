import type {
  TrustTestimonial,
  TrustMetric,
  TrustCaseStudy,
  TrustLogo,
  TrustAward,
  TrustIntegration,
  ComparisonConfig,
  TrustCTA,
  TrustDataProvider,
  TrustRegistryConfig,
} from "./types";
import { DEFAULT_TRUST_REGISTRY_CONFIG } from "./types";

export class TrustRegistry {
  private testimonials: TrustTestimonial[] = [];
  private metrics: TrustMetric[] = [];
  private caseStudies: TrustCaseStudy[] = [];
  private logos: TrustLogo[] = [];
  private awards: TrustAward[] = [];
  private integrations: TrustIntegration[] = [];
  private comparisons: ComparisonConfig[] = [];
  private ctaDefinitions: Map<string, TrustCTA> = new Map();

  private testimonialProviders: TrustDataProvider<TrustTestimonial>[] = [];
  private metricProviders: TrustDataProvider<TrustMetric>[] = [];

  private config: TrustRegistryConfig;

  constructor(config?: Partial<TrustRegistryConfig>) {
    this.config = { ...DEFAULT_TRUST_REGISTRY_CONFIG, ...config };
  }

  // ── Seed / Static Data ─────────────────────────────────────

  seedTestimonials(items: TrustTestimonial[]): void {
    this.testimonials = [...items];
  }

  seedMetrics(items: TrustMetric[]): void {
    this.metrics = [...items];
  }

  seedCaseStudies(items: TrustCaseStudy[]): void {
    this.caseStudies = [...items];
  }

  seedLogos(items: TrustLogo[]): void {
    this.logos = [...items];
  }

  seedAwards(items: TrustAward[]): void {
    this.awards = [...items];
  }

  seedIntegrations(items: TrustIntegration[]): void {
    this.integrations = [...items];
  }

  seedComparisons(items: ComparisonConfig[]): void {
    this.comparisons = [...items];
  }

  // ── Data Providers (for future production data) ────────────

  registerTestimonialProvider(provider: TrustDataProvider<TrustTestimonial>): void {
    this.testimonialProviders.push(provider);
  }

  registerMetricProvider(provider: TrustDataProvider<TrustMetric>): void {
    this.metricProviders.push(provider);
  }

  // ── CTAs ───────────────────────────────────────────────────

  registerCTA(cta: TrustCTA): void {
    this.ctaDefinitions.set(cta.id, cta);
  }

  // ── Getters ────────────────────────────────────────────────

  getTestimonials(options?: {
    featured?: boolean;
    limit?: number;
  }): TrustTestimonial[] {
    let items = [...this.testimonials];

    if (options?.featured !== undefined) {
      items = items.filter((t) => t.featured === options.featured);
    }

    if (options?.limit) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  getFeaturedTestimonials(limit?: number): TrustTestimonial[] {
    return this.getTestimonials({ featured: true, limit });
  }

  getMetrics(options?: {
    category?: TrustMetric["category"];
    limit?: number;
  }): TrustMetric[] {
    let items = [...this.metrics];

    if (options?.category) {
      items = items.filter((m) => m.category === options.category);
    }

    items.sort((a, b) => a.sortOrder - b.sortOrder);

    if (options?.limit) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  getCaseStudies(options?: { featured?: boolean; limit?: number }): TrustCaseStudy[] {
    let items = [...this.caseStudies];

    if (options?.featured !== undefined) {
      items = items.filter((cs) => cs.featured === options.featured);
    }

    if (options?.limit) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  getLogos(category?: TrustLogo["category"]): TrustLogo[] {
    if (category) {
      return this.logos.filter((l) => l.category === category);
    }
    return [...this.logos];
  }

  getAwards(): TrustAward[] {
    return [...this.awards];
  }

  getIntegrations(): TrustIntegration[] {
    return [...this.integrations];
  }

  getComparisons(): ComparisonConfig[] {
    return [...this.comparisons];
  }

  getComparison(id: string): ComparisonConfig | undefined {
    return this.comparisons.find((c) => c.id === id);
  }

  getCTA(id: string): TrustCTA | undefined {
    return this.ctaDefinitions.get(id);
  }

  isEnabled(field: keyof TrustRegistryConfig): boolean {
    return this.config[field];
  }
}
