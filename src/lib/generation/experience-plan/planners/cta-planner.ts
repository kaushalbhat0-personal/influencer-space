import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, CTAPlan } from "../types";

export class CTAPlanner implements Planner {
  readonly id = "cta";
  readonly produces = ["cta"] as const;
  readonly dependsOn = [] as const;

  plan(_graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    const { persona, businessModel } = profile;
    const icon = businessModel === "direct_sales" || businessModel === "marketplace" ? "cart" as const
      : businessModel === "education" ? "play" as const
      : "arrow" as const;
    return {
      cta: {
        primaryStyle: persona.pricingEmphasis === "high" ? "gradient" : "solid",
        primarySize: context.authorityLevel === "high" || context.authorityLevel === "medium" ? "lg" : "md",
        secondaryVisible: true,
        secondaryStyle: "outline",
        icon,
      } satisfies CTAPlan,
    };
  }
}
