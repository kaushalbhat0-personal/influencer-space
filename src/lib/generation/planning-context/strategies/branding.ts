import type { ContextStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "../types";

export class BrandingStrategy implements ContextStrategy {
  readonly id = "branding";
  readonly produces = ["brandingConsistency", "marketingMaturity"] as const;

  compute(_graph: KnowledgeGraph, profile: ExperienceProfile): Partial<PlanningContext> {
    const { brandStrength, commerceStage } = profile;
    return {
      brandingConsistency: brandStrength === "dominant" ? "high"
        : brandStrength === "strong" ? "medium"
        : brandStrength === "none" ? "none"
        : "low",
      marketingMaturity: commerceStage === "scaling" ? "high"
        : commerceStage === "established" && brandStrength !== "none" ? "high"
        : commerceStage === "growing" || (commerceStage === "just_started" && brandStrength !== "none") ? "medium"
        : "low",
    };
  }
}
