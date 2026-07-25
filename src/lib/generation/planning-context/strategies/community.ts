import type { ContextStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export class CommunityStrategy implements ContextStrategy {
  readonly id = "community";
  readonly produces = ["communityStrength"] as const;

  compute(_graph: KnowledgeGraph, _profile: ExperienceProfile): Partial<PlanningContext> {
    const linkCount = _graph.socialLinks.length;
    const hasCommunityInterest = _graph.audience.interests.some(
      (i) => i.toLowerCase().includes("community") || i.toLowerCase().includes("networking")
    );
    return {
      communityStrength: linkCount >= 4 && hasCommunityInterest ? "high"
        : linkCount >= 2 ? "medium"
        : linkCount >= 1 ? "low"
        : "none",
    };
  }
}
