import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, SEOPlan } from "../types";

export class SEOPlanner implements Planner {
  readonly id = "seo";
  readonly produces = ["seo"] as const;
  readonly dependsOn = [] as const;

  plan(_graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    const { commerceStage } = profile;
    return {
      seo: {
        priority: commerceStage === "scaling" || commerceStage === "established" ? "high"
          : context.brandingConsistency === "high" ? "high"
          : "medium",
        focusKeywords: commerceStage === "scaling" ? 5 : commerceStage === "established" ? 3 : 2,
        structuredData: commerceStage !== "none",
        openGraph: true,
      } satisfies SEOPlan,
    };
  }
}
