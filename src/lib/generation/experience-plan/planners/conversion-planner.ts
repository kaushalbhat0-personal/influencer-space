import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, ConversionGoal } from "../types";

export class ConversionPlanner implements Planner {
  readonly id = "conversion";
  readonly produces = ["conversionGoal", "recommendationSlots"] as const;
  readonly dependsOn = [] as const;

  plan(_graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    const { businessModel, persona, commerceStage } = profile;
    const primary = this.resolvePrimary(businessModel);
    const secondary = this.resolveSecondary(primary);
    const baseSlots = commerceStage === "scaling" ? 6 : commerceStage === "established" ? 4 : commerceStage === "none" ? 0 : 2;
    return {
      conversionGoal: { primary, secondary } satisfies ConversionGoal,
      recommendationSlots: persona.socialProofEmphasis === "high" ? baseSlots + 2 : baseSlots,
    };
  }

  private resolvePrimary(bm: ExperienceProfile["businessModel"]): ConversionGoal["primary"] {
    if (bm === "direct_sales" || bm === "marketplace") return "sales";
    if (bm === "community") return "community";
    if (bm === "education") return "education";
    if (bm === "service_based") return "engagement";
    return "awareness";
  }

  private resolveSecondary(p: ConversionGoal["primary"]): ConversionGoal["secondary"] {
    if (p === "sales") return "engagement";
    if (p === "education") return "community";
    if (p === "community") return "engagement";
    if (p === "engagement") return "sales";
    return "engagement";
  }
}
