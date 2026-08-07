// ── Business Health Registry (Phase 1) ─────────────────────
// One canonical registry. Every dimension declares its weight, thresholds,
// improvement recommendations and — critically — its SCORE EXTRACTOR, which
// reads ONLY the shared Runtime Context (never rebuilding anything). The
// engine derives everything from this registry.

import type { RuntimeContext } from "@/modules/runtime-context";
import type { HealthDimensionDefinition, HealthDimensionId } from "./types";

export type { HealthEvalDeps } from "./types";

const categoryPercent = (ctx: RuntimeContext, id: string): number =>
  ctx.knowledge.score.categories.find((c) => c.id === id)?.percent ?? 0;

const cap = (value: number): number => Math.min(100, Math.max(0, value));

export const DEFAULT_DIMENSION_WEIGHTS: Record<HealthDimensionId, number> = {
  knowledge: 20,
  goal_alignment: 15,
  storefront_quality: 15,
  success_progress: 15,
  commerce_readiness: 10,
  brand: 5,
  trust: 5,
  seo: 5,
  platform_configuration: 5,
  recommendation_adoption: 3,
  performance: 2,
  future_ready: 0,
};

export const HEALTH_DIMENSION_REGISTRY: HealthDimensionDefinition[] = [
  {
    id: "knowledge",
    label: "Knowledge",
    description: "How complete and accurate your business profile is.",
    weight: 20,
    sourceRuntime: "Knowledge Runtime",
    healthyThreshold: 80,
    warningThreshold: 60,
    criticalThreshold: 40,
    improvementRecommendations: ["Complete missing knowledge fields", "Answer the smart questions"],
    scoreExtractor: (ctx) => ctx.knowledge.score.overall,
    dataAvailable: () => true,
  },
  {
    id: "goal_alignment",
    label: "Goal Alignment",
    description: "How well your storefront supports your chosen goals.",
    weight: 15,
    sourceRuntime: "Goals Runtime",
    healthyThreshold: 70,
    warningThreshold: 50,
    criticalThreshold: 30,
    improvementRecommendations: ["Complete goal-supporting knowledge", "Review your business goals"],
    scoreExtractor: (ctx) => ctx.goals.alignment.overall,
    dataAvailable: (ctx) => ctx.goals.alignment.items.length > 0,
  },
  {
    id: "storefront_quality",
    label: "Storefront Quality",
    description: "Overall quality of the generated website.",
    weight: 15,
    sourceRuntime: "Knowledge Runtime (Storefront Score)",
    healthyThreshold: 80,
    warningThreshold: 60,
    criticalThreshold: 40,
    improvementRecommendations: ["Improve the lowest storefront dimension", "Follow the recommended improvements"],
    scoreExtractor: (ctx) => ctx.storefrontScore.overall,
    dataAvailable: () => true,
  },
  {
    id: "success_progress",
    label: "Success Progress",
    description: "Milestones achieved toward a running business.",
    weight: 15,
    sourceRuntime: "Success Runtime",
    healthyThreshold: 80,
    warningThreshold: 50,
    criticalThreshold: 30,
    improvementRecommendations: ["Complete the next milestone", "Publish and start selling"],
    scoreExtractor: (ctx) => ctx.success?.completionPercent ?? 0,
    dataAvailable: (ctx) => !!ctx.success,
  },
  {
    id: "commerce_readiness",
    label: "Commerce Readiness",
    description: "How ready you are to sell across products, services, courses, bookings and affiliates.",
    weight: 10,
    sourceRuntime: "Commerce Runtime",
    healthyThreshold: 60,
    warningThreshold: 40,
    criticalThreshold: 20,
    improvementRecommendations: ["Add a product", "Enable bookings", "List a service or course"],
    scoreExtractor: (ctx) => {
      const c = ctx.goals.counts;
      return cap(
        (c.products > 0 ? 25 : 0) +
          (c.orders > 0 ? 20 : 0) +
          (c.services > 0 ? 15 : 0) +
          (c.courses > 0 ? 15 : 0) +
          (c.bookings > 0 ? 15 : 0) +
          (c.affiliateLinks > 0 ? 10 : 0),
      );
    },
    dataAvailable: () => true,
  },
  {
    id: "brand",
    label: "Brand",
    description: "Brand identity completeness — logo, colors, bio, voice.",
    weight: 5,
    sourceRuntime: "Knowledge Runtime",
    healthyThreshold: 75,
    warningThreshold: 55,
    criticalThreshold: 35,
    improvementRecommendations: ["Upload a logo", "Set brand colors", "Write your story"],
    scoreExtractor: (ctx) => categoryPercent(ctx, "brand"),
    dataAvailable: () => true,
  },
  {
    id: "trust",
    label: "Trust",
    description: "Social proof — testimonials, timeline, achievements.",
    weight: 5,
    sourceRuntime: "Knowledge Runtime",
    healthyThreshold: 75,
    warningThreshold: 55,
    criticalThreshold: 35,
    improvementRecommendations: ["Add testimonials", "Add milestones", "Add achievements"],
    scoreExtractor: (ctx) => categoryPercent(ctx, "trust"),
    dataAvailable: () => true,
  },
  {
    id: "seo",
    label: "SEO",
    description: "Search visibility readiness.",
    weight: 5,
    sourceRuntime: "Knowledge Runtime",
    healthyThreshold: 75,
    warningThreshold: 55,
    criticalThreshold: 35,
    improvementRecommendations: ["Set up SEO titles and descriptions", "Add keywords"],
    scoreExtractor: (ctx) => categoryPercent(ctx, "seo"),
    dataAvailable: () => true,
  },
  {
    id: "platform_configuration",
    label: "Configuration",
    description: "Publishing, domain, analytics and theming are set up.",
    weight: 5,
    sourceRuntime: "Platform / Commerce Runtime",
    healthyThreshold: 70,
    warningThreshold: 50,
    criticalThreshold: 30,
    improvementRecommendations: ["Publish your website", "Connect a custom domain", "Enable analytics"],
    scoreExtractor: (ctx) =>
      cap(
        (ctx.intelligence.published ? 40 : 0) +
          (ctx.snapshot.business.customDomain ? 25 : 0) +
          (ctx.intelligence.analyticsActive ? 15 : 0) +
          (ctx.snapshot.brand.customTheme ? 20 : 0),
      ),
    dataAvailable: () => true,
  },
  {
    id: "recommendation_adoption",
    label: "Recommendation Adoption",
    description: "How many recommended improvements you have completed.",
    weight: 3,
    sourceRuntime: "Recommendation Runtime",
    healthyThreshold: 70,
    warningThreshold: 50,
    criticalThreshold: 30,
    improvementRecommendations: ["Complete the recommended improvements", "Follow your best next step"],
    scoreExtractor: (_ctx, deps) => {
      const entries = Object.values(deps.recommendationHistory);
      if (entries.length === 0) return 50;
      const completed = entries.filter((e) => e.status === "completed").length;
      return Math.round((completed / entries.length) * 100);
    },
    dataAvailable: (_ctx, deps) => Object.keys(deps.recommendationHistory).length > 0,
  },
  {
    id: "performance",
    label: "Performance",
    description: "The site is live and instrumented.",
    weight: 2,
    sourceRuntime: "Runtime Context (metrics)",
    healthyThreshold: 80,
    warningThreshold: 60,
    criticalThreshold: 40,
    improvementRecommendations: ["Publish your website", "Enable analytics"],
    scoreExtractor: (ctx) =>
      cap(
        (ctx.intelligence.published ? 60 : 0) +
          (ctx.metrics.publishedVersion ? 20 : 0) +
          (ctx.intelligence.analyticsActive ? 20 : 0),
      ),
    dataAvailable: () => true,
  },
  {
    id: "future_ready",
    label: "Future Ready",
    description: "The creator is adopting the full intelligence stack.",
    weight: 0,
    sourceRuntime: "All runtimes",
    healthyThreshold: 70,
    warningThreshold: 50,
    criticalThreshold: 30,
    improvementRecommendations: ["Set business goals", "Complete declared facts", "Engage with recommendations"],
    scoreExtractor: (ctx, deps) =>
      cap(
        (ctx.goals.profile ? 30 : 0) +
          (Object.keys(ctx.snapshot.declared).length > 0 ? 30 : 0) +
          (Object.keys(deps.recommendationHistory).length > 0 ? 20 : 0) +
          (ctx.intelligence.analyticsActive ? 20 : 0),
      ),
    dataAvailable: () => true,
  },
];

const REGISTRY_BY_ID = new Map(HEALTH_DIMENSION_REGISTRY.map((d) => [d.id, d]));

export function getHealthDimension(id: HealthDimensionId): HealthDimensionDefinition | undefined {
  return REGISTRY_BY_ID.get(id);
}

export function defaultWeights(): Record<HealthDimensionId, number> {
  return { ...DEFAULT_DIMENSION_WEIGHTS };
}

/**
 * Builder section → Business Health dimensions it contributes to (Phase 14).
 * Used by the builder badge to show a section's contribution to the score.
 */
export const SECTION_HEALTH_CONTRIBUTION: Record<string, HealthDimensionId[]> = {
  hero: ["brand", "knowledge", "seo", "trust"],
  products: ["commerce_readiness", "knowledge", "storefront_quality"],
  services: ["commerce_readiness", "goal_alignment"],
  courses: ["commerce_readiness", "goal_alignment"],
  pricing: ["commerce_readiness", "goal_alignment"],
  gallery: ["storefront_quality", "trust"],
  testimonials: ["trust", "goal_alignment"],
  timeline: ["trust", "brand"],
  faq: ["seo", "trust"],
  newsletter: ["goal_alignment", "future_ready"],
  contentFeed: ["goal_alignment", "seo"],
  contact: ["platform_configuration", "trust"],
  links: ["commerce_readiness", "goal_alignment"],
  footer: ["brand"],
};
