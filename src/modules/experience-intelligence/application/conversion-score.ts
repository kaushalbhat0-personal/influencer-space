// ── Conversion Readiness Score (Phase 8) ────────────────────
// A derived, registry-driven score (0-100) that estimates how ready the
// storefront is to convert. Dimensions: CTA, Trust, Commerce, Content,
// Navigation, Speed, Contact, SEO. No AI. Feeds Business Health in a future
// version — it does NOT change current Business Health calculations.

import type { RuntimeContext } from "@/modules/runtime-context";
import type { ConversionDimensionId, ConversionScore } from "../domain/types";
import { computeTrustProfile } from "../domain/trust-runtime";

export const CONVERSION_DIMENSIONS: Array<{ id: ConversionDimensionId; label: string; weight: number }> = [
  { id: "cta", label: "CTA", weight: 20 },
  { id: "trust", label: "Trust", weight: 15 },
  { id: "commerce", label: "Commerce", weight: 20 },
  { id: "content", label: "Content", weight: 15 },
  { id: "navigation", label: "Navigation", weight: 10 },
  { id: "speed", label: "Speed", weight: 5 },
  { id: "contact", label: "Contact", weight: 5 },
  { id: "seo", label: "SEO", weight: 10 },
];

const cap = (v: number): number => Math.min(100, Math.max(0, v));

export function computeConversionScore(ctx: RuntimeContext, trustScore = computeTrustProfile(trustInputFrom(ctx)).score): ConversionScore {
  const s = ctx.snapshot;
  const c = ctx.goals.counts;
  const goalsSet = !!ctx.goals.profile;

  const seoPercent = ctx.knowledge.score.categories.find((x) => x.id === "seo")?.percent ?? 0;

  const dimensions: Array<{ id: ConversionDimensionId; score: number }> = [
    { id: "cta", score: cap((goalsSet ? 80 : 40) + (s.media.heroTitlePresent ? 20 : 0)) },
    { id: "trust", score: trustScore },
    { id: "commerce", score: cap(
      (c.products > 0 ? 25 : 0) +
        (c.orders > 0 ? 20 : 0) +
        (c.services > 0 ? 15 : 0) +
        (c.courses > 0 ? 15 : 0) +
        (c.bookings > 0 ? 15 : 0) +
        (c.affiliateLinks > 0 ? 10 : 0),
    ) },
    { id: "content", score: cap(
      (s.content.galleryCount >= 3 ? 30 : 0) +
        (s.content.faqCount >= 3 ? 25 : 0) +
        (s.content.feedCount >= 3 ? 25 : 0) +
        (s.trust.timelineCount >= 2 ? 20 : 0),
    ) },
    { id: "navigation", score: cap((ctx.intelligence.published ? 60 : 0) + (s.social.socialLinkCount > 0 ? 40 : 0)) },
    { id: "speed", score: cap(
      (ctx.intelligence.published ? 60 : 0) +
        (ctx.metrics.publishedVersion ? 20 : 0) +
        (ctx.intelligence.analyticsActive ? 20 : 0),
    ) },
    { id: "contact", score: cap(
      (s.contact.email ? 60 : 0) + (s.contact.phone ? 20 : 0) + (s.contact.location ? 20 : 0),
    ) },
    { id: "seo", score: seoPercent },
  ];

  const byId = new Map(dimensions.map((d) => [d.id, d.score]));
  const totalWeight = CONVERSION_DIMENSIONS.reduce((sum, d) => sum + d.weight, 0);
  const overall = Math.round(
    CONVERSION_DIMENSIONS.reduce((sum, d) => sum + (byId.get(d.id) ?? 0) * d.weight, 0) / totalWeight,
  );

  return {
    overall,
    dimensions: CONVERSION_DIMENSIONS.map((d) => ({ id: d.id, label: d.label, score: byId.get(d.id) ?? 0, weight: d.weight })),
  };
}

export function trustInputFrom(ctx: RuntimeContext) {
  const s = ctx.snapshot;
  return {
    testimonialCount: s.trust.testimonialCount,
    timelineCount: s.trust.timelineCount,
    socialLinkCount: s.social.socialLinkCount,
    achievementsPresent: Boolean(s.declared.trust_achievements),
    communityPresent: Boolean(s.declared.community_hub) || s.content.feedCount > 0,
    businessHealth: ctx.health?.overallScore ?? 0,
    recommendationCompletion: 50,
    verifiedBadge: false,
  };
}
