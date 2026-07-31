import type { BusinessProfile } from "@/lib/acquisition/business-types";
import type { BusinessRecommendation, RecommendationProvider } from "../domain/types";
import { generateRecommendations } from "../application/recommendation-engine";

/**
 * Rule-based recommendation provider.
 * Uses deterministic business rules and curated registries.
 * No AI, no LLMs, no external APIs.
 */
export class RuleBasedRecommendationProvider implements RecommendationProvider {
  id = "rule-based";
  name = "Rule-Based Engine";

  generate(business: BusinessProfile): BusinessRecommendation {
    return generateRecommendations(business);
  }
}

export const recommendationProvider = new RuleBasedRecommendationProvider();
