import type { ContextStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export class GrowthStrategy implements ContextStrategy {
  readonly id = "growth";
  readonly produces = ["growthPotential", "expansionPotential"] as const;

  compute(_graph: KnowledgeGraph, profile: ExperienceProfile): Partial<PlanningContext> {
    const followers = _graph.creator.followers;
    const engagement = _graph.creator.engagement;
    const { commerceStage } = profile;
    return {
      growthPotential: followers > 100000 && engagement > 0.05 ? "high"
        : followers > 10000 ? "medium"
        : "low",
      expansionPotential: commerceStage === "scaling" ? "high"
        : commerceStage === "growing" || commerceStage === "established" ? "medium"
        : commerceStage === "just_started" || commerceStage === "exploring" ? "low"
        : "none",
    };
  }
}
