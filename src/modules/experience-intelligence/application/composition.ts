// ── Section Composition (Phases 2/3) ────────────────────────
// Goal-aware homepage ordering + adaptive section visibility. Both are pure
// and lightweight — the storefront applies them from data it already holds
// (aggregate content + goal profile), never a WebsiteAggregate rebuild.
// "No empty sections": conditional sections with empty content are hidden.

import type { KnowledgeSnapshot } from "@/modules/knowledge-runtime";
import type { WebsiteAggregate } from "@/types/snapshot";
import type { GoalProfile } from "@/modules/goals-runtime";
import { primaryGoal } from "@/modules/goals-runtime/application/weights";
import { SECTION_INTELLIGENCE_REGISTRY, getSectionIntelligence } from "../domain/section-registry";
import type { SectionBase, SectionContent } from "../domain/types";

export function contentFromSnapshot(snapshot: KnowledgeSnapshot): SectionContent {
  return {
    products: snapshot.commerce.productCount,
    services: snapshot.commerce.serviceCount,
    courses: snapshot.commerce.courseCount,
    bookings: snapshot.commerce.bookingCount,
    gallery: snapshot.content.galleryCount,
    faq: snapshot.content.faqCount,
    timeline: snapshot.trust.timelineCount,
    games: snapshot.trust.gameCount,
    contentFeed: snapshot.content.feedCount,
    links: snapshot.social.affiliateLinkCount,
    testimonials: snapshot.trust.testimonialCount,
    offers: snapshot.commerce.offerCount,
  };
}

export function contentFromAggregate(aggregate: WebsiteAggregate): SectionContent {
  return {
    products: aggregate.products?.length ?? 0,
    services: aggregate.services?.length ?? 0,
    courses: aggregate.courses?.length ?? 0,
    bookings: 0,
    gallery: aggregate.gallery?.length ?? 0,
    faq: aggregate.faq?.length ?? 0,
    timeline: aggregate.timeline?.length ?? 0,
    games: aggregate.games?.length ?? 0,
    contentFeed: aggregate.contentFeed?.length ?? 0,
    links: aggregate.links?.length ?? 0,
    testimonials: aggregate.testimonials?.length ?? 0,
    offers: (aggregate.products?.length ?? 0) + (aggregate.services?.length ?? 0) + (aggregate.courses?.length ?? 0),
  };
}

/**
 * Adaptive visibility — returns the bases to HIDE. Conditional sections whose
 * content is empty are hidden. When `goalProfilePresent` is false the result
 * is empty (existing storefronts are unchanged without a goal profile).
 */
export function resolveAdaptiveVisibility(
  content: SectionContent,
  goalProfilePresent: boolean,
): SectionBase[] {
  if (!goalProfilePresent) return [];
  return SECTION_INTELLIGENCE_REGISTRY
    .filter((section) => section.collapseRule === "conditional" && !section.contentCheck(content))
    .map((section) => section.base);
}

/**
 * Goal-aware homepage order (declarative). Hero first, footer last; the rest
 * ordered by base priority adjusted for the primary goal's preferred sections.
 * The storefront applies the actual order via the Goals Runtime's
 * `applyGoalSectionOrder`; this is the registry-driven model for preview/UI.
 */
export function resolveHomepageOrder(
  goalProfile: GoalProfile | null,
  presentBases: SectionBase[],
): SectionBase[] {
  const primary = primaryGoal(goalProfile)?.goalId ?? null;
  const priority = new Map(SECTION_INTELLIGENCE_REGISTRY.map((s) => [s.base, s.priority]));

  const score = (base: SectionBase): number => {
    let s = priority.get(base) ?? 100;
    if (primary) {
      const def = getSectionIntelligence(base);
      if (def?.preferredGoals.includes(primary)) s -= 60; // big boost toward the top
    }
    return s;
  };

  const hero = presentBases.filter((b) => b === "hero");
  const footer = presentBases.filter((b) => b === "footer");
  const middle = presentBases
    .filter((b) => b !== "hero" && b !== "footer")
    .sort((a, b) => score(a) - score(b));
  return [...hero, ...middle, ...footer];
}
