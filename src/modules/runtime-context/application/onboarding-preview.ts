// ── Onboarding Intelligence Preview (Phase 2) ───────────────
// Before generation, onboarding surfaces the Knowledge Score, a recommended
// weighted goal profile and the top recommendations — computed from the
// imported profile WITHOUT a tenant (pure, deterministic). The creator can
// accept / edit / skip; accepted goals + declared facts are seeded after
// provisioning. No new runtimes, no new AI, no new onboarding forms.

import { computeKnowledgeScore, computeStorefrontScore, generateCompletionQuestions } from "@/modules/knowledge-runtime";
import type { CompletionQuestion, KnowledgeScore, KnowledgeSnapshot } from "@/modules/knowledge-runtime";
import { recommendGoals, recommendedProfile, countsFromSnapshot } from "@/modules/goals-runtime";
import type { GoalProfile, GoalRecommendation } from "@/modules/goals-runtime";
import { computeRecommendations } from "@/modules/recommendation-runtime";
import type { Recommendation, RecommendationContext } from "@/modules/recommendation-runtime";
import { resolvePack } from "@/modules/knowledge-runtime";

export interface OnboardingPreviewInput {
  name: string;
  bio: string;
  /** Onboarding category value (e.g. "fitness"). */
  category: string;
  platform: string;
  socialLinks: Array<{ platform: string; url: string }>;
}

export interface OnboardingPreview {
  knowledgeScore: KnowledgeScore;
  goalRecommendations: GoalRecommendation[];
  goalProfile: GoalProfile;
  topRecommendations: Recommendation[];
  /** Adaptive questions — reused from the Knowledge Runtime question engine. */
  questions: CompletionQuestion[];
}

/** Build a synthetic KnowledgeSnapshot from the imported profile. */
export function makePreviewSnapshot(input: OnboardingPreviewInput): KnowledgeSnapshot {
  return {
    identity: {
      name: input.name ?? "",
      tagline: "",
      bio: input.bio ?? "",
      avatarUrl: null,
      bannerUrl: null,
    },
    brand: { logoUrl: null, customTheme: false },
    commerce: {
      productCount: 0, productsWithDescription: 0, productsWithImage: 0,
      offersPriced: 0, offerCount: 0, serviceCount: 0, courseCount: 0, bookingCount: 0,
    },
    content: { galleryCount: 0, galleryWithTitle: 0, galleryWithAltText: 0, faqCount: 0, feedCount: 0 },
    trust: { testimonialCount: 0, timelineCount: 0, gameCount: 0 },
    media: { heroMediaPresent: false, heroTitlePresent: false },
    seo: { title: "", description: "" },
    contact: { email: "", phone: "", location: "", languages: [], businessHours: [] },
    social: {
      socialLinkCount: input.socialLinks?.length ?? 0,
      primaryPlatform: input.platform ?? "",
      feedConnected: false,
      affiliateLinkCount: 0,
    },
    business: { customDomain: null, subdomain: "" },
    declared: {},
    entityType: resolvePack(input.category ?? "").id,
  };
}

function syntheticContext(snapshot: KnowledgeSnapshot): RecommendationContext {
  const knowledgeScore = computeKnowledgeScore(snapshot);
  const recommended = recommendedProfile(snapshot);
  return {
    snapshot,
    activeProfile: {
      weights: recommended.weights,
      updatedAt: "",
      source: "recommended",
      entityType: recommended.entityType,
    },
    success: null,
    storefront: computeStorefrontScore(snapshot, knowledgeScore.overall),
    knowledgeScore,
    metrics: {
      productCount: 0, orderCount: 0, bookingCount: 0, galleryCount: 0, testimonialCount: 0,
      courseCount: 0, serviceCount: 0, faqCount: 0, timelineCount: 0, affiliateLinkCount: 0,
      contentFeedCount: 0, publishState: null, published: false, analyticsActive: false,
    },
    counts: countsFromSnapshot(snapshot),
  };
}

export function computeOnboardingPreview(input: OnboardingPreviewInput): OnboardingPreview {
  const snapshot = makePreviewSnapshot(input);
  const knowledgeScore = computeKnowledgeScore(snapshot);
  const goalRecommendations = recommendGoals(snapshot);
  const recommended = recommendedProfile(snapshot);
  const goalProfile: GoalProfile = {
    weights: recommended.weights,
    updatedAt: "",
    source: "recommended",
    entityType: recommended.entityType,
  };
  const topRecommendations = computeRecommendations(syntheticContext(snapshot), {}).slice(0, 3);
  const questions = generateCompletionQuestions(snapshot, knowledgeScore.missingFields);

  return { knowledgeScore, goalRecommendations, goalProfile, topRecommendations, questions };
}
