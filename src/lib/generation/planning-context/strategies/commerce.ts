import type { ContextStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export class CommerceStrategy implements ContextStrategy {
  readonly id = "commerce";
  readonly produces = ["commerceReadiness", "productConfidence"] as const;

  compute(_graph: KnowledgeGraph, profile: ExperienceProfile): Partial<PlanningContext> {
    const { commerceStage } = profile;
    const productCount = _graph.products.length;
    return {
      commerceReadiness: commerceStage === "scaling" || commerceStage === "established" ? "high"
        : commerceStage === "growing" || commerceStage === "just_started" ? "medium"
        : commerceStage === "exploring" ? "low"
        : "none",
      productConfidence: productCount >= 10 ? "high"
        : productCount >= 3 ? "medium"
        : productCount >= 1 ? "low"
        : "none",
    };
  }
}
