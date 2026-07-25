import type { ContextStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export class ContentStrategy implements ContextStrategy {
  readonly id = "content";
  readonly produces = ["contentAuthority", "visualComplexity"] as const;

  compute(_graph: KnowledgeGraph, profile: ExperienceProfile): Partial<PlanningContext> {
    const { contentStyle } = profile;
    const quality = _graph.content.contentQuality;
    return {
      contentAuthority: quality === "high" ? "medium" : "low",
      visualComplexity: contentStyle === "inspirational" || contentStyle === "storytelling" || contentStyle === "behind_the_scenes" ? "high"
        : contentStyle === "promotional" || contentStyle === "educational" ? "medium"
        : "low",
    };
  }
}
