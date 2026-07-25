import type { ContextStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export class SEOContextStrategy implements ContextStrategy {
  readonly id = "seo_context";
  readonly produces = ["seoMaturity"] as const;

  compute(_graph: KnowledgeGraph, profile: ExperienceProfile): Partial<PlanningContext> {
    const { commerceStage, brandStrength } = profile;
    return {
      seoMaturity: commerceStage === "scaling" || (commerceStage !== "none" && brandStrength === "dominant") ? "high"
        : commerceStage !== "none" ? "medium"
        : "low",
    };
  }
}
