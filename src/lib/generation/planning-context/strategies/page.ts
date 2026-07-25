import type { ContextStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export class PageStrategy implements ContextStrategy {
  readonly id = "page";
  readonly produces = ["pageComplexity"] as const;

  compute(_graph: KnowledgeGraph, profile: ExperienceProfile): Partial<PlanningContext> {
    const { creatorStage, commerceStage } = profile;
    return {
      pageComplexity: creatorStage === "celebrity" || commerceStage === "scaling" ? "high"
        : creatorStage === "professional" || commerceStage === "established" ? "medium"
        : "low",
    };
  }
}
