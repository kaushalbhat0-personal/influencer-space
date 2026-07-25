import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, NavigationPlan } from "../types";

export class NavigationPlanner implements Planner {
  readonly id = "navigation";
  readonly produces = ["navigation"] as const;
  readonly dependsOn = [] as const;

  plan(_graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    return {
      navigation: {
        style: context.authorityLevel === "high" ? "centered"
          : profile.creatorStage === "starting" ? "minimal"
          : "standard",
        sticky: profile.creatorStage !== "starting",
        transparent: context.brandingConsistency === "high" || context.brandingConsistency === "medium",
        searchEnabled: context.authorityLevel === "medium" || context.authorityLevel === "high",
      } satisfies NavigationPlan,
    };
  }
}
