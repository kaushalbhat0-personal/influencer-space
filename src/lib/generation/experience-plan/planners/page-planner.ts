import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, PagePlan } from "../types";

export class PagePlanner implements Planner {
  readonly id = "page";
  readonly produces = ["page"] as const;
  readonly dependsOn = [] as const;

  plan(_graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    const { persona } = profile;
    const pageTypes: string[] = ["home", "contact"];
    if (context.commerceReadiness !== "none") pageTypes.push("products");
    if (persona.socialProofEmphasis === "high" || persona.contentStyle === "inspirational" || persona.contentStyle === "storytelling" || persona.contentStyle === "behind_the_scenes") {
      pageTypes.push("gallery");
    }
    return {
      page: {
        pageTypes,
        homePageSections: persona.defaultModules,
      } satisfies PagePlan,
    };
  }
}
