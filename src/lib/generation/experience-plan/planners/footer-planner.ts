import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, FooterPlan } from "../types";

export class FooterPlanner implements Planner {
  readonly id = "footer";
  readonly produces = ["footer"] as const;
  readonly dependsOn = [] as const;

  plan(graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    return {
      footer: {
        showSocialLinks: graph.socialLinks.length >= 2,
        showNewsletter: profile.creatorStage !== "starting",
        showBackToTop: true,
        linksLayout: context.authorityLevel === "high" ? "grid" : "horizontal",
        copyrightStyle: "full",
      } satisfies FooterPlan,
    };
  }
}
