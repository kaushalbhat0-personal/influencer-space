import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, SocialProofPlan } from "../types";

export class SocialProofPlanner implements Planner {
  readonly id = "social_proof";
  readonly produces = ["socialProof"] as const;
  readonly dependsOn = [] as const;

  plan(_graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    const { persona, creatorStage } = profile;
    return {
      socialProof: {
        testimonialsEnabled: persona.socialProofEmphasis === "high",
        testimonialCount: context.authorityLevel === "high" ? 6 : context.authorityLevel === "medium" ? 4 : 2,
        testimonialStyle: "carousel",
        showRatings: persona.socialProofEmphasis === "high" && context.commerceReadiness !== "none",
        showReviewCount: persona.socialProofEmphasis === "high" && (creatorStage === "established" || creatorStage === "professional" || creatorStage === "celebrity"),
        socialLinksStyle: persona.socialProofEmphasis === "high" ? "buttons" : "icons",
      } satisfies SocialProofPlan,
    };
  }
}
