import type { ContextStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export class RecommendationStrategy implements ContextStrategy {
  readonly id = "recommendation";
  readonly produces = ["recommendationReadiness"] as const;

  compute(_graph: KnowledgeGraph, profile: ExperienceProfile): Partial<PlanningContext> {
    const productCount = _graph.products.length;
    const { commerceStage } = profile;
    return {
      recommendationReadiness: productCount >= 5 && commerceStage !== "none" ? "high"
        : productCount >= 2 ? "medium"
        : productCount >= 1 ? "low"
        : "none",
    };
  }
}
