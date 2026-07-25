import type { ContextStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export class ConversionStrategy implements ContextStrategy {
  readonly id = "conversion";
  readonly produces = ["conversionIntent", "monetizationFocus"] as const;

  compute(_graph: KnowledgeGraph, profile: ExperienceProfile): Partial<PlanningContext> {
    const { businessModel, commerceStage } = profile;
    return {
      conversionIntent: businessModel === "direct_sales" || businessModel === "marketplace" ? "high"
        : businessModel === "education" || businessModel === "service_based" ? "medium"
        : businessModel === "community" || businessModel === "hybrid" ? "low"
        : "none",
      monetizationFocus: commerceStage === "scaling" || commerceStage === "established" ? "high"
        : commerceStage === "growing" || commerceStage === "just_started" ? "medium"
        : commerceStage === "exploring" ? "low"
        : "none",
    };
  }
}
