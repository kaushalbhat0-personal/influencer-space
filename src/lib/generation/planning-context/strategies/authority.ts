import type { ContextStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export class AuthorityStrategy implements ContextStrategy {
  readonly id = "authority";
  readonly produces = ["authorityLevel"] as const;

  compute(_graph: KnowledgeGraph, profile: ExperienceProfile): Partial<PlanningContext> {
    return {
      authorityLevel: profile.creatorStage === "celebrity" ? "high"
        : profile.creatorStage === "professional" ? "medium"
        : "low",
    };
  }
}
