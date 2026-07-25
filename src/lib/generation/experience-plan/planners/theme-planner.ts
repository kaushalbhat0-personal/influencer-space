import type { Planner } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan, ThemePlan } from "../types";

export class ThemePlanner implements Planner {
  readonly id = "theme";
  readonly produces = ["theme", "contentDensity", "visualRhythm", "animationProfile", "mobilePriority"] as const;
  readonly dependsOn = [] as const;

  plan(_graph: KnowledgeGraph, profile: ExperienceProfile, context: PlanningContext): Partial<ExperiencePlan> {
    const { contentStyle, creatorStage } = profile;
    return {
      theme: {
        density: context.authorityLevel === "high" ? "spacious" : "comfortable",
        cardStyle: context.brandingConsistency === "high" ? "elevated" : "flat",
        borderRadius: context.brandingConsistency === "high" ? "pill"
          : context.brandingConsistency === "none" ? "sharp"
          : "rounded",
        shadowDepth: context.brandingConsistency === "high" ? "deep"
          : context.brandingConsistency === "none" ? "flat"
          : "subtle",
      } satisfies ThemePlan,
      contentDensity: contentStyle === "educational" || contentStyle === "technical" ? "dense" : "normal",
      visualRhythm: context.authorityLevel === "high" ? "dynamic"
        : creatorStage === "starting" ? "calm"
        : "balanced",
      animationProfile: context.authorityLevel === "high" ? "expressive"
        : creatorStage === "starting" ? "minimal"
        : "moderate",
      mobilePriority: creatorStage === "starting" || creatorStage === "growing" ? "high" : "medium",
    };
  }
}
