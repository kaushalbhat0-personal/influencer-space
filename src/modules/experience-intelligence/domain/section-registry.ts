// ── Section Intelligence Registry (Phase 1) ─────────────────
// One canonical registry of every section's intelligence: priority,
// conversion/trust/commerce/seo weights, health contribution, prerequisites,
// preferred goals/industries, page placement, collapse rules and mobile
// priority. Everything in this EPIC derives from this registry.

import type { SectionBase, SectionIntelligenceDefinition } from "./types";

export const SECTION_INTELLIGENCE_REGISTRY: SectionIntelligenceDefinition[] = [
  {
    base: "hero", label: "Hero", priority: 0,
    conversionWeight: 0.9, trustWeight: 0.2, commerceWeight: 0.2, seoWeight: 0.4,
    healthContribution: ["brand", "knowledge", "seo", "trust"],
    prerequisites: [], preferredGoals: [], preferredIndustries: [],
    pagePlacement: "home", collapseRule: "always", mobilePriority: 1, collapseOnMobile: false,
    contentCheck: () => true,
  },
  {
    base: "products", label: "Products", priority: 20,
    conversionWeight: 1, trustWeight: 0.3, commerceWeight: 1, seoWeight: 0.5,
    healthContribution: ["commerce_readiness", "knowledge", "storefront_quality"],
    prerequisites: ["hero"], preferredGoals: ["SELL_PRODUCTS", "MONETIZE_CONTENT", "PROMOTE_EVENTS"],
    preferredIndustries: ["creator", "restaurant", "photography"],
    pagePlacement: "home", collapseRule: "conditional", mobilePriority: 3, collapseOnMobile: false,
    contentCheck: (c) => c.products > 0,
  },
  {
    base: "services", label: "Services", priority: 30,
    conversionWeight: 0.8, trustWeight: 0.3, commerceWeight: 0.9, seoWeight: 0.4,
    healthContribution: ["commerce_readiness", "goal_alignment"],
    prerequisites: ["hero"], preferredGoals: ["SELL_SERVICES", "FIND_CLIENTS", "GENERATE_LEADS"],
    preferredIndustries: ["designer", "business", "fitness"],
    pagePlacement: "home", collapseRule: "conditional", mobilePriority: 4, collapseOnMobile: false,
    contentCheck: (c) => c.services > 0,
  },
  {
    base: "courses", label: "Courses", priority: 30,
    conversionWeight: 0.8, trustWeight: 0.3, commerceWeight: 0.9, seoWeight: 0.4,
    healthContribution: ["commerce_readiness", "goal_alignment"],
    prerequisites: ["hero"], preferredGoals: ["SELL_COURSES"],
    preferredIndustries: ["educator"],
    pagePlacement: "home", collapseRule: "conditional", mobilePriority: 4, collapseOnMobile: false,
    contentCheck: (c) => c.courses > 0,
  },
  {
    base: "gallery", label: "Gallery", priority: 40,
    conversionWeight: 0.6, trustWeight: 0.6, commerceWeight: 0.2, seoWeight: 0.3,
    healthContribution: ["storefront_quality", "trust"],
    prerequisites: ["hero"], preferredGoals: ["SHOW_PORTFOLIO", "FIND_CLIENTS"],
    preferredIndustries: ["photography", "designer", "art", "film", "travel"],
    pagePlacement: "home", collapseRule: "conditional", mobilePriority: 5, collapseOnMobile: true,
    contentCheck: (c) => c.gallery > 0,
  },
  {
    base: "timeline", label: "Timeline", priority: 50,
    conversionWeight: 0.3, trustWeight: 0.8, commerceWeight: 0.1, seoWeight: 0.2,
    healthContribution: ["trust", "brand"],
    prerequisites: [], preferredGoals: ["INCREASE_TRUST", "SHOW_PORTFOLIO"],
    preferredIndustries: [],
    pagePlacement: "home", collapseRule: "conditional", mobilePriority: 8, collapseOnMobile: true,
    contentCheck: (c) => c.timeline > 0,
  },
  {
    base: "testimonials", label: "Testimonials", priority: 45,
    conversionWeight: 0.7, trustWeight: 1, commerceWeight: 0.2, seoWeight: 0.2,
    healthContribution: ["trust", "goal_alignment"],
    prerequisites: [], preferredGoals: ["INCREASE_TRUST", "GET_BOOKINGS", "SELL_PRODUCTS"],
    preferredIndustries: [],
    pagePlacement: "home", collapseRule: "conditional", mobilePriority: 6, collapseOnMobile: true,
    contentCheck: (c) => c.testimonials > 0,
  },
  {
    base: "faq", label: "FAQ", priority: 60,
    conversionWeight: 0.4, trustWeight: 0.4, commerceWeight: 0.1, seoWeight: 0.6,
    healthContribution: ["seo", "trust"],
    prerequisites: [], preferredGoals: ["GET_BOOKINGS", "SELL_COURSES"],
    preferredIndustries: [],
    pagePlacement: "home", collapseRule: "conditional", mobilePriority: 9, collapseOnMobile: true,
    contentCheck: (c) => c.faq > 0,
  },
  {
    base: "games", label: "Games", priority: 70,
    conversionWeight: 0.2, trustWeight: 0.2, commerceWeight: 0.1, seoWeight: 0.1,
    healthContribution: ["storefront_quality"],
    prerequisites: [], preferredGoals: [], preferredIndustries: ["gaming"],
    pagePlacement: "home_or_page", collapseRule: "conditional", mobilePriority: 10, collapseOnMobile: true,
    contentCheck: (c) => c.games > 0,
  },
  {
    base: "contentFeed", label: "Content Feed", priority: 55,
    conversionWeight: 0.3, trustWeight: 0.5, commerceWeight: 0.1, seoWeight: 0.5,
    healthContribution: ["goal_alignment", "seo"],
    prerequisites: [], preferredGoals: ["GROW_YOUTUBE", "BUILD_COMMUNITY"],
    preferredIndustries: ["creator"],
    pagePlacement: "home", collapseRule: "conditional", mobilePriority: 7, collapseOnMobile: true,
    contentCheck: (c) => c.contentFeed > 0,
  },
  {
    base: "links", label: "Links", priority: 75,
    conversionWeight: 0.2, trustWeight: 0.4, commerceWeight: 0.4, seoWeight: 0.2,
    healthContribution: ["commerce_readiness", "goal_alignment"],
    prerequisites: [], preferredGoals: ["MONETIZE_CONTENT", "BUILD_COMMUNITY"],
    preferredIndustries: ["creator"],
    pagePlacement: "home", collapseRule: "conditional", mobilePriority: 10, collapseOnMobile: true,
    contentCheck: (c) => c.links > 0,
  },
  {
    base: "pricing", label: "Pricing", priority: 25,
    conversionWeight: 0.8, trustWeight: 0.3, commerceWeight: 0.8, seoWeight: 0.3,
    healthContribution: ["commerce_readiness", "goal_alignment"],
    prerequisites: [], preferredGoals: ["GET_BOOKINGS", "SELL_SERVICES"],
    preferredIndustries: [],
    pagePlacement: "home", collapseRule: "conditional", mobilePriority: 3, collapseOnMobile: false,
    contentCheck: (c) => c.offers > 0,
  },
  {
    base: "newsletter", label: "Newsletter", priority: 65,
    conversionWeight: 0.5, trustWeight: 0.2, commerceWeight: 0.1, seoWeight: 0.1,
    healthContribution: ["goal_alignment", "future_ready"],
    prerequisites: [], preferredGoals: ["BUILD_EMAIL_LIST", "BUILD_COMMUNITY"],
    preferredIndustries: [],
    pagePlacement: "home", collapseRule: "always", mobilePriority: 11, collapseOnMobile: true,
    contentCheck: () => true,
  },
  {
    base: "contact", label: "Contact", priority: 80,
    conversionWeight: 0.7, trustWeight: 0.5, commerceWeight: 0.1, seoWeight: 0.2,
    healthContribution: ["platform_configuration", "trust"],
    prerequisites: [], preferredGoals: ["GENERATE_LEADS", "FIND_CLIENTS", "GET_BOOKINGS"],
    preferredIndustries: [],
    pagePlacement: "home", collapseRule: "always", mobilePriority: 12, collapseOnMobile: false,
    contentCheck: () => true,
  },
  {
    base: "footer", label: "Footer", priority: 100,
    conversionWeight: 0.1, trustWeight: 0.2, commerceWeight: 0, seoWeight: 0.3,
    healthContribution: ["brand"],
    prerequisites: [], preferredGoals: [], preferredIndustries: [],
    pagePlacement: "home", collapseRule: "always", mobilePriority: 13, collapseOnMobile: false,
    contentCheck: () => true,
  },
];

const REGISTRY_BY_BASE = new Map(SECTION_INTELLIGENCE_REGISTRY.map((s) => [s.base, s]));

export function getSectionIntelligence(base: string): SectionIntelligenceDefinition | undefined {
  return REGISTRY_BY_BASE.get(base as SectionBase);
}

export function isRegisteredSection(base: string): boolean {
  return REGISTRY_BY_BASE.has(base as SectionBase);
}
