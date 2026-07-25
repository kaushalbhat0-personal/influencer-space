import type { ContextStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export class AudienceStrategy implements ContextStrategy {
  readonly id = "audience";
  readonly produces = ["audienceEngagement", "socialPresence"] as const;

  compute(_graph: KnowledgeGraph, _profile: ExperienceProfile): Partial<PlanningContext> {
    const followers = _graph.creator.followers;
    const engagement = _graph.creator.engagement;
    const linkCount = _graph.socialLinks.length;
    return {
      audienceEngagement: engagement > 0.1 ? "high"
        : engagement > 0.05 ? "medium"
        : "low",
      socialPresence: followers > 100000 && linkCount >= 3 ? "high"
        : followers > 10000 && linkCount >= 1 ? "medium"
        : "low",
    };
  }
}
