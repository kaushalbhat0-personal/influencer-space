// ── Storefront Quality Score (Phase 9) ─────────────────────
// Every generated website receives a storefront quality score across seven
// dimensions. Computed deterministically from the knowledge snapshot — no AI.
// Displayed to the creator on the completion dashboard.

import type { KnowledgeSnapshot, StorefrontDimensionId, StorefrontScore } from "../domain/types";
import { computeKnowledgeScore } from "./score-engine";

/** Returns `weight` when the condition holds, else 0. Weights sum to 100. */
const pct = (complete: boolean, weight: number): number => (complete ? weight : 0);

export function computeStorefrontScore(
  snapshot: KnowledgeSnapshot,
  knowledgeOverall = computeKnowledgeScore(snapshot).overall,
): StorefrontScore {
  const commerceTotal = snapshot.commerce.productCount + snapshot.commerce.serviceCount + snapshot.commerce.courseCount;
  const galleryTotal = snapshot.content.galleryCount;

  const dimensions: StorefrontScore["dimensions"] = [
    {
      id: "knowledge",
      label: "Knowledge",
      score: knowledgeOverall,
    },
    {
      id: "content",
      label: "Content",
      score: Math.round(
        pct(snapshot.content.galleryCount >= 3, 40) +
          pct(snapshot.content.faqCount >= 3, 20) +
          pct(snapshot.content.feedCount >= 3, 20) +
          pct(snapshot.trust.timelineCount >= 2, 20),
      ),
    },
    {
      id: "commerce",
      label: "Commerce",
      score: Math.round(
        pct(snapshot.commerce.productCount >= 1, 40) +
          pct(commerceTotal === 0 || snapshot.commerce.offersPriced >= Math.min(3, commerceTotal), 20) +
          pct(snapshot.commerce.serviceCount >= 1, 15) +
          pct(snapshot.commerce.courseCount >= 1, 15) +
          pct(snapshot.commerce.bookingCount >= 1, 10),
      ),
    },
    {
      id: "brand",
      label: "Brand",
      score: Math.round(
        pct(snapshot.identity.name.trim().length >= 2, 20) +
          pct(snapshot.identity.tagline.trim().length >= 3, 20) +
          pct(snapshot.identity.bio.trim().length >= 30, 25) +
          pct(snapshot.brand.customTheme, 15) +
          pct(Boolean(snapshot.brand.logoUrl) || Boolean(snapshot.identity.avatarUrl), 20),
      ),
    },
    {
      id: "seo",
      label: "SEO",
      score: Math.round(
        pct(snapshot.seo.title.trim().length >= 10, 50) +
          pct(snapshot.seo.description.trim().length >= 30, 50),
      ),
    },
    {
      id: "trust",
      label: "Trust",
      score: Math.round(
        pct(snapshot.trust.testimonialCount >= 3, 50) +
          pct(snapshot.trust.timelineCount >= 2, 30) +
          pct(
            typeof snapshot.declared.trust_achievements === "string" &&
              snapshot.declared.trust_achievements.trim().length >= 10,
            20,
          ),
      ),
    },
    {
      id: "accessibility",
      label: "Accessibility",
      score: Math.round(
        pct(galleryTotal === 0 || snapshot.content.galleryWithAltText >= Math.min(3, galleryTotal), 40) +
          pct(snapshot.media.heroMediaPresent, 25) +
          pct(snapshot.media.heroTitlePresent, 20) +
          pct(Boolean(snapshot.identity.avatarUrl), 15),
      ),
    },
  ];

  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);
  return { dimensions, overall };
}

export const STOREFRONT_DIMENSION_ORDER: StorefrontDimensionId[] = [
  "knowledge",
  "content",
  "commerce",
  "brand",
  "seo",
  "trust",
  "accessibility",
];
