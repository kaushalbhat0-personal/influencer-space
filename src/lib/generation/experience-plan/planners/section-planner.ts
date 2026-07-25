import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, TestimonialPlan } from "../types";

export class SectionPlanner implements Planner {
  readonly id = "section";
  readonly produces = ["testimonial"] as const;
  readonly dependsOn = [] as const;

  plan(_graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    const { persona } = profile;
    return {
      testimonial: {
        enabled: persona.socialProofEmphasis === "high",
        sectionPlacement: context.commerceReadiness === "none" ? "after_hero" : "before_products",
        maxItems: context.authorityLevel === "high" ? 6 : context.authorityLevel === "medium" ? 4 : 2,
        style: "carousel",
      } satisfies TestimonialPlan,
    };
  }
}
