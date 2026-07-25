import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, SectionOrderPlan } from "../types";

export class LayoutPlanner implements Planner {
  readonly id = "layout";
  readonly produces = ["sectionOrder"] as const;
  readonly dependsOn = [] as const;

  plan(_graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    const { persona } = profile;
    const hidden: string[] = [];
    if (context.commerceReadiness === "none") hidden.push("featured_products", "product_grid");
    if (persona.socialProofEmphasis !== "high") hidden.push("testimonials");
    return {
      sectionOrder: {
        order: persona.defaultModules,
        pinned: ["hero"],
        hidden,
      } satisfies SectionOrderPlan,
    };
  }
}
