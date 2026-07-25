import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, HeroPlan } from "../types";

export class HeroPlanner implements Planner {
  readonly id = "hero";
  readonly produces = ["hero"] as const;
  readonly dependsOn = [] as const;

  plan(_graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    const { persona } = profile;
    return {
      hero: {
        variant: context.commerceReadiness === "none" || context.commerceReadiness === "low" ? "minimal"
          : context.authorityLevel === "high" ? "fullscreen"
          : persona.pricingEmphasis === "high" ? "prominent"
          : "standard",
        headlineAlignment: persona.pricingEmphasis === "high" ? "left" : "center",
        showProfile: true,
        showPricing: persona.pricingEmphasis === "high",
        showSocialProof: persona.socialProofEmphasis === "high",
        overlay: context.authorityLevel === "high",
        ctaStyle: persona.pricingEmphasis === "high" ? "solid" : "outline",
        badge: context.brandingConsistency === "medium" || context.brandingConsistency === "high",
      } satisfies HeroPlan,
    };
  }
}
