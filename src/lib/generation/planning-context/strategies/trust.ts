import type { ContextStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export class TrustStrategy implements ContextStrategy {
  readonly id = "trust";
  readonly produces = ["trustLevel"] as const;

  compute(_graph: KnowledgeGraph, profile: ExperienceProfile): Partial<PlanningContext> {
    const { brandStrength } = profile;
    return {
      trustLevel: brandStrength === "dominant" ? "high"
        : brandStrength === "strong" ? "medium"
        : brandStrength === "none" ? "none"
        : "low",
    };
  }
}
