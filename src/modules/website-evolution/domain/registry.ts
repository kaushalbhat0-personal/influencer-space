// ── Evolution Registry (Phase 1) ────────────────────────────
// Every website improvement declares its reason, expected health/conversion
// lifts, effort, applicable goals, required knowledge/commerce/trust and the
// concrete change manifest. Detection triggers on GROWTH (count thresholds),
// which keeps this distinct from the Recommendation Runtime (single missing
// next-actions).

import type { RuntimeContext } from "@/modules/runtime-context";
import type { EvolutionDefinition, GoalId } from "./types";

const goalActive = (ctx: RuntimeContext, goalId: GoalId): boolean =>
  ctx.goals.activeProfile?.weights.some((w) => w.goalId === goalId && w.weight > 0) ?? false;

const cap = (value: number): number => Math.min(100, Math.max(0, value));

export const EVOLUTION_REGISTRY: EvolutionDefinition[] = [
  {
    id: "PRODUCT_COLLECTIONS",
    title: "Group products into collections",
    reason: "With more than 10 products, collections help buyers find what they want.",
    expectedLift: { health: 3, conversion: 5, knowledge: 2, trust: 1, goalAlignment: 4 },
    estimatedEffort: 15,
    applicableGoals: ["SELL_PRODUCTS", "MONETIZE_CONTENT"],
    requiredKnowledge: ["commerce.products", "commerce.productImages"],
    requiredCommerce: ["products"],
    requiredTrust: [],
    change: {
      summary: "Group your products into collections (grid → collections).",
      config: { base: "products", key: "layout", value: "collections" },
      href: "/admin/products",
    },
    when: (ctx) => ctx.snapshot.commerce.productCount > 10,
  },
  {
    id: "GALLERY_MASONRY",
    title: "Switch gallery to a masonry layout",
    reason: "A larger gallery benefits from a masonry layout that showcases images elegantly.",
    expectedLift: { health: 2, conversion: 4, knowledge: 1, trust: 2, goalAlignment: 2 },
    estimatedEffort: 5,
    applicableGoals: ["SHOW_PORTFOLIO", "FIND_CLIENTS"],
    requiredKnowledge: ["content.gallery"],
    requiredCommerce: [],
    requiredTrust: [],
    change: {
      summary: "Switch the gallery to a masonry layout.",
      config: { base: "gallery", key: "layout", value: "masonry" },
      href: "/builder",
    },
    when: (ctx) => ctx.snapshot.content.galleryCount > 30,
  },
  {
    id: "FEATURED_REVIEWS",
    title: "Highlight featured reviews",
    reason: "With 20+ testimonials, featuring your best reviews builds more trust.",
    expectedLift: { health: 2, conversion: 4, knowledge: 1, trust: 6, goalAlignment: 3 },
    estimatedEffort: 5,
    applicableGoals: ["INCREASE_TRUST", "GET_BOOKINGS", "SELL_PRODUCTS"],
    requiredKnowledge: ["trust.testimonials"],
    requiredCommerce: [],
    requiredTrust: ["testimonials"],
    change: {
      summary: "Highlight featured reviews at the top of the testimonials section.",
      config: { base: "testimonials", key: "featured", value: true },
      href: "/admin/testimonials",
    },
    when: (ctx) => ctx.snapshot.trust.testimonialCount > 20,
  },
  {
    id: "BOOKING_SECTION_UP",
    title: "Move the booking section higher",
    reason: "Growing demand for bookings — move the booking action up the homepage.",
    expectedLift: { health: 3, conversion: 5, knowledge: 1, trust: 1, goalAlignment: 8 },
    estimatedEffort: 2,
    applicableGoals: ["GET_BOOKINGS"],
    requiredKnowledge: ["commerce.bookings", "commerce.pricing"],
    requiredCommerce: ["bookings"],
    requiredTrust: [],
    change: {
      summary: "Move the booking/contact section higher on the homepage.",
      sectionOrder: ["hero", "pricing", "contact", "testimonials", "faq"],
      href: "/builder",
    },
    when: (ctx) => ctx.snapshot.commerce.bookingCount > 3 && goalActive(ctx, "GET_BOOKINGS"),
  },
  {
    id: "FAQ_ACCORDION",
    title: "Convert FAQ to an accordion",
    reason: "A large FAQ reads better as an accordion.",
    expectedLift: { health: 2, conversion: 2, knowledge: 2, trust: 2, goalAlignment: 2 },
    estimatedEffort: 2,
    applicableGoals: ["GET_BOOKINGS", "SELL_COURSES", "SELL_PRODUCTS"],
    requiredKnowledge: ["content.faq"],
    requiredCommerce: [],
    requiredTrust: [],
    change: {
      summary: "Convert the FAQ to an accordion layout.",
      config: { base: "faq", key: "layout", value: "accordion" },
      href: "/builder",
    },
    when: (ctx) => ctx.snapshot.content.faqCount > 10,
  },
  {
    id: "FEATURED_PRODUCTS",
    title: "Feature your best products",
    reason: "With 5+ products, featuring the best ones drives more sales.",
    expectedLift: { health: 2, conversion: 4, knowledge: 1, trust: 1, goalAlignment: 4 },
    estimatedEffort: 5,
    applicableGoals: ["SELL_PRODUCTS", "MONETIZE_CONTENT"],
    requiredKnowledge: ["commerce.products", "commerce.productImages"],
    requiredCommerce: ["products"],
    requiredTrust: [],
    change: {
      summary: "Mark your best products as featured.",
      config: { base: "products", key: "featured", value: true },
      href: "/admin/products",
    },
    when: (ctx) => ctx.snapshot.commerce.productCount > 5 && goalActive(ctx, "SELL_PRODUCTS"),
  },
  {
    id: "PORTFOLIO_FIRST",
    title: "Show your portfolio first",
    reason: "A strong portfolio is your best sales tool — put it near the top.",
    expectedLift: { health: 2, conversion: 3, knowledge: 1, trust: 2, goalAlignment: 6 },
    estimatedEffort: 2,
    applicableGoals: ["SHOW_PORTFOLIO", "FIND_CLIENTS"],
    requiredKnowledge: ["content.gallery", "content.galleryQuality"],
    requiredCommerce: [],
    requiredTrust: [],
    change: {
      summary: "Move the gallery directly after the hero.",
      sectionOrder: ["hero", "gallery", "testimonials", "contact"],
      href: "/builder",
    },
    when: (ctx) => ctx.snapshot.content.galleryCount > 20 && goalActive(ctx, "SHOW_PORTFOLIO"),
  },
  {
    id: "COURSE_SECTION_UP",
    title: "Raise your courses",
    reason: "Growing course library — put courses higher to convert students.",
    expectedLift: { health: 2, conversion: 4, knowledge: 1, trust: 1, goalAlignment: 6 },
    estimatedEffort: 2,
    applicableGoals: ["SELL_COURSES"],
    requiredKnowledge: ["commerce.courses", "commerce.pricing"],
    requiredCommerce: ["courses"],
    requiredTrust: [],
    change: {
      summary: "Move the courses section up the homepage.",
      sectionOrder: ["hero", "courses", "testimonials", "faq"],
      href: "/builder",
    },
    when: (ctx) => ctx.snapshot.commerce.courseCount > 5 && goalActive(ctx, "SELL_COURSES"),
  },
  {
    id: "CONTACT_PROMINENT",
    title: "Make contact prominent",
    reason: "Lead-focused creators convert better when contact is impossible to miss.",
    expectedLift: { health: 2, conversion: 5, knowledge: 1, trust: 1, goalAlignment: 5 },
    estimatedEffort: 2,
    applicableGoals: ["GENERATE_LEADS", "FIND_CLIENTS"],
    requiredKnowledge: ["contact.email"],
    requiredCommerce: [],
    requiredTrust: [],
    change: {
      summary: "Raise the contact section and add a contact CTA to the hero.",
      sectionOrder: ["hero", "contact", "testimonials"],
      cta: { primary: "Get a Quote", secondary: "Contact" },
      href: "/admin/settings",
    },
    when: (ctx) => ctx.intelligence.published && (goalActive(ctx, "GENERATE_LEADS") || goalActive(ctx, "FIND_CLIENTS")),
  },
  {
    id: "TRUST_STRIP",
    title: "Show a trust strip",
    reason: "Your trust profile is strong — surface it with a trust indicators strip.",
    expectedLift: { health: 2, conversion: 3, knowledge: 1, trust: 4, goalAlignment: 2 },
    estimatedEffort: 1,
    applicableGoals: ["INCREASE_TRUST", "BUILD_BRAND"],
    requiredKnowledge: ["trust.testimonials", "trust.timeline"],
    requiredCommerce: [],
    requiredTrust: ["testimonials", "timeline"],
    change: {
      summary: "Add a trust indicators strip above the footer.",
      config: { base: "footer", key: "trustStrip", value: true },
      href: "/builder",
    },
    when: (ctx) => ctx.snapshot.trust.testimonialCount >= 5 && ctx.snapshot.trust.timelineCount >= 2,
  },
];

const REGISTRY_BY_ID = new Map(EVOLUTION_REGISTRY.map((e) => [e.id, e]));

export function getEvolution(id: string): EvolutionDefinition | undefined {
  return REGISTRY_BY_ID.get(id);
}

export function isKnownEvolution(id: string): boolean {
  return REGISTRY_BY_ID.has(id);
}

export { cap as capLift };
