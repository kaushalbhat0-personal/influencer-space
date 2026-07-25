import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, PricingPlan } from "../types";

export class CommercePlanner implements Planner {
  readonly id = "commerce";
  readonly produces = ["pricing"] as const;
  readonly dependsOn = [] as const;

  plan(_graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    const { persona, commerceStage } = profile;
    return {
      pricing: {
        visibility: commerceStage === "none" ? "hidden"
          : commerceStage === "exploring" ? "compact"
          : commerceStage === "scaling" ? "prominent"
          : "full",
        showComparison: context.commerceReadiness === "high",
        badgeStyle: persona.pricingEmphasis === "high" ? "premium"
          : context.commerceReadiness === "medium" ? "sale"
          : "none",
      } satisfies PricingPlan,
    };
  }
}
