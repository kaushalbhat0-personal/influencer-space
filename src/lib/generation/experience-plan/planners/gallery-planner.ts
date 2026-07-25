import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, GalleryPlan } from "../types";

export class GalleryPlanner implements Planner {
  readonly id = "gallery";
  readonly produces = ["gallery"] as const;
  readonly dependsOn = [] as const;

  plan(_graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    const { persona, contentStyle } = profile;
    return {
      gallery: {
        layout: contentStyle === "inspirational" || contentStyle === "storytelling" ? "masonry" : "grid",
        columns: context.brandingConsistency === "high" || context.authorityLevel === "high" ? 4 : 3,
        showTitles: true,
        lightboxEnabled: true,
        titleStyle: persona.socialProofEmphasis === "high" ? "persona_name" : "niche_label",
      } satisfies GalleryPlan,
    };
  }
}
